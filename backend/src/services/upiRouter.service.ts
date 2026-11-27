import crypto from 'crypto';
import Merchant, { IMerchant, IUpiAccount, UpiRoutingMode } from '../models/merchant.model';
import { inferBankNameFromIfsc } from '../utils/bankAccountUtils';

export interface SelectedUpiTarget {
  accountId: string;
  upiId: string;
  upiName: string;
  bankName: string;
  routingMode: UpiRoutingMode;
}

const HANDLE_BANK_MAP: Record<string, string> = {
  okhdfcbank: 'HDFC Bank',
  hdfcbank: 'HDFC Bank',
  oksbi: 'State Bank of India',
  sbi: 'State Bank of India',
  okicici: 'ICICI Bank',
  icici: 'ICICI Bank',
  okaxis: 'Axis Bank',
  axisb: 'Axis Bank',
  axisbank: 'Axis Bank',
  ybl: 'PhonePe (Yes Bank)',
  axl: 'PhonePe (Axis)',
  ibl: 'PhonePe (ICICI)',
  paytm: 'Paytm UPI',
  pthdfc: 'Paytm HDFC',
  ptyes: 'Paytm Yes Bank',
  ptaxis: 'Paytm Axis',
  ptsbi: 'Paytm SBI',
  upi: 'BHIM UPI',
  kotak: 'Kotak Mahindra Bank',
  indus: 'IndusInd Bank',
  apl: 'Amazon Pay',
  yapl: 'Amazon Pay',
};

export function inferBankFromUpiHandle(upiId: string): string {
  const clean = (upiId || '').trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1 || atIndex === clean.length - 1) return 'UPI Bank Account';
  const handle = clean.slice(atIndex + 1);
  if (handle.endsWith('.ifsc.npci')) {
    return `${inferBankNameFromIfsc(handle.slice(0, 4))} (IFSC Direct)`;
  }
  return HANDLE_BANK_MAP[handle] || `${handle.toUpperCase()} UPI`;
}

export function isValidUpiVpa(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test((upiId || '').trim());
}

/**
 * Extracts upiId & payee name from a scanned/uploaded UPI QR string (upi://pay?pa=...&pn=...)
 * or returns raw text if it looks like a plain VPA.
 */
export function parseUpiQrString(rawText: string): {
  upiId: string;
  upiName: string;
  bankName: string;
} | null {
  const text = (rawText || '').trim();
  if (!text) return null;

  if (text.toLowerCase().startsWith('upi://pay')) {
    try {
      const qIdx = text.indexOf('?');
      const params = new URLSearchParams(qIdx >= 0 ? text.slice(qIdx + 1) : '');
      const pa = (params.get('pa') || '').trim();
      const pn = (params.get('pn') || '').trim();
      if (isValidUpiVpa(pa)) {
        return {
          upiId: pa,
          upiName: pn,
          bankName: inferBankFromUpiHandle(pa),
        };
      }
    } catch {
      return null;
    }
  }

  if (isValidUpiVpa(text)) {
    return {
      upiId: text,
      upiName: '',
      bankName: inferBankFromUpiHandle(text),
    };
  }

  return null;
}

export function getIstDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/**
 * Ensures merchant.upiAccounts is populated with at least the legacy primary merchant.upiId
 * and keeps merchant.upiId / merchant.upiName synchronized with the active Primary entry.
 */
export function syncMerchantUpiState(merchant: Partial<IMerchant>, now: Date = new Date()): IUpiAccount[] {
  const todayIst = getIstDateKey(now);
  let accounts: IUpiAccount[] = Array.isArray(merchant.upiAccounts)
    ? merchant.upiAccounts.map((a: any) => ({
        id: a.id || `upi_${crypto.randomBytes(4).toString('hex')}`,
        label: a.label || 'Primary Bank UPI',
        upiId: (a.upiId || '').trim(),
        upiName: (a.upiName || merchant.upiName || merchant.businessName || 'Merchant').trim(),
        bankName: a.bankName || inferBankFromUpiHandle(a.upiId || ''),
        isActive: a.isActive !== false,
        isPrimary: Boolean(a.isPrimary),
        dailyLimitInr: Math.max(0, Number(a.dailyLimitInr) || 0),
        todayVolumeInr: a.todayVolumeDate === todayIst ? Number(a.todayVolumeInr) || 0 : 0,
        todayVolumeDate: todayIst,
        totalVolumeInr: Number(a.totalVolumeInr) || 0,
        totalTransactions: Number(a.totalTransactions) || 0,
        createdAt: a.createdAt ? new Date(a.createdAt) : now,
      }))
    : [];

  if (accounts.length === 0 && merchant.upiId) {
    accounts = [
      {
        id: 'upi_primary',
        label: 'Primary Bank UPI',
        upiId: merchant.upiId.trim(),
        upiName: (merchant.upiName || merchant.businessName || 'Merchant').trim(),
        bankName: inferBankFromUpiHandle(merchant.upiId),
        isActive: true,
        isPrimary: true,
        dailyLimitInr: 0,
        todayVolumeInr: 0,
        todayVolumeDate: todayIst,
        totalVolumeInr: Number(merchant.totalVolume) || 0,
        totalTransactions: Number(merchant.totalTransactions) || 0,
        createdAt: now,
      },
    ];
  }

  // Ensure exactly one primary if accounts exist
  if (accounts.length > 0 && !accounts.some((a) => a.isPrimary)) {
    const firstActive = accounts.find((a) => a.isActive) || accounts[0];
    firstActive.isPrimary = true;
    firstActive.isActive = true;
  }

  const primary = accounts.find((a) => a.isPrimary) || accounts[0];
  if (primary) {
    merchant.upiId = primary.upiId;
    merchant.upiName = primary.upiName;
  }
  merchant.upiAccounts = accounts as any;
  return accounts;
}

/**
 * Selects the best destination UPI ID for a newly created order according to merchant routing mode
 * and daily volume caps. Pure selection math + optional non-blocking DB counter bump for ROUND_ROBIN.
 */
export function selectUpiForOrderPure(
  merchant: Partial<IMerchant>,
  now: Date = new Date()
): SelectedUpiTarget {
  const routingMode: UpiRoutingMode = merchant.upiRoutingMode || 'PRIMARY_ONLY';
  const accounts = syncMerchantUpiState(merchant, now);
  const activePool = accounts.filter((a) => a.isActive && isValidUpiVpa(a.upiId));
  const underLimitPool = activePool.filter(
    (a) => !a.dailyLimitInr || a.dailyLimitInr <= 0 || a.todayVolumeInr < a.dailyLimitInr
  );

  const pool = underLimitPool.length > 0 ? underLimitPool : activePool;
  if (pool.length === 0) {
    return {
      accountId: '',
      upiId: merchant.upiId || '',
      upiName: merchant.upiName || merchant.businessName || 'Merchant',
      bankName: inferBankFromUpiHandle(merchant.upiId || ''),
      routingMode,
    };
  }

  let chosen: IUpiAccount;
  if (routingMode === 'ROUND_ROBIN' && pool.length > 1) {
    const idx = Math.abs(Number(merchant.upiRotationIndex) || 0) % pool.length;
    chosen = pool[idx];
  } else if (routingMode === 'FAILOVER') {
    const primaryActive = pool.find((a) => a.isPrimary);
    chosen = primaryActive || pool[0];
  } else {
    chosen = pool.find((a) => a.isPrimary) || pool[0];
  }

  return {
    accountId: chosen.id,
    upiId: chosen.upiId,
    upiName: chosen.upiName || merchant.upiName || merchant.businessName || 'Merchant',
    bankName: chosen.bankName || inferBankFromUpiHandle(chosen.upiId),
    routingMode,
  };
}

export async function selectUpiAndAdvanceRotation(merchant: IMerchant): Promise<SelectedUpiTarget> {
  const chosen = selectUpiForOrderPure(merchant);
  if ((merchant.upiRoutingMode || 'PRIMARY_ONLY') === 'ROUND_ROBIN' && (merchant.upiAccounts?.length || 0) > 1) {
    await Merchant.updateOne({ _id: merchant._id }, { $inc: { upiRotationIndex: 1 } }).catch(() => {});
  }
  return chosen;
}

/**
 * Records a verified live UPI credit onto the matching merchant UPI account ledger.
 */
export async function recordUpiAccountCredit(
  merchantId: any,
  targetUpiId: string | undefined,
  amountRupees: number
): Promise<void> {
  if (!merchantId || !amountRupees || amountRupees <= 0) return;
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) return;

  const todayIst = getIstDateKey();
  const accounts = syncMerchantUpiState(merchant);
  const cleanTarget = (targetUpiId || merchant.upiId || '').trim().toLowerCase();
  const match =
    accounts.find((a) => a.upiId.toLowerCase() === cleanTarget) ||
    accounts.find((a) => a.isPrimary) ||
    accounts[0];

  if (!match) return;

  match.todayVolumeDate = todayIst;
  match.todayVolumeInr = Number((match.todayVolumeInr + amountRupees).toFixed(2));
  match.totalVolumeInr = Number(((match.totalVolumeInr || 0) + amountRupees).toFixed(2));
  match.totalTransactions = (match.totalTransactions || 0) + 1;
  merchant.upiAccounts = accounts as any;
  merchant.markModified('upiAccounts');
  await merchant.save().catch(() => {});
}

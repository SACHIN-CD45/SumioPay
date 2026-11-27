export interface ValidatedBankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  accountNumberLast4: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: 'CURRENT' | 'SAVINGS';
  upiBridgeVpa: string;
}

const IFSC_BANK_MAP: Record<string, string> = {
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  SBIN: 'State Bank of India',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  YESB: 'Yes Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  CNRB: 'Canara Bank',
  IDFB: 'IDFC First Bank',
  INDB: 'IndusInd Bank',
  PYTM: 'Paytm Payments Bank',
  AIRP: 'Airtel Payments Bank',
  FDRL: 'Federal Bank',
  KARB: 'Karnataka Bank',
  IOBA: 'Indian Overseas Bank',
  UBIN: 'Union Bank of India',
  BKID: 'Bank of India',
  MAHB: 'Bank of Maharashtra',
  SIBL: 'South Indian Bank',
  ESFB: 'Equitas Small Finance Bank',
  AUBL: 'AU Small Finance Bank',
  UJVN: 'Ujjivan Small Finance Bank',
  JAKA: 'Jammu & Kashmir Bank',
  PSIB: 'Punjab & Sind Bank',
  UCBA: 'UCO Bank',
  IDIB: 'Indian Bank',
  CBIN: 'Central Bank of India',
  RBLB: 'RBL Bank',
  SCBL: 'Standard Chartered Bank',
  HSBC: 'HSBC Bank',
  CITI: 'Citibank',
};

export function normalizeAccountNumber(raw: unknown): string {
  return String(raw ?? '').replace(/[\s-]+/g, '').trim();
}

export function normalizeIfscCode(raw: unknown): string {
  return String(raw ?? '').toUpperCase().replace(/\s+/g, '').trim();
}

export function isValidBankAccountNumber(raw: unknown): boolean {
  const clean = normalizeAccountNumber(raw);
  return /^\d{8,20}$/.test(clean);
}

/**
 * Validates standard 11-character Indian RBI IFSC code (`AAAA0BBBBBB`).
 */
export function isValidIfscCode(raw: unknown): boolean {
  const clean = normalizeIfscCode(raw);
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
}

export function inferBankNameFromIfsc(ifscRaw: unknown): string {
  const ifsc = normalizeIfscCode(ifscRaw);
  const prefix = ifsc.slice(0, 4);
  return IFSC_BANK_MAP[prefix] || (prefix ? `${prefix} Bank` : 'Indian Bank Account');
}

export function maskBankAccountNumber(accountNumber: unknown): string {
  const clean = normalizeAccountNumber(accountNumber);
  if (!clean) return '';
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(Math.min(8, clean.length - 4))}${clean.slice(-4)}`;
}

export function buildIfscUpiBridgeVpa(accountNumber: unknown, ifscCode: unknown): string {
  const cleanAcc = normalizeAccountNumber(accountNumber);
  const cleanIfsc = normalizeIfscCode(ifscCode);
  if (!isValidBankAccountNumber(cleanAcc) || !isValidIfscCode(cleanIfsc)) {
    return '';
  }
  return `${cleanAcc}@${cleanIfsc}.ifsc.npci`;
}

export function validateAndNormalizeBankAccount(input: {
  accountHolderName?: unknown;
  accountNumber?: unknown;
  confirmAccountNumber?: unknown;
  ifscCode?: unknown;
  bankName?: unknown;
  branchName?: unknown;
  accountType?: unknown;
}): { ok: true; data: ValidatedBankAccountInput } | { ok: false; message: string } {
  const holder = String(input.accountHolderName || '').trim().slice(0, 120);
  if (holder.length < 2) {
    return { ok: false, message: 'Account holder name is required.' };
  }

  const acc = normalizeAccountNumber(input.accountNumber);
  if (!isValidBankAccountNumber(acc)) {
    return { ok: false, message: 'Account number must contain 8 to 20 digits.' };
  }

  if (input.confirmAccountNumber !== undefined) {
    const confirmAcc = normalizeAccountNumber(input.confirmAccountNumber);
    if (confirmAcc !== acc) {
      return { ok: false, message: 'Account number and confirmation do not match.' };
    }
  }

  const ifsc = normalizeIfscCode(input.ifscCode);
  if (!isValidIfscCode(ifsc)) {
    return { ok: false, message: 'Invalid IFSC code (expected 11 chars like HDFC0001234).' };
  }

  const inferredBank = inferBankNameFromIfsc(ifsc);
  const bankName = String(input.bankName || '').trim().slice(0, 100) || inferredBank;
  const branchName = String(input.branchName || '').trim().slice(0, 120);
  const accountType = String(input.accountType || '').toUpperCase() === 'SAVINGS' ? 'SAVINGS' : 'CURRENT';

  return {
    ok: true,
    data: {
      accountHolderName: holder,
      accountNumber: acc,
      accountNumberLast4: acc.slice(-4),
      ifscCode: ifsc,
      bankName,
      branchName,
      accountType,
      upiBridgeVpa: buildIfscUpiBridgeVpa(acc, ifsc),
    },
  };
}

import { KycStatus } from '../models/organization.model';

export interface BillLineItem {
  label: string;
  quantity?: number;
  amount: number;
}

export interface NormalizedBillDetails {
  items: BillLineItem[];
  subtotal?: number;
  couponCode?: string;
  discountAmount?: number;
  taxLabel?: string;
  taxAmount?: number;
  platformFee?: number;
  note?: string;
  returnUrl?: string;
}

const DEFAULT_BRAND_COLOR = '#4F3DF5';

/**
 * Accepts only strict 6-digit hex colors (#RRGGBB) to prevent style injection.
 */
export function sanitizeBrandColor(value?: unknown): string {
  if (typeof value !== 'string') return DEFAULT_BRAND_COLOR;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_BRAND_COLOR;
}

/**
 * Accepts only http(s) URLs (or root-relative paths) to prevent javascript: URI injection.
 */
export function sanitizeSafeUrl(value?: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed.slice(0, 500);
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 500);
  return '';
}

function parseNonNegativeMoney(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100) / 100;
}

/**
 * Extracts and normalizes structured cart/bill/coupon fields from either top-level
 * order payload or metadata.billDetails so existing integrations stay 100% compatible.
 */
export function normalizeBillDetails(body: any = {}): NormalizedBillDetails | null {
  const rawMeta = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const rawBill =
    (body?.billDetails && typeof body.billDetails === 'object' && body.billDetails) ||
    (body?.billSummary && typeof body.billSummary === 'object' && body.billSummary) ||
    (rawMeta?.billDetails && typeof rawMeta.billDetails === 'object' && rawMeta.billDetails) ||
    (rawMeta?.billSummary && typeof rawMeta.billSummary === 'object' && rawMeta.billSummary) ||
    {};

  const rawItems = Array.isArray(rawBill.items)
    ? rawBill.items
    : Array.isArray(body?.items)
    ? body.items
    : [];

  const items: BillLineItem[] = rawItems
    .slice(0, 25)
    .map((item: any) => {
      const label = String(item?.label || item?.name || '').trim().slice(0, 120);
      const amount = parseNonNegativeMoney(item?.amount ?? item?.price ?? item?.total);
      if (!label || amount === undefined) return null;
      const qtyRaw = Number(item?.quantity ?? item?.qty ?? 1);
      const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
      return { label, quantity, amount };
    })
    .filter((x: BillLineItem | null): x is BillLineItem => x !== null);

  let subtotal = parseNonNegativeMoney(
    rawBill.subtotal ?? body?.subtotal ?? rawMeta?.subtotal
  );
  if (subtotal === undefined && items.length > 0) {
    const sumPaise = items.reduce(
      (acc, item) => acc + Math.round(item.amount * 100) * (item.quantity || 1),
      0
    );
    subtotal = sumPaise / 100;
  }

  const couponCode = String(
    rawBill.couponCode ?? body?.couponCode ?? rawMeta?.couponCode ?? ''
  )
    .trim()
    .toUpperCase()
    .slice(0, 40);

  const discountAmount = parseNonNegativeMoney(
    rawBill.discountAmount ??
      rawBill.discount ??
      body?.discountAmount ??
      rawMeta?.discountAmount
  );

  const taxAmount = parseNonNegativeMoney(
    rawBill.taxAmount ?? rawBill.tax ?? body?.taxAmount ?? rawMeta?.taxAmount
  );

  const platformFee = parseNonNegativeMoney(
    rawBill.platformFee ?? body?.platformFee ?? rawMeta?.platformFee
  );

  const taxLabel = String(
    rawBill.taxLabel ?? body?.taxLabel ?? rawMeta?.taxLabel ?? (taxAmount !== undefined ? 'GST / Taxes' : '')
  )
    .trim()
    .slice(0, 40);

  const note = String(rawBill.note ?? body?.note ?? rawMeta?.note ?? '')
    .trim()
    .slice(0, 280);

  const returnUrl = sanitizeSafeUrl(
    rawBill.returnUrl ?? body?.returnUrl ?? rawMeta?.returnUrl
  );

  const hasAnyField =
    items.length > 0 ||
    subtotal !== undefined ||
    Boolean(couponCode) ||
    discountAmount !== undefined ||
    taxAmount !== undefined ||
    platformFee !== undefined ||
    Boolean(note) ||
    Boolean(returnUrl);

  if (!hasAnyField) return null;

  return {
    items,
    ...(subtotal !== undefined ? { subtotal } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(discountAmount !== undefined ? { discountAmount } : {}),
    ...(taxLabel ? { taxLabel } : {}),
    ...(taxAmount !== undefined ? { taxAmount } : {}),
    ...(platformFee !== undefined ? { platformFee } : {}),
    ...(note ? { note } : {}),
    ...(returnUrl ? { returnUrl } : {}),
  };
}

/**
 * Resolves the authoritative base payable rupee amount using integer paise arithmetic.
 * Prefers explicit baseAmount/amountInPaise; falls back to subtotal + tax + fee - discount.
 */
export function resolveCheckoutBaseRupees(
  explicitBaseAmount: unknown,
  billDetails: NormalizedBillDetails | null
): number | null {
  const explicit = Number(explicitBaseAmount);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit * 100) / 100;
  }

  if (!billDetails || billDetails.subtotal === undefined) {
    return null;
  }

  const subtotalPaise = Math.round(billDetails.subtotal * 100);
  const taxPaise = Math.round((billDetails.taxAmount || 0) * 100);
  const feePaise = Math.round((billDetails.platformFee || 0) * 100);
  const discountPaise = Math.round((billDetails.discountAmount || 0) * 100);

  const totalPaise = subtotalPaise + taxPaise + feePaise - discountPaise;
  if (totalPaise <= 0) return null;
  return totalPaise / 100;
}

/**
 * Builds public-safe checkout branding and trust metadata exposed to hosted/SDK modals.
 */
export function buildCheckoutBranding(params: {
  orderMeta?: Record<string, any>;
  merchant?: {
    businessName?: string;
    name?: string;
    websiteName?: string;
    websiteUrl?: string;
    websiteLogoUrl?: string;
    brandColor?: string;
    isActive?: boolean;
  } | null;
  kycStatus?: KycStatus | string | null;
  fallbackAppName?: string;
}) {
  const meta = params.orderMeta && typeof params.orderMeta === 'object' ? params.orderMeta : {};
  const merchant = params.merchant || {};

  const websiteName =
    String(meta.websiteName || merchant.websiteName || merchant.businessName || merchant.name || params.fallbackAppName || 'Verified Business')
      .trim()
      .slice(0, 80);

  const websiteUrl = sanitizeSafeUrl(meta.websiteUrl || merchant.websiteUrl);
  const websiteLogoUrl = sanitizeSafeUrl(meta.websiteLogoUrl || merchant.websiteLogoUrl);
  const brandColor = sanitizeBrandColor(meta.brandColor || merchant.brandColor);
  const kycVerified = params.kycStatus === 'VERIFIED';
  const trustedBusiness = merchant.isActive !== false;

  return {
    websiteName,
    websiteUrl,
    websiteLogoUrl,
    brandColor,
    trustedBusiness,
    kycVerified,
    trustLabel: 'SumioPay Trusted Business',
  };
}

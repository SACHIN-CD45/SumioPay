import crypto from 'crypto';
import { IMerchant } from '../models/merchant.model';
import { Order } from '../models/order.model';
import { Organization } from '../models/organization.model';
import { SystemSetting } from '../models/systemSetting.model';
import { IPaymentLinkCoupon } from '../models/paymentLink.model';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator';
import { selectUpiAndAdvanceRotation } from './upiRouter.service';
import { checkMerchantListenerAvailability } from './reliability.service';
import {
  buildCheckoutBranding,
  NormalizedBillDetails,
  sanitizeBrandColor,
  sanitizeSafeUrl,
} from '../utils/checkoutBranding';
import { config } from '../config';

export class OrderCreationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'ORDER_CREATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Pure server-side coupon computation ensuring final rupees stays >= 1.00 INR.
 */
export function applyPaymentLinkCoupon(
  subtotalInr: number,
  coupons: IPaymentLinkCoupon[] | undefined,
  requestedCode?: string
): {
  subtotalInr: number;
  discountInr: number;
  finalInr: number;
  appliedCouponCode: string;
} {
  const cleanSubtotal = Math.max(1, Number(subtotalInr) || 0);
  const cleanCode = String(requestedCode || '').toUpperCase().trim();
  if (!cleanCode || !Array.isArray(coupons)) {
    return {
      subtotalInr: cleanSubtotal,
      discountInr: 0,
      finalInr: cleanSubtotal,
      appliedCouponCode: '',
    };
  }

  const matched = coupons.find((c) => c.isActive !== false && c.code.toUpperCase() === cleanCode);
  if (!matched) {
    return {
      subtotalInr: cleanSubtotal,
      discountInr: 0,
      finalInr: cleanSubtotal,
      appliedCouponCode: '',
    };
  }

  const rawDiscount =
    matched.discountType === 'PERCENT'
      ? (cleanSubtotal * Math.min(99, Math.max(0, Number(matched.discountValue) || 0))) / 100
      : Math.max(0, Number(matched.discountValue) || 0);

  // Never discount below ₹1.00 because UPI rails reject 0.00 INR transfers
  const maxAllowedDiscount = Math.max(0, Number((cleanSubtotal - 1).toFixed(2)));
  const discountInr = Number(Math.min(rawDiscount, maxAllowedDiscount).toFixed(2));
  const finalInr = Number((cleanSubtotal - discountInr).toFixed(2));

  return {
    subtotalInr: cleanSubtotal,
    discountInr,
    finalInr,
    appliedCouponCode: matched.code.toUpperCase(),
  };
}

/**
 * Shared production Order creator enforcing Maintenance Mode, Offline Listener Shield,
 * unique paise offset allocation, multi-UPI routing, and tenant branding resolution.
 */
export async function createMerchantOrder(params: {
  merchant: IMerchant;
  baseAmountInr: number;
  appName: string;
  customerUserId?: string;
  customerPhone?: string;
  customerEmail?: string;
  callbackWebhookUrl?: string;
  isTest?: boolean;
  metadata?: Record<string, any>;
  billDetails?: NormalizedBillDetails | null;
}) {
  const { merchant, baseAmountInr, appName, metadata = {}, billDetails = null } = params;
  const resolvedIsTest = Boolean(params.isTest);

  const settings = await SystemSetting.findOne().select('maintenanceMode maintenanceMessage').lean();
  if (settings?.maintenanceMode) {
    throw new OrderCreationError(
      settings.maintenanceMessage || 'SumioPay is currently in maintenance mode.',
      503,
      'MAINTENANCE_MODE'
    );
  }

  const numBase = Number(Number(baseAmountInr).toFixed(2));
  if (isNaN(numBase) || numBase <= 0) {
    throw new OrderCreationError('Order amount must be positive', 400, 'INVALID_AMOUNT');
  }

  const listenerGate = await checkMerchantListenerAvailability(merchant, resolvedIsTest);
  if (!listenerGate.allowed) {
    throw new OrderCreationError(
      listenerGate.reason || 'Merchant listener phone offline.',
      503,
      'NO_ONLINE_LISTENER'
    );
  }

  const { exactAmount, paiseOffset } = await allocateUniquePaise(merchant._id, numBase);
  const selectedUpi = await selectUpiAndAdvanceRotation(merchant);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const orderId = `ORD-${dateStr}-${randomSuffix}`;
  const upiIntentUrl = buildUpiIntentUrl(selectedUpi.upiId, selectedUpi.upiName, exactAmount, orderId);
  const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60 * 1000);

  const safeMeta: Record<string, any> = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  safeMeta.assignedUpiId = selectedUpi.upiId;
  safeMeta.assignedUpiAccountId = selectedUpi.accountId;
  if (safeMeta.websiteName) safeMeta.websiteName = String(safeMeta.websiteName).trim().slice(0, 80);
  if (safeMeta.websiteUrl) safeMeta.websiteUrl = sanitizeSafeUrl(safeMeta.websiteUrl);
  if (safeMeta.websiteLogoUrl) safeMeta.websiteLogoUrl = sanitizeSafeUrl(safeMeta.websiteLogoUrl);
  if (safeMeta.brandColor) safeMeta.brandColor = sanitizeBrandColor(safeMeta.brandColor);
  if (billDetails) safeMeta.billDetails = billDetails;

  const order = new Order({
    orderId,
    merchantId: merchant._id,
    appName: String(appName || 'APP').toUpperCase().trim(),
    customerUserId: String(params.customerUserId || '').trim(),
    customerPhone: String(params.customerPhone || '').trim(),
    customerEmail: String(params.customerEmail || '').trim(),
    baseAmount: numBase,
    paiseOffset,
    exactAmount,
    isTest: resolvedIsTest,
    status: 'PENDING',
    upiIntentUrl,
    expiresAt,
    callbackWebhookUrl: params.callbackWebhookUrl || merchant.webhookUrl || '',
    metadata: safeMeta,
  });

  await order.save();

  const frontendBase = (process.env.PUBLIC_URL || 'https://sumiopay.sumiotech.in').replace(/\/+$/, '');
  const hostedCheckoutUrl = `${frontendBase}/pay/${order.orderId}`;

  const org = merchant.email
    ? await Organization.findOne({ billingEmail: merchant.email }).select('kycStatus').lean()
    : null;
  const branding = buildCheckoutBranding({
    orderMeta: order.metadata,
    merchant,
    kycStatus: org?.kycStatus,
    fallbackAppName: order.appName,
  });

  return {
    order,
    selectedUpi,
    branding,
    hostedCheckoutUrl,
    ttlSeconds: config.orderTtlMinutes * 60,
  };
}

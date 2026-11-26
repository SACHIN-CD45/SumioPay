import { IOrder } from '../models/order.model';
import { Subscription, ISubscription } from '../models/subscription.model';
import { Merchant, IMerchant } from '../models/merchant.model';
import { Device } from '../models/device.model';
import { SystemSetting, ISystemSetting } from '../models/systemSetting.model';
import { AuditLog } from '../models/auditLog.model';

export interface SubscriptionPlanCatalog {
  trialDays: number;
  monthlyPrice: number;
  monthlyDurationDays: number;
  monthlyDeviceLimit: number;
  monthlyDescription: string;
  halfYearlyPrice: number;
  halfYearlyDurationDays: number;
  halfYearlyDeviceLimit: number;
  halfYearlyDescription: string;
  customPrice: number;
  customLabel: string;
  customDescription: string;
}

export interface ResolvedPlanDetails {
  planKey: 'MONTHLY' | 'HALF_YEARLY' | 'CUSTOM';
  planTier: 'MONTHLY' | 'HALF_YEARLY' | 'CUSTOM';
  label: string;
  priceInr: number;
  durationDays: number;
  deviceLimit: number;
  description: string;
}

export interface PlatformCollectorStatus {
  enabled: boolean;
  configured: boolean;
  reason?: string;
  merchant: IMerchant | null;
  merchantId?: string;
  businessName?: string;
  email?: string;
  upiId?: string;
  upiName?: string;
  onlineDevicesCount: number;
  totalDevicesCount: number;
}

export const PLATFORM_SUBSCRIPTION_METADATA_TYPE = 'SUMIOPAY_PLATFORM_SUBSCRIPTION';

/**
 * Returns normalized subscription pricing & trial configuration from SystemSetting.
 */
export function getSubscriptionPlanCatalog(
  settings?: Partial<ISystemSetting> | null
): SubscriptionPlanCatalog {
  const sp = settings?.subscriptionPlans;
  return {
    trialDays:
      typeof sp?.trialDays === 'number' && sp.trialDays >= 0 ? sp.trialDays : 3,
    monthlyPrice:
      typeof sp?.monthlyPrice === 'number' && sp.monthlyPrice > 0 ? sp.monthlyPrice : 399,
    monthlyDurationDays:
      typeof sp?.monthlyDurationDays === 'number' && sp.monthlyDurationDays > 0
        ? sp.monthlyDurationDays
        : 30,
    monthlyDeviceLimit:
      typeof sp?.monthlyDeviceLimit === 'number' && sp.monthlyDeviceLimit > 0
        ? sp.monthlyDeviceLimit
        : 2,
    monthlyDescription:
      sp?.monthlyDescription ||
      'All core UPI auto-verification features, instant webhooks & dynamic QR checkout for 1 month.',
    halfYearlyPrice:
      typeof sp?.halfYearlyPrice === 'number' && sp.halfYearlyPrice > 0
        ? sp.halfYearlyPrice
        : 1999,
    halfYearlyDurationDays:
      typeof sp?.halfYearlyDurationDays === 'number' && sp.halfYearlyDurationDays > 0
        ? sp.halfYearlyDurationDays
        : 180,
    halfYearlyDeviceLimit:
      typeof sp?.halfYearlyDeviceLimit === 'number' && sp.halfYearlyDeviceLimit > 0
        ? sp.halfYearlyDeviceLimit
        : 5,
    halfYearlyDescription:
      sp?.halfYearlyDescription ||
      'Best value 6-month plan — multi-device pairing, priority webhooks & full API suite.',
    customPrice:
      typeof sp?.customPrice === 'number' && sp.customPrice >= 0 ? sp.customPrice : 0,
    customLabel: sp?.customLabel || 'Custom — All Features Unlocked',
    customDescription:
      sp?.customDescription ||
      'All features included: unlimited devices, custom white-label branding, SLA & dedicated support.',
  };
}

/**
 * Maps a requested checkout planKey to canonical pricing and duration.
 */
export function resolvePlanDetails(
  planKey: string,
  catalog: SubscriptionPlanCatalog
): ResolvedPlanDetails | null {
  const normalized = (planKey || '').toUpperCase().trim();
  if (normalized === 'MONTHLY' || normalized === 'STARTER') {
    return {
      planKey: 'MONTHLY',
      planTier: 'MONTHLY',
      label: '1 Month Pro Plan',
      priceInr: catalog.monthlyPrice,
      durationDays: catalog.monthlyDurationDays,
      deviceLimit: catalog.monthlyDeviceLimit,
      description: catalog.monthlyDescription,
    };
  }
  if (normalized === 'HALF_YEARLY' || normalized === '6_MONTHS' || normalized === 'GROWTH') {
    return {
      planKey: 'HALF_YEARLY',
      planTier: 'HALF_YEARLY',
      label: '6 Months Growth Plan',
      priceInr: catalog.halfYearlyPrice,
      durationDays: catalog.halfYearlyDurationDays,
      deviceLimit: catalog.halfYearlyDeviceLimit,
      description: catalog.halfYearlyDescription,
    };
  }
  if (normalized === 'CUSTOM' || normalized === 'ENTERPRISE') {
    return {
      planKey: 'CUSTOM',
      planTier: 'CUSTOM',
      label: catalog.customLabel,
      priceInr: catalog.customPrice,
      durationDays: 365,
      deviceLimit: 999,
      description: catalog.customDescription,
    };
  }
  return null;
}

/**
 * Computes subscription period end when a free trial starts.
 */
export function computeTrialPeriodEnd(trialDays: number, now: Date = new Date()): Date {
  const safeDays = Math.max(0, trialDays);
  return new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);
}

/**
 * Computes extended subscription end date. Early renewals preserve remaining active days.
 */
export function computeExtendedPeriodEnd(
  currentPeriodEnd: Date | string | null | undefined,
  currentStatus: string | undefined,
  durationDays: number,
  now: Date = new Date()
): Date {
  const safeDays = Math.max(1, durationDays);
  const existingEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const anchor =
    currentStatus === 'ACTIVE' &&
    existingEnd &&
    !isNaN(existingEnd.getTime()) &&
    existingEnd.getTime() > now.getTime()
      ? existingEnd
      : now;
  return new Date(anchor.getTime() + safeDays * 24 * 60 * 60 * 1000);
}

/**
 * Resolves the SumioPay Platform Collector Merchant account (used to collect SumioPay SaaS
 * subscriptions through SumioPay itself via real UPI + Android Listener verification).
 */
export async function resolvePlatformCollectorMerchant(
  existingSettings?: ISystemSetting | null
): Promise<PlatformCollectorStatus> {
  const settings = existingSettings || (await SystemSetting.findOne());
  const billing = settings?.platformBilling;
  const enabled = billing?.isEnabled !== false;

  if (!enabled) {
    return {
      enabled: false,
      configured: false,
      reason: 'Self-billing is paused by SuperAdmin.',
      merchant: null,
      onlineDevicesCount: 0,
      totalDevicesCount: 0,
    };
  }

  let collector: IMerchant | null = null;
  const apiKey = (billing?.collectorApiKey || '').trim();
  const collectorEmail = (billing?.collectorMerchantEmail || '').toLowerCase().trim();

  if (apiKey) {
    collector = await Merchant.findOne({ apiKey, isActive: true });
  }
  if (!collector && collectorEmail) {
    collector = await Merchant.findOne({ email: collectorEmail, isActive: true });
  }

  if (!collector) {
    return {
      enabled: true,
      configured: false,
      reason:
        'Platform Collector Merchant is not configured yet. Set your SumioPay collector email or API key in SuperAdmin Settings.',
      merchant: null,
      onlineDevicesCount: 0,
      totalDevicesCount: 0,
    };
  }

  if (!collector.upiId || !collector.upiId.includes('@')) {
    return {
      enabled: true,
      configured: false,
      reason: `Collector account (${collector.email}) does not have a valid UPI ID set.`,
      merchant: collector,
      merchantId: collector._id.toString(),
      businessName: collector.businessName,
      email: collector.email,
      upiId: collector.upiId,
      upiName: collector.upiName,
      onlineDevicesCount: 0,
      totalDevicesCount: 0,
    };
  }

  const devices = await Device.find({ merchantId: collector._id }).select('isPaired isActive lastPingAt');
  const twoMinsAgo = Date.now() - 2 * 60 * 1000;
  const onlineDevicesCount = devices.filter(
    (d) =>
      d.isPaired &&
      d.isActive &&
      d.lastPingAt &&
      new Date(d.lastPingAt).getTime() >= twoMinsAgo
  ).length;

  return {
    enabled: true,
    configured: true,
    merchant: collector,
    merchantId: collector._id.toString(),
    businessName: collector.businessName,
    email: collector.email,
    upiId: collector.upiId,
    upiName: collector.upiName || collector.businessName,
    onlineDevicesCount,
    totalDevicesCount: devices.length,
  };
}

/**
 * Idempotently activates or extends a merchant's SumioPay subscription once their
 * self-billing checkout Order is marked PAID (via Android Listener, manual unmapped,
 * or CSV reconciliation).
 */
export async function activatePlatformSubscriptionFromOrder(order: Partial<IOrder>): Promise<{
  activated: boolean;
  alreadyProcessed: boolean;
  subscription?: ISubscription;
}> {
  const meta = (order?.metadata || {}) as Record<string, any>;
  if (
    meta.type !== PLATFORM_SUBSCRIPTION_METADATA_TYPE ||
    order.status !== 'PAID' ||
    order.isTest
  ) {
    return { activated: false, alreadyProcessed: false };
  }

  const subscriberMerchantId = meta.subscriberMerchantId;
  const orderId = order.orderId;
  if (!subscriberMerchantId || !orderId) {
    return { activated: false, alreadyProcessed: false };
  }

  let subscription = await Subscription.findOne({ merchantId: subscriberMerchantId });
  if (!subscription) {
    subscription = new Subscription({
      merchantId: subscriberMerchantId,
      planTier: 'TRIAL',
      status: 'TRIAL',
    });
  }

  const alreadyRecorded = subscription.invoiceHistory.some(
    (inv) => inv.orderId === orderId || inv.invoiceId === `INV-${orderId}`
  );
  if (alreadyRecorded) {
    return { activated: false, alreadyProcessed: true, subscription };
  }

  const settings = await SystemSetting.findOne();
  const catalog = getSubscriptionPlanCatalog(settings);
  const resolvedPlan = resolvePlanDetails(meta.planTier || meta.planKey || 'MONTHLY', catalog);

  const planTier = resolvedPlan?.planTier || 'MONTHLY';
  const durationDays = Number(meta.durationDays) || resolvedPlan?.durationDays || 30;
  const basePriceInr = Number(meta.basePriceInr) || Number(order.baseAmount) || resolvedPlan?.priceInr || 399;
  const now = new Date();
  const newPeriodEnd = computeExtendedPeriodEnd(
    subscription.currentPeriodEnd,
    subscription.status,
    durationDays,
    now
  );

  const monthlyEquivalentPaise =
    planTier === 'HALF_YEARLY'
      ? Math.round((basePriceInr * 100) / 6)
      : Math.round(basePriceInr * 100);

  subscription.planTier = planTier;
  subscription.status = 'ACTIVE';
  subscription.currentPeriodStart = now;
  subscription.currentPeriodEnd = newPeriodEnd;
  subscription.cancelAtPeriodEnd = false;
  subscription.monthlyPriceInPaise = monthlyEquivalentPaise;
  subscription.invoiceHistory.push({
    invoiceId: `INV-${orderId}`,
    orderId,
    planTier,
    durationDays,
    utrNumber: order.utrNumber || '',
    amountInPaise: Math.round((order.exactAmount || basePriceInr) * 100),
    paidAt: order.paidAt ? new Date(order.paidAt) : now,
  });

  await subscription.save();
  await Merchant.findByIdAndUpdate(subscriberMerchantId, { planTier });

  await AuditLog.create({
    actorType: 'SYSTEM',
    actorEmail: meta.subscriberEmail || 'system@sumiotech.in',
    merchantId: subscriberMerchantId,
    action: 'SUBSCRIPTION_AUTO_ACTIVATED_BY_PAYMENT',
    resourceType: 'SUBSCRIPTION',
    resourceId: orderId,
    newState: {
      planTier,
      durationDays,
      amountPaid: order.exactAmount,
      utrNumber: order.utrNumber || '',
      currentPeriodEnd: newPeriodEnd,
    },
  }).catch(() => {});

  return { activated: true, alreadyProcessed: false, subscription };
}

import mongoose from 'mongoose';
import { IMerchant } from '../models/merchant.model';
import { IOrder } from '../models/order.model';
import { SaasPlan, ISaasPlan } from '../models/saasPlan.model';
import { CustomerEntitlement, ICustomerEntitlement } from '../models/customerEntitlement.model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeEntitlementRenewalExpiry(params: {
  now?: Date;
  currentStatus?: string;
  currentExpiresAt?: Date | null;
  durationDays: number;
}): Date {
  const now = params.now || new Date();
  const days = Math.max(1, Math.round(params.durationDays || 30));
  const existing = params.currentExpiresAt ? new Date(params.currentExpiresAt) : null;
  const preserveRemaining =
    params.currentStatus === 'ACTIVE' && existing && existing.getTime() > now.getTime();
  const baseMs = preserveRemaining ? existing!.getTime() : now.getTime();
  return new Date(baseMs + days * MS_PER_DAY);
}

export function formatEntitlementSummary(
  entitlement: ICustomerEntitlement | null,
  now: Date = new Date()
) {
  if (!entitlement) {
    return {
      active: false,
      status: 'NONE',
      planCode: '',
      planName: '',
      daysRemaining: 0,
      expiresAt: null as Date | null,
      lastOrderId: '',
    };
  }

  const expiresMs = new Date(entitlement.expiresAt).getTime();
  const msLeft = expiresMs - now.getTime();
  const isActive = msLeft > 0 && entitlement.status !== 'EXPIRED';
  const daysRemaining = isActive ? Math.max(1, Math.ceil(msLeft / MS_PER_DAY)) : 0;

  return {
    active: isActive,
    status: isActive ? entitlement.status : 'EXPIRED',
    planCode: entitlement.planCode,
    planName: entitlement.planName,
    daysRemaining,
    expiresAt: entitlement.expiresAt,
    lastOrderId: entitlement.lastOrderId || '',
  };
}

/**
 * Checks or auto-provisions an initial free trial for a SaaS merchant's end-customer.
 */
export async function checkOrProvisionCustomerEntitlement(params: {
  merchant: IMerchant;
  customerUserId: string;
  planCode?: string;
  customerEmail?: string;
  customerName?: string;
  now?: Date;
}) {
  const now = params.now || new Date();
  const cleanUserId = String(params.customerUserId || '').trim();
  if (!cleanUserId) {
    return {
      active: false,
      status: 'INVALID_USER',
      planCode: '',
      planName: '',
      daysRemaining: 0,
      expiresAt: null as Date | null,
      lastOrderId: '',
    };
  }

  let entitlement = await CustomerEntitlement.findOne({
    merchantId: params.merchant._id,
    customerUserId: cleanUserId,
  });

  if (!entitlement && params.planCode) {
    const plan: ISaasPlan | null = await SaasPlan.findOne({
      merchantId: params.merchant._id,
      planCode: String(params.planCode).toUpperCase().trim(),
      isActive: true,
    });

    if (plan && plan.trialDays > 0) {
      const trialEnd = new Date(now.getTime() + plan.trialDays * MS_PER_DAY);
      try {
        entitlement = await CustomerEntitlement.findOneAndUpdate(
          { merchantId: params.merchant._id, customerUserId: cleanUserId },
          {
            $setOnInsert: {
              merchantId: params.merchant._id,
              customerUserId: cleanUserId,
              customerEmail: String(params.customerEmail || '').trim(),
              customerName: String(params.customerName || '').trim(),
              planCode: plan.planCode,
              planName: plan.name,
              status: 'TRIAL',
              startedAt: now,
              expiresAt: trialEnd,
              trialGranted: true,
              activatedOrderIds: [],
            },
          },
          { upsert: true, new: true }
        );
      } catch {
        entitlement = await CustomerEntitlement.findOne({
          merchantId: params.merchant._id,
          customerUserId: cleanUserId,
        });
      }
    }
  }

  if (entitlement && entitlement.status !== 'EXPIRED' && new Date(entitlement.expiresAt).getTime() <= now.getTime()) {
    entitlement.status = 'EXPIRED';
    await entitlement.save().catch(() => {});
  }

  return formatEntitlementSummary(entitlement, now);
}

/**
 * Idempotently activates or extends an end-customer's SaaS subscription when a linked SumioPay order settles.
 */
export async function activateCustomerEntitlementFromOrder(order: IOrder): Promise<boolean> {
  const meta = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<string, any>;
  const planCode = typeof meta.saasPlanCode === 'string' ? meta.saasPlanCode.toUpperCase().trim() : '';
  const customerUserId = String(order.customerUserId || '').trim();

  if (!planCode || !customerUserId || order.status !== 'PAID') {
    return false;
  }

  const plan = await SaasPlan.findOne({
    merchantId: order.merchantId,
    planCode,
  });
  if (!plan) {
    return false;
  }

  const now = order.paidAt ? new Date(order.paidAt) : new Date();
  const durationDays = Number(meta.saasDurationDays || plan.durationDays || 30);

  const existing = await CustomerEntitlement.findOne({
    merchantId: order.merchantId,
    customerUserId,
  });

  if (existing && Array.isArray(existing.activatedOrderIds) && existing.activatedOrderIds.includes(order.orderId)) {
    return false; // Already activated by this orderId
  }

  const newExpiry = computeEntitlementRenewalExpiry({
    now,
    currentStatus: existing?.status,
    currentExpiresAt: existing?.expiresAt,
    durationDays,
  });

  if (!existing) {
    await CustomerEntitlement.findOneAndUpdate(
      { merchantId: order.merchantId, customerUserId, activatedOrderIds: { $ne: order.orderId } },
      {
        $set: {
          planCode: plan.planCode,
          planName: plan.name,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt: newExpiry,
          lastOrderId: order.orderId,
          lastUtr: order.utrNumber || '',
          ...(order.customerEmail ? { customerEmail: order.customerEmail } : {}),
        },
        $addToSet: { activatedOrderIds: order.orderId },
      },
      { upsert: true, new: true }
    );
    return true;
  }

  const updated = await CustomerEntitlement.findOneAndUpdate(
    { _id: existing._id, activatedOrderIds: { $ne: order.orderId } },
    {
      $set: {
        planCode: plan.planCode,
        planName: plan.name,
        status: 'ACTIVE',
        expiresAt: newExpiry,
        lastOrderId: order.orderId,
        lastUtr: order.utrNumber || '',
        ...(order.customerEmail ? { customerEmail: order.customerEmail } : {}),
      },
      $addToSet: { activatedOrderIds: order.orderId },
    },
    { new: true }
  );

  return Boolean(updated);
}

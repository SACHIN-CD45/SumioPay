import { IOrder } from '../models/order.model';
import { IMerchant, Merchant } from '../models/merchant.model';
import { EmailService } from './email.service';
import { dispatchMerchantWebhook } from '../utils/hmacSigner';
import { activatePlatformSubscriptionFromOrder } from './subscriptionActivation.service';
import { recordUpiAccountCredit } from './upiRouter.service';

function extractFriendlyBuyerName(order: Partial<IOrder>, fallback: string): string {
  const meta = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<string, any>;
  if (typeof meta.customerName === 'string' && meta.customerName.trim()) {
    return meta.customerName.trim();
  }
  if (typeof order.senderName === 'string' && order.senderName.trim()) {
    return order.senderName.trim();
  }
  if (typeof order.customerEmail === 'string' && order.customerEmail.includes('@')) {
    return order.customerEmail.split('@')[0];
  }
  return fallback;
}

/**
 * Shared idempotent post-payment fulfillment runner once an Order transitions to PAID:
 * 1. Activates SumioPay SaaS subscription if order belongs to platform self-billing.
 * 2. Updates merchant live GMV counters and per-UPI daily volume (live orders only).
 * 3. Sends SumioPay Enterprise Bill email to buyer (if email provided) + settlement notice to merchant.
 * 4. Dispatches HMAC-SHA256 signed webhook to merchant's configured server endpoint.
 */
export async function finalizePaidOrderSideEffects(params: {
  order: IOrder;
  merchant?: IMerchant | null;
  skipVolumeIncrement?: boolean;
}): Promise<void> {
  const { order, skipVolumeIncrement = false } = params;
  const merchant =
    params.merchant || (await Merchant.findById(order.merchantId));

  // 1. Platform Self-Billing Auto-Activation
  await activatePlatformSubscriptionFromOrder(order).catch((err) => {
    console.error(`[SubscriptionActivation] Failed for ${order.orderId}:`, err?.message);
  });

  if (!merchant) {
    return;
  }

  // 2. Merchant Live Volume & Multi-UPI Daily Limit Counters
  if (!order.isTest && !skipVolumeIncrement) {
    await Merchant.findByIdAndUpdate(merchant._id, {
      $inc: { totalVolume: order.exactAmount, totalTransactions: 1 },
    }).catch((err) => {
      console.error(`[MerchantVolumeUpdate] Failed for ${order.orderId}:`, err?.message);
    });

    await recordUpiAccountCredit(
      merchant._id,
      (order.metadata as any)?.assignedUpiId,
      order.exactAmount
    ).catch(() => {});
  }

  // 3. Enterprise Payment Bill Email Receipt (Buyer + Merchant copy when applicable)
  const meta = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<string, any>;
  const siteName = meta.websiteName || merchant.websiteName || merchant.businessName || 'SumioTech';
  const siteUrl = meta.websiteUrl || merchant.websiteUrl || '';
  const planOrItem = meta.planName || meta.planLabel || order.appName || 'Online Payment';
  const paidAtFormatted = order.paidAt
    ? new Date(order.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const commonReceipt = {
    orderId: order.orderId,
    amount: order.baseAmount,
    exactAmount: order.exactAmount,
    utr: order.utrNumber || 'Bank Credit Confirmed',
    merchantBusinessName: merchant.businessName,
    websiteName: siteName,
    websiteUrl: siteUrl,
    appName: order.appName,
    planOrItemName: planOrItem,
    paymentMethodLabel: order.bankAppName || 'UPI Direct',
    paymentDate: paidAtFormatted,
    billDetails: meta.billDetails || null,
    isTest: Boolean(order.isTest),
  };

  const customerEmail = (order.customerEmail || '').trim().toLowerCase();
  const merchantEmail = (merchant.email || '').trim().toLowerCase();

  if (customerEmail && customerEmail.includes('@')) {
    const buyerName = extractFriendlyBuyerName(order, 'Valued Customer');
    EmailService.sendPaymentReceipt(customerEmail, buyerName, {
      ...commonReceipt,
      recipientRole: 'CUSTOMER',
    }).catch((err) => {
      console.error(`[EmailReceipt Buyer] Failed for ${order.orderId}:`, err?.message);
    });
  }

  // Send settlement copy to merchant for live orders (unless customer & merchant share the same email)
  if (
    merchantEmail &&
    merchantEmail.includes('@') &&
    !order.isTest &&
    merchantEmail !== customerEmail
  ) {
    EmailService.sendPaymentReceipt(merchantEmail, merchant.name || merchant.businessName, {
      ...commonReceipt,
      recipientRole: 'MERCHANT',
    }).catch((err) => {
      console.error(`[EmailReceipt Merchant] Failed for ${order.orderId}:`, err?.message);
    });
  }

  // 4. Signed HMAC-SHA256 Merchant Webhook Dispatch
  const targetWebhookUrl = order.callbackWebhookUrl || merchant.webhookUrl;
  if (targetWebhookUrl) {
    dispatchMerchantWebhook(
      merchant._id,
      order.orderId,
      targetWebhookUrl,
      merchant.webhookSecret,
      {
        orderId: order.orderId,
        appName: order.appName,
        userId: order.customerUserId,
        customerUserId: order.customerUserId,
        customerEmail: order.customerEmail || '',
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        amount: order.exactAmount,
        amountInPaise: Math.round(order.exactAmount * 100),
        status: 'PAID',
        utr: order.utrNumber,
        utrNumber: order.utrNumber,
        senderName: order.senderName || '',
        bankAppName: order.bankAppName || '',
        metadata: order.metadata || {},
        paidAt: order.paidAt,
      },
      'payment.succeeded'
    ).catch((err) => {
      console.error(`[Webhook] Dispatch failed for order ${order.orderId}:`, err?.message);
    });
  }
}

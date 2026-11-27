import crypto from 'crypto';
import axios from 'axios';
import WebhookLog from '../models/webhookLog.model';
import Order from '../models/order.model';
import Merchant from '../models/merchant.model';
import mongoose from 'mongoose';
import { resolveAndAssertSafeWebhookUrl } from './securityGuards';

export type WebhookEventType =
  | 'payment.created'
  | 'payment.pending'
  | 'payment.processing'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.cancelled'
  | 'payment.refunded'
  | 'payment.disputed'
  | 'reconciliation.completed'
  | 'device.disconnected';

// Exponential retry cadence: 15s -> 1m -> 5m -> 15m -> 30m
export const WEBHOOK_RETRY_DELAYS_MS = [15_000, 60_000, 300_000, 900_000, 1_800_000];
export const DEFAULT_MAX_WEBHOOK_ATTEMPTS = 5;

export function computeWebhookRetryDelayMs(attempt: number): number {
  const idx = Math.max(0, Math.min(WEBHOOK_RETRY_DELAYS_MS.length - 1, attempt - 1));
  return WEBHOOK_RETRY_DELAYS_MS[idx];
}

/**
 * Computes HMAC-SHA256 signature for outgoing webhook payload
 */
export function signWebhookPayload(payloadString: string, secretKey: string, timestamp?: number): string {
  const dataToSign = timestamp ? `${timestamp}.${payloadString}` : payloadString;
  return crypto.createHmac('sha256', secretKey).update(dataToSign).digest('hex');
}

/**
 * Dispatches an enterprise signed webhook notification with unique event ID,
 * replay protection timestamp, audit delivery logging, and automatic retry scheduling.
 */
export async function dispatchMerchantWebhook(
  merchantId: mongoose.Types.ObjectId,
  orderId: string,
  webhookUrl: string,
  webhookSecret: string,
  eventData: any,
  eventType: WebhookEventType = 'payment.succeeded',
  options?: { autoRetry?: boolean; maxAttempts?: number }
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return false;
  }

  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const maxAttempts = options?.maxAttempts || DEFAULT_MAX_WEBHOOK_ATTEMPTS;

  const payload = {
    id: eventId,
    type: eventType,
    created_at: new Date().toISOString(),
    data: eventData,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, webhookSecret, timestamp);

  try {
    const safeUrl = await resolveAndAssertSafeWebhookUrl(webhookUrl);
    const res = await axios.post(safeUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-sumiopay-event-id': eventId,
        'x-sumiopay-event': eventType,
        'x-sumiopay-timestamp': timestamp.toString(),
        'x-sumiopay-signature': signature,
        'User-Agent': 'SumioPay-Enterprise-Webhook-Engine/2.0',
      },
      timeout: 8000,
      maxRedirects: 0,
    });

    await WebhookLog.create({
      merchantId,
      orderId,
      url: webhookUrl,
      payload,
      responseStatus: res.status,
      responseBody: typeof res.data === 'string' ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500),
      delivered: true,
      status: 'DELIVERED',
      attempt: 1,
      maxAttempts,
      nextRetryAt: null,
      lastAttemptAt: new Date(),
    });

    Order.updateOne(
      { orderId, merchantId },
      { $set: { webhookDeliveryStatus: 'DELIVERED', webhookResponseCode: res.status } }
    ).catch(() => {});

    return true;
  } catch (err: any) {
    let autoRetry = options?.autoRetry;
    if (autoRetry === undefined) {
      const m = await Merchant.findById(merchantId).select('reliabilitySettings.webhookAutoRetryEnabled').lean();
      autoRetry = m?.reliabilitySettings?.webhookAutoRetryEnabled !== false;
    }

    const willRetry = Boolean(autoRetry && maxAttempts > 1);
    const nextRetryAt = willRetry ? new Date(Date.now() + computeWebhookRetryDelayMs(1)) : null;

    await WebhookLog.create({
      merchantId,
      orderId,
      url: webhookUrl,
      payload,
      responseStatus: err.response?.status || 500,
      responseBody: err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : '',
      error: err.message,
      delivered: false,
      status: willRetry ? 'PENDING_RETRY' : 'EXHAUSTED',
      attempt: 1,
      maxAttempts,
      nextRetryAt,
      lastAttemptAt: new Date(),
    });

    Order.updateOne(
      { orderId, merchantId },
      {
        $set: {
          webhookDeliveryStatus: willRetry ? 'RETRYING' : 'FAILED',
          webhookResponseCode: err.response?.status || 500,
        },
        $inc: { webhookRetries: 1 },
      }
    ).catch(() => {});

    return false;
  }
}

/**
 * Background worker processing due webhook retries with fresh timestamps & HMAC signatures.
 */
export async function processPendingWebhookRetries(batchLimit = 25): Promise<{
  processed: number;
  delivered: number;
  failed: number;
}> {
  const now = new Date();
  const dueLogs = await WebhookLog.find({
    status: 'PENDING_RETRY',
    nextRetryAt: { $lte: now },
  })
    .sort({ nextRetryAt: 1 })
    .limit(batchLimit);

  let processed = 0;
  let delivered = 0;
  let failed = 0;

  for (const log of dueLogs) {
    // Claim row optimistically so concurrent ticks do not double-send
    const claimed = await WebhookLog.findOneAndUpdate(
      { _id: log._id, status: 'PENDING_RETRY' },
      { $set: { nextRetryAt: new Date(Date.now() + 120_000), lastAttemptAt: new Date() } },
      { new: true }
    );
    if (!claimed) continue;

    processed += 1;
    const nextAttempt = (claimed.attempt || 1) + 1;
    const maxAttempts = claimed.maxAttempts || DEFAULT_MAX_WEBHOOK_ATTEMPTS;

    const merchant = await Merchant.findById(claimed.merchantId).select('webhookSecret isActive').lean();
    if (!merchant || !merchant.isActive) {
      claimed.status = 'EXHAUSTED';
      claimed.nextRetryAt = null;
      claimed.error = 'Merchant inactive or removed';
      await claimed.save();
      failed += 1;
      continue;
    }

    const payloadString = JSON.stringify(claimed.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(payloadString, merchant.webhookSecret, timestamp);
    const eventId = claimed.payload?.id || `evt_retry_${claimed._id}`;
    const eventType = claimed.payload?.type || 'payment.succeeded';

    try {
      const safeUrl = await resolveAndAssertSafeWebhookUrl(claimed.url);
      const res = await axios.post(safeUrl, claimed.payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-sumiopay-event-id': String(eventId),
          'x-sumiopay-event': String(eventType),
          'x-sumiopay-timestamp': timestamp.toString(),
          'x-sumiopay-signature': signature,
          'x-sumiopay-retry-attempt': String(nextAttempt),
          'User-Agent': 'SumioPay-Enterprise-Webhook-Engine/2.0',
        },
        timeout: 8000,
        maxRedirects: 0,
      });

      claimed.delivered = true;
      claimed.status = 'DELIVERED';
      claimed.attempt = nextAttempt;
      claimed.responseStatus = res.status;
      claimed.responseBody =
        typeof res.data === 'string' ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500);
      claimed.error = undefined;
      claimed.nextRetryAt = null;
      claimed.lastAttemptAt = new Date();
      await claimed.save();

      Order.updateOne(
        { orderId: claimed.orderId, merchantId: claimed.merchantId },
        { $set: { webhookDeliveryStatus: 'DELIVERED', webhookResponseCode: res.status } }
      ).catch(() => {});

      delivered += 1;
    } catch (err: any) {
      const hasMoreAttempts = nextAttempt < maxAttempts;
      claimed.delivered = false;
      claimed.attempt = nextAttempt;
      claimed.responseStatus = err.response?.status || 500;
      claimed.responseBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : '';
      claimed.error = err.message;
      claimed.status = hasMoreAttempts ? 'PENDING_RETRY' : 'EXHAUSTED';
      claimed.nextRetryAt = hasMoreAttempts
        ? new Date(Date.now() + computeWebhookRetryDelayMs(nextAttempt))
        : null;
      claimed.lastAttemptAt = new Date();
      await claimed.save();

      Order.updateOne(
        { orderId: claimed.orderId, merchantId: claimed.merchantId },
        {
          $set: {
            webhookDeliveryStatus: hasMoreAttempts ? 'RETRYING' : 'FAILED',
            webhookResponseCode: err.response?.status || 500,
          },
          $inc: { webhookRetries: 1 },
        }
      ).catch(() => {});

      failed += 1;
    }
  }

  return { processed, delivered, failed };
}

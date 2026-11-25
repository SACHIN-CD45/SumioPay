import crypto from 'crypto';
import axios from 'axios';
import WebhookLog from '../models/webhookLog.model';
import mongoose from 'mongoose';

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

/**
 * Computes HMAC-SHA256 signature for outgoing webhook payload
 */
export function signWebhookPayload(payloadString: string, secretKey: string, timestamp?: number): string {
  const dataToSign = timestamp ? `${timestamp}.${payloadString}` : payloadString;
  return crypto.createHmac('sha256', secretKey).update(dataToSign).digest('hex');
}

/**
 * Dispatches an enterprise signed webhook notification with unique event ID,
 * replay protection timestamp, and audit delivery logging.
 */
export async function dispatchMerchantWebhook(
  merchantId: mongoose.Types.ObjectId,
  orderId: string,
  webhookUrl: string,
  webhookSecret: string,
  eventData: any,
  eventType: WebhookEventType = 'payment.succeeded'
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return false;
  }

  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = {
    id: eventId,
    type: eventType,
    created_at: new Date().toISOString(),
    data: eventData,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, webhookSecret, timestamp);

  try {
    const res = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-sumiopay-event-id': eventId,
        'x-sumiopay-event': eventType,
        'x-sumiopay-timestamp': timestamp.toString(),
        'x-sumiopay-signature': signature,
        'User-Agent': 'SumioPay-Enterprise-Webhook-Engine/2.0',
      },
      timeout: 8000,
    });

    await WebhookLog.create({
      merchantId,
      orderId,
      url: webhookUrl,
      payload,
      responseStatus: res.status,
      responseBody: typeof res.data === 'string' ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500),
      delivered: true,
      attempt: 1,
    });

    return true;
  } catch (err: any) {
    await WebhookLog.create({
      merchantId,
      orderId,
      url: webhookUrl,
      payload,
      responseStatus: err.response?.status || 500,
      responseBody: err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : '',
      error: err.message,
      delivered: false,
      attempt: 1,
    });

    return false;
  }
}

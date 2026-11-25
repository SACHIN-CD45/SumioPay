import crypto from 'crypto';
import { WebhookEventPayload } from './types';
import { SumioSignatureVerificationError } from './errors';

export class Webhooks {
  /**
   * Verifies an incoming webhook HMAC-SHA256 signature against raw request body
   * @param rawBody - Raw string payload as received on your endpoint
   * @param signatureHeader - The 'x-sumiopay-signature' header string
   * @param webhookSecret - Merchant or Project webhook secret
   */
  public static verifySignature(rawBody: string, signatureHeader: string, webhookSecret: string): boolean {
    if (!rawBody || !signatureHeader || !webhookSecret) {
      throw new SumioSignatureVerificationError('Missing rawBody, signature, or webhook secret');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      throw new SumioSignatureVerificationError('Signature length mismatch');
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    if (!isValid) {
      throw new SumioSignatureVerificationError('Cryptographic signature verification failed');
    }

    return true;
  }

  /**
   * Safely parses verified webhook payload
   */
  public static parseEvent(rawBody: string): WebhookEventPayload {
    try {
      return JSON.parse(rawBody) as WebhookEventPayload;
    } catch {
      throw new Error('Invalid JSON payload in webhook body');
    }
  }
}

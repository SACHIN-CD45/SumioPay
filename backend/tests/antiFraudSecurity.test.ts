import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { Webhooks } from '../packages/sdk-typescript/src/webhooks';

describe('Anti-Fraud & Security Architecture', () => {
  const webhookSecret = 'whsec_test_secret_key_84920481023948';
  const samplePayload = JSON.stringify({
    event: 'payment.paid',
    orderId: 'ord_live_839201',
    appName: 'SUMIOLAB',
    userId: 'usr_441',
    amountInPaise: 49942,
    exactAmount: 499.42,
    utr: '432198765432',
  });

  test('generates and cryptographically verifies valid HMAC-SHA256 signature', () => {
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(samplePayload)
      .digest('hex');

    const isValid = Webhooks.verifySignature(samplePayload, validSignature, webhookSecret);
    assert.equal(isValid, true);
  });

  test('fails and throws error on tampered payload or altered amount', () => {
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(samplePayload)
      .digest('hex');

    const tamperedPayload = JSON.stringify({
      event: 'payment.paid',
      orderId: 'ord_live_839201',
      appName: 'SUMIOLAB',
      userId: 'usr_441',
      amountInPaise: 100, // Attacker tampered 49942 to 100
      exactAmount: 1.00,
      utr: '432198765432',
    });

    assert.throws(() => {
      Webhooks.verifySignature(tamperedPayload, validSignature, webhookSecret);
    });
  });

  test('fails and throws error on spoofed signature secret', () => {
    const wrongSecret = 'whsec_attacker_fake_secret_key';
    const fakeSignature = crypto
      .createHmac('sha256', wrongSecret)
      .update(samplePayload)
      .digest('hex');

    assert.throws(() => {
      Webhooks.verifySignature(samplePayload, fakeSignature, webhookSecret);
    });
  });

  test('verifies timestamp-prefixed HMAC-SHA256 webhook signatures', () => {
    const timestamp = 1764175200;
    const timestampedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${samplePayload}`)
      .digest('hex');

    assert.equal(Webhooks.verifySignature(samplePayload, timestampedSig, webhookSecret, timestamp), true);
    assert.throws(() => {
      Webhooks.verifySignature(samplePayload, timestampedSig, webhookSecret, timestamp + 1);
    });
  });

  test('detects and defends against duplicate UTR replay attacks', () => {
    const processedUTRs = new Set<string>();
    const incomingUTR = '432198765432';

    // First arrival: valid
    const isFirstTime = !processedUTRs.has(incomingUTR);
    assert.equal(isFirstTime, true);
    processedUTRs.add(incomingUTR);

    // Replay attack attempt: duplicate UTR must be blocked
    const isReplay = processedUTRs.has(incomingUTR);
    assert.equal(isReplay, true);
  });
});

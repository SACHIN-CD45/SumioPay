import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWebhookRetryDelayMs,
  WEBHOOK_RETRY_DELAYS_MS,
} from '../src/utils/hmacSigner';
import {
  normalizeIp,
  sanitizeIpAllowlist,
  isIpAllowlisted,
} from '../src/utils/securityGuards';
import { applyPaymentLinkCoupon } from '../src/services/orderCreation.service';
import {
  computeEntitlementRenewalExpiry,
  formatEntitlementSummary,
} from '../src/services/saasEntitlement.service';
import {
  checkMerchantListenerAvailability,
  isValidTelegramBotToken,
  isValidTelegramChatId,
} from '../src/services/reliability.service';
import { Device } from '../src/models/device.model';
import { PaymentLink } from '../src/models/paymentLink.model';
import { SaasPlan } from '../src/models/saasPlan.model';
import { CustomerEntitlement } from '../src/models/customerEntitlement.model';

describe('Senior Differentiators: Zero-Drop Reliability, Payment Links, SaaS Engine & Security', () => {
  test('computes exponential webhook retry backoff delays safely within bounds', () => {
    assert.equal(computeWebhookRetryDelayMs(1), WEBHOOK_RETRY_DELAYS_MS[0]);
    assert.equal(computeWebhookRetryDelayMs(2), WEBHOOK_RETRY_DELAYS_MS[1]);
    assert.equal(computeWebhookRetryDelayMs(3), WEBHOOK_RETRY_DELAYS_MS[2]);
    assert.equal(computeWebhookRetryDelayMs(99), WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1]);
  });

  test('normalizes IPv4/IPv6-mapped addresses and enforces server API IP allowlists strictly', () => {
    assert.equal(normalizeIp('::ffff:147.93.102.45'), '147.93.102.45');
    assert.equal(normalizeIp('147.93.102.45:54321'), '147.93.102.45');

    const cleaned = sanitizeIpAllowlist('147.93.102.45, invalid-host, ::ffff:203.0.113.10, 147.93.102.45');
    assert.deepEqual(cleaned, ['147.93.102.45', '203.0.113.10']);

    assert.equal(isIpAllowlisted('8.8.8.8', []), true);
    assert.equal(isIpAllowlisted('::ffff:147.93.102.45', cleaned), true);
    assert.equal(isIpAllowlisted('198.51.100.2', cleaned), false);
    assert.equal(isIpAllowlisted('', cleaned), false);
  });

  test('applies Payment Link coupons cleanly while keeping minimum payable >= ₹1.00', () => {
    const coupons = [
      { code: 'FLAT100', discountType: 'FLAT' as const, discountValue: 100, isActive: true },
      { code: 'HALF50', discountType: 'PERCENT' as const, discountValue: 50, isActive: true },
      { code: 'OLD', discountType: 'FLAT' as const, discountValue: 200, isActive: false },
    ];

    const flat = applyPaymentLinkCoupon(499, coupons, 'flat100');
    assert.equal(flat.appliedCouponCode, 'FLAT100');
    assert.equal(flat.discountInr, 100);
    assert.equal(flat.finalInr, 399);

    const pct = applyPaymentLinkCoupon(500, coupons, 'HALF50');
    assert.equal(pct.appliedCouponCode, 'HALF50');
    assert.equal(pct.discountInr, 250);
    assert.equal(pct.finalInr, 250);

    // Enforces UPI transfer ₹1 floor when flat discount >= subtotal
    const floored = applyPaymentLinkCoupon(50, coupons, 'FLAT100');
    assert.equal(floored.finalInr, 1);
    assert.equal(floored.discountInr, 49);

    // Ignores disabled coupons
    const inactive = applyPaymentLinkCoupon(500, coupons, 'OLD');
    assert.equal(inactive.appliedCouponCode, '');
    assert.equal(inactive.finalInr, 500);
  });

  test('computes SaaS customer entitlement renewals preserving remaining active balance', () => {
    const now = new Date('2026-11-27T00:00:00Z');
    const futureEnd = new Date('2026-12-07T00:00:00Z');

    const extended = computeEntitlementRenewalExpiry({
      now,
      currentStatus: 'ACTIVE',
      currentExpiresAt: futureEnd,
      durationDays: 30,
    });
    assert.equal(extended.toISOString(), new Date('2027-01-06T00:00:00Z').toISOString());

    const restarted = computeEntitlementRenewalExpiry({
      now,
      currentStatus: 'TRIAL',
      currentExpiresAt: futureEnd,
      durationDays: 30,
    });
    assert.equal(restarted.toISOString(), new Date('2026-12-27T00:00:00Z').toISOString());

    const expiredSummary = formatEntitlementSummary(
      {
        status: 'ACTIVE',
        planCode: 'LAB_MONTHLY',
        planName: 'Lab Pro',
        expiresAt: new Date('2026-11-20T00:00:00Z'),
      } as any,
      now
    );
    assert.equal(expiredSummary.active, false);
    assert.equal(expiredSummary.status, 'EXPIRED');
    assert.equal(expiredSummary.daysRemaining, 0);
  });

  test('validates Telegram bot formats and enforces Offline Listener Shield accurately', async () => {
    assert.equal(isValidTelegramBotToken('123456789:AAHbcdefghijklmnopqrstuvwxyz1234'), true);
    assert.equal(isValidTelegramBotToken('bad-token'), false);
    assert.equal(isValidTelegramChatId('987654321'), true);
    assert.equal(isValidTelegramChatId('-1001234567890'), true);
    assert.equal(isValidTelegramChatId('@sumio_alerts'), true);
    assert.equal(isValidTelegramChatId('invalid chat!'), false);

    // Test orders always allowed even when Offline Shield is active
    const testOrderRes = await checkMerchantListenerAvailability(
      { _id: 'm1', reliabilitySettings: { pauseCheckoutWhenOffline: true } } as any,
      true
    );
    assert.equal(testOrderRes.allowed, true);

    // Live order blocked when shield enabled and 0 devices online
    const originalCount = Device.countDocuments;
    (Device as any).countDocuments = async () => 0;
    try {
      const blocked = await checkMerchantListenerAvailability(
        { _id: 'm1', reliabilitySettings: { pauseCheckoutWhenOffline: true } } as any,
        false
      );
      assert.equal(blocked.allowed, false);
      assert.equal(blocked.onlineCount, 0);
    } finally {
      (Device as any).countDocuments = originalCount;
    }
  });

  test('exports valid PaymentLink, SaasPlan, and CustomerEntitlement Mongoose schemas', () => {
    assert.ok(PaymentLink.schema.path('slug'));
    assert.ok(SaasPlan.schema.path('planCode'));
    assert.ok(CustomerEntitlement.schema.path('customerUserId'));
  });
});

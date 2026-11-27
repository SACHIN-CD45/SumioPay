import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSubscriptionPlanCatalog,
  resolvePlanDetails,
  computeTrialPeriodEnd,
  computeExtendedPeriodEnd,
  evaluateSubscriptionEntitlement,
  activatePlatformSubscriptionFromOrder,
  PLATFORM_SUBSCRIPTION_METADATA_TYPE,
} from '../src/services/subscriptionActivation.service';
import { AuditLog } from '../src/models/auditLog.model';

describe('SumioPay SaaS Subscription Plans & Self-Billing Logic', () => {
  test('returns default 3-day trial, ₹399 monthly, ₹1999 6-month, and custom all-features catalog', () => {
    const catalog = getSubscriptionPlanCatalog(undefined);
    assert.equal(catalog.trialDays, 3);
    assert.equal(catalog.monthlyPrice, 399);
    assert.equal(catalog.monthlyDurationDays, 30);
    assert.equal(catalog.halfYearlyPrice, 1999);
    assert.equal(catalog.halfYearlyDurationDays, 180);
    assert.equal(catalog.customPrice, 0);
  });

  test('respects SuperAdmin overrides for trial days and plan pricing', () => {
    const catalog = getSubscriptionPlanCatalog({
      subscriptionPlans: {
        trialDays: 7,
        monthlyPrice: 499,
        monthlyDurationDays: 30,
        monthlyDeviceLimit: 3,
        monthlyDescription: 'Custom monthly',
        halfYearlyPrice: 2499,
        halfYearlyDurationDays: 180,
        halfYearlyDeviceLimit: 8,
        halfYearlyDescription: 'Custom 6m',
        customPrice: 9999,
        customLabel: 'Enterprise All Features',
        customDescription: 'All unlocked',
      },
    });

    assert.equal(catalog.trialDays, 7);
    assert.equal(catalog.monthlyPrice, 499);
    assert.equal(catalog.halfYearlyPrice, 2499);
    assert.equal(catalog.customPrice, 9999);
  });

  test('resolves planKey inputs accurately and rejects unknown tiers', () => {
    const catalog = getSubscriptionPlanCatalog(undefined);

    const monthly = resolvePlanDetails('MONTHLY', catalog);
    assert.ok(monthly);
    assert.equal(monthly.planTier, 'MONTHLY');
    assert.equal(monthly.priceInr, 399);
    assert.equal(monthly.durationDays, 30);

    const halfYearly = resolvePlanDetails('HALF_YEARLY', catalog);
    assert.ok(halfYearly);
    assert.equal(halfYearly.planTier, 'HALF_YEARLY');
    assert.equal(halfYearly.priceInr, 1999);
    assert.equal(halfYearly.durationDays, 180);

    const custom = resolvePlanDetails('CUSTOM', catalog);
    assert.ok(custom);
    assert.equal(custom.planTier, 'CUSTOM');
    assert.equal(custom.priceInr, 0);

    assert.equal(resolvePlanDetails('INVALID_TIER', catalog), null);
  });

  test('computes exact 3-day free trial end timestamp', () => {
    const anchor = new Date('2026-11-26T00:00:00.000Z');
    const trialEnd = computeTrialPeriodEnd(3, anchor);
    assert.equal(trialEnd.toISOString(), '2026-11-29T00:00:00.000Z');
  });

  test('extends from now when on trial/expired, and preserves remaining days on active renewal', () => {
    const now = new Date('2026-11-26T00:00:00.000Z');
    const trialAnchor = new Date('2026-11-29T00:00:00.000Z');

    // Upgrading while on TRIAL starts 30 days from payment time
    const fromTrial = computeExtendedPeriodEnd(trialAnchor, 'TRIAL', 30, now);
    assert.equal(fromTrial.toISOString(), '2026-12-26T00:00:00.000Z');

    // Early renewal while ACTIVE preserves remaining 10 days
    const futureActiveEnd = new Date('2026-12-06T00:00:00.000Z');
    const fromActive = computeExtendedPeriodEnd(futureActiveEnd, 'ACTIVE', 30, now);
    assert.equal(fromActive.toISOString(), '2027-01-05T00:00:00.000Z');
  });

  test('refuses auto-activation for test-mode, pending, or non-platform orders', async () => {
    const nonPlatform = await activatePlatformSubscriptionFromOrder({
      orderId: 'ORD-1',
      status: 'PAID',
      isTest: false,
      metadata: { type: 'CUSTOMER_ORDER' },
    });
    assert.equal(nonPlatform.activated, false);

    const testModeSub = await activatePlatformSubscriptionFromOrder({
      orderId: 'SUB-TEST',
      status: 'PAID',
      isTest: true,
      metadata: {
        type: PLATFORM_SUBSCRIPTION_METADATA_TYPE,
        subscriberMerchantId: 'm1',
      },
    });
    assert.equal(testModeSub.activated, false);

    const unpaidSub = await activatePlatformSubscriptionFromOrder({
      orderId: 'SUB-PENDING',
      status: 'PENDING',
      isTest: false,
      metadata: {
        type: PLATFORM_SUBSCRIPTION_METADATA_TYPE,
        subscriberMerchantId: 'm1',
      },
    });
    assert.equal(unpaidSub.activated, false);
  });

  test('AuditLog schema accepts SUPERADMIN and MERCHANT actorType values', async () => {
    const superAdminAudit = new AuditLog({
      actorType: 'SUPERADMIN',
      actorEmail: 'admin@sumiotech.in',
      action: 'PLATFORM_SETTINGS_UPDATED',
      resourceType: 'PLATFORM',
    });
    await superAdminAudit.validate();

    const merchantAudit = new AuditLog({
      actorType: 'MERCHANT',
      actorEmail: 'merchant@sumiotech.in',
      action: 'PAYMENT_MANUALLY_RECONCILED',
      resourceType: 'ORDER',
    });
    await merchantAudit.validate();
  });

  test('enforces strict lockout when 3-day free trial or paid plan expires (except Platform Collector)', () => {
    const now = new Date('2026-11-30T00:00:00.000Z');

    // 1. Active 3-day free trial (1 day remaining)
    const activeTrial = evaluateSubscriptionEntitlement({
      status: 'TRIAL',
      planTier: 'TRIAL',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      isCollector: false,
      now,
    });
    assert.equal(activeTrial.isEntitled, true);
    assert.equal(activeTrial.isExpired, false);
    assert.equal(activeTrial.daysRemaining, 1);

    // 2. Expired 3-day free trial -> LOCKED
    const expiredTrial = evaluateSubscriptionEntitlement({
      status: 'TRIAL',
      planTier: 'TRIAL',
      currentPeriodEnd: '2026-11-29T00:00:00.000Z',
      isCollector: false,
      now,
    });
    assert.equal(expiredTrial.isEntitled, false);
    assert.equal(expiredTrial.isExpired, true);
    assert.equal(expiredTrial.daysRemaining, 0);

    // 3. Expired paid plan or CANCELLED / PAST_DUE -> LOCKED
    const cancelledSub = evaluateSubscriptionEntitlement({
      status: 'CANCELLED',
      planTier: 'MONTHLY',
      currentPeriodEnd: '2026-12-10T00:00:00.000Z',
      isCollector: false,
      now,
    });
    assert.equal(cancelledSub.isEntitled, false);
    assert.equal(cancelledSub.isExpired, true);

    // 4. Paid ACTIVE subscription -> UNLOCKED
    const activePaid = evaluateSubscriptionEntitlement({
      status: 'ACTIVE',
      planTier: 'MONTHLY',
      currentPeriodEnd: '2026-12-30T00:00:00.000Z',
      isCollector: false,
      now,
    });
    assert.equal(activePaid.isEntitled, true);
    assert.equal(activePaid.isExpired, false);

    // 5. Platform Collector merchant exempt so self-billing renewal always works
    const collector = evaluateSubscriptionEntitlement({
      status: 'TRIAL',
      planTier: 'CUSTOM',
      currentPeriodEnd: '2025-01-01T00:00:00.000Z',
      isCollector: true,
      now,
    });
    assert.equal(collector.isEntitled, true);
    assert.equal(collector.isExpired, false);
    assert.equal(collector.isCollector, true);
  });
});

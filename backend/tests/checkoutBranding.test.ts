import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeBrandColor,
  sanitizeSafeUrl,
  normalizeBillDetails,
  resolveCheckoutBaseRupees,
  buildCheckoutBranding,
} from '../src/utils/checkoutBranding';

describe('Checkout Website Branding & Bill/Coupon Summary Helpers', () => {
  it('sanitizes hex brandColor and rejects unsafe style strings', () => {
    assert.equal(sanitizeBrandColor('#3B38F5'), '#3B38F5');
    assert.equal(sanitizeBrandColor('  #0f766e  '), '#0f766e');
    assert.equal(sanitizeBrandColor('red; background:url(x)'), '#4F3DF5');
    assert.equal(sanitizeBrandColor(undefined), '#4F3DF5');
  });

  it('sanitizes logo/return URLs to allow http(s)/relative only and block javascript: URIs', () => {
    assert.equal(sanitizeSafeUrl('https://hostinger.in/logo.png'), 'https://hostinger.in/logo.png');
    assert.equal(sanitizeSafeUrl('/billing/done'), '/billing/done');
    assert.equal(sanitizeSafeUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>'), '');
  });

  it('normalizes itemized bills, coupon discounts, and computes final payable amount accurately in integer paise', () => {
    const bill = normalizeBillDetails({
      items: [
        { label: 'Web Hosting Premium', quantity: 1, amount: 3000 },
        { label: 'Domain Privacy', quantity: 1, amount: 499 },
      ],
      couponCode: 'host20',
      discountAmount: 681.16,
      taxAmount: 0,
      note: 'To begin your subscription, ₹2,817.84 will be charged now.',
      returnUrl: 'https://example.com/checkout/complete',
    });

    assert.ok(bill);
    assert.equal(bill.subtotal, 3499);
    assert.equal(bill.couponCode, 'HOST20');
    assert.equal(bill.discountAmount, 681.16);
    assert.equal(resolveCheckoutBaseRupees(undefined, bill), 2817.84);
  });

  it('prefers explicit positive baseAmount while rejecting non-positive totals', () => {
    const bill = normalizeBillDetails({
      subtotal: 500,
      couponCode: 'FREE100',
      discountAmount: 500,
    });

    assert.equal(resolveCheckoutBaseRupees(undefined, bill), null);
    assert.equal(resolveCheckoutBaseRupees(199, bill), 199);
  });

  it('builds checkout trust & website branding with safe KYC and fallback chain', () => {
    const branded = buildCheckoutBranding({
      orderMeta: {
        websiteName: 'Hostinger India',
        brandColor: '#5B3DF5',
      },
      merchant: {
        businessName: 'Fallback Corp',
        websiteLogoUrl: 'https://cdn.example.com/logo.png',
        isActive: true,
      },
      kycStatus: 'VERIFIED',
      fallbackAppName: 'WEBSTORE',
    });

    assert.equal(branded.websiteName, 'Hostinger India');
    assert.equal(branded.websiteLogoUrl, 'https://cdn.example.com/logo.png');
    assert.equal(branded.brandColor, '#5B3DF5');
    assert.equal(branded.trustedBusiness, true);
    assert.equal(branded.kycVerified, true);
    assert.equal(branded.trustLabel, 'SumioPay Trusted Business');
  });
});

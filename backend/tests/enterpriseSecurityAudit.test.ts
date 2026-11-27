import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Order } from '../src/models/order.model';
import { requireServerApiAuth } from '../src/middleware/apiKey.middleware';
import { renderPaymentReceiptEmail } from '../src/services/email.service';

describe('Enterprise Multi-Tenant Auth, Data Retention & SumioPay Bill', () => {
  it('OrderSchema never attaches a destructive expireAfterSeconds TTL index on expiresAt', () => {
    const indexes = Order.schema.indexes();
    const expiresTtlIndex = indexes.find(
      ([fields, opts]) => Boolean((fields as any)?.expiresAt) && typeof (opts as any)?.expireAfterSeconds === 'number'
    );
    assert.equal(expiresTtlIndex, undefined);
  });

  it('requireServerApiAuth blocks bare publishable browser keys (API_KEY_ONLY) from privileged operations', () => {
    const middleware = requireServerApiAuth('orders:read');
    let nextCalled = false;
    let statusCode = 200;
    let jsonBody: any = null;

    const fakeReq: any = {
      merchant: { _id: 'm_1' },
      authMethod: 'API_KEY_ONLY',
    };
    const fakeRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
      },
    };

    middleware(fakeReq, fakeRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
    assert.equal(jsonBody?.error?.code, 'API_SECRET_REQUIRED');
  });

  it('requireServerApiAuth allows API_KEY_SECRET and enforces permissions on SCOPED_KEY', () => {
    const refundGuard = requireServerApiAuth('refunds:create');

    // 1. Server API_KEY_SECRET allowed
    let allowedSecret = false;
    refundGuard(
      { merchant: { _id: 'm_1' }, authMethod: 'API_KEY_SECRET' } as any,
      {} as any,
      () => {
        allowedSecret = true;
      }
    );
    assert.equal(allowedSecret, true);

    // 2. Scoped key missing refunds:create blocked cleanly with 403
    let scopedStatus = 200;
    let scopedBody: any = null;
    let allowedScoped = false;
    refundGuard(
      { merchant: { _id: 'm_1' }, authMethod: 'SCOPED_KEY', apiKeyPermissions: ['orders:read'] } as any,
      {
        status(code: number) {
          scopedStatus = code;
          return this;
        },
        json(body: any) {
          scopedBody = body;
        },
      } as any,
      () => {
        allowedScoped = true;
      }
    );
    assert.equal(allowedScoped, false);
    assert.equal(scopedStatus, 403);
    assert.equal(scopedBody?.error?.code, 'INSUFFICIENT_SCOPE');
  });

  it('renders clean SumioPay Enterprise Bill HTML with itemized breakdown, XSS escaping, and zero backend paise leaks', () => {
    const { subject, html } = renderPaymentReceiptEmail({
      recipientName: 'Amit <script>alert(1)</script>',
      orderId: 'ORD-20261127-A1B2C3',
      amount: 2817,
      exactAmount: 2817.84,
      paiseOffset: 0.84,
      utr: '432109876543',
      merchantBusinessName: 'Hostinger India',
      websiteName: 'Hostinger',
      websiteUrl: 'javascript:alert(1)',
      planOrItemName: 'Cloud Pro (12 Mo)',
      paymentMethodLabel: 'PHONEPE',
      paymentDate: '27 Nov 2026, 10:30 AM',
      billDetails: {
        items: [{ label: 'Cloud Pro (12 Months)', quantity: 1, amount: 3499 }],
        subtotal: 3499,
        couponCode: 'HOST20',
        discountAmount: 681.16,
      },
      recipientRole: 'CUSTOMER',
    });

    assert.equal(subject.includes('Hostinger'), true);
    assert.equal(html.includes('BILL-ORD-20261127-A1B2C3'), true);
    assert.equal(html.includes('Discount (HOST20)'), true);
    assert.equal(html.includes('2,817.84'), true);
    assert.equal(html.includes('PhonePe UPI'), true);

    // Zero backend mechanism leaks
    assert.equal(html.toLowerCase().includes('collision lock'), false);
    assert.equal(html.toLowerCase().includes('telemetry'), false);
    assert.equal(html.includes('+₹0.84'), false);

    // XSS & unsafe URI protection
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.equal(html.includes('javascript:alert(1)'), false);
  });
});

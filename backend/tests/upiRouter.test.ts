import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferBankFromUpiHandle,
  isValidUpiVpa,
  parseUpiQrString,
  selectUpiForOrderPure,
  getIstDateKey,
} from '../src/services/upiRouter.service';

describe('Multi-UPI Routing & Bank QR Parsing Engine', () => {
  test('validates Indian UPI VPAs and infers bank handles accurately', () => {
    assert.equal(isValidUpiVpa('shop@okhdfcbank'), true);
    assert.equal(isValidUpiVpa('9876543210@ybl'), true);
    assert.equal(isValidUpiVpa('invalid-vpa'), false);

    assert.equal(inferBankFromUpiHandle('sumio@okhdfcbank'), 'HDFC Bank');
    assert.equal(inferBankFromUpiHandle('store@ybl'), 'PhonePe (Yes Bank)');
    assert.equal(inferBankFromUpiHandle('biz@paytm'), 'Paytm UPI');
  });

  test('parses scanned/uploaded upi://pay QR URI payloads cleanly', () => {
    const parsed = parseUpiQrString(
      'upi://pay?pa=sumiotech@okicici&pn=Sumio%20Tech&cu=INR&mc=5411'
    );
    assert.ok(parsed);
    assert.equal(parsed.upiId, 'sumiotech@okicici');
    assert.equal(parsed.upiName, 'Sumio Tech');
    assert.equal(parsed.bankName, 'ICICI Bank');

    assert.equal(parseUpiQrString('https://example.com/not-upi'), null);
  });

  test('routes PRIMARY_ONLY, ROUND_ROBIN, and daily-limit FAILOVER cleanly', () => {
    const now = new Date('2026-11-26T10:00:00.000Z');
    const todayIst = getIstDateKey(now);

    const accounts: any = [
      {
        id: 'upi_1',
        label: 'Primary HDFC',
        upiId: 'primary@okhdfcbank',
        upiName: 'Store HDFC',
        isActive: true,
        isPrimary: true,
        dailyLimitInr: 50000,
        todayVolumeInr: 50000, // hit daily limit
        todayVolumeDate: todayIst,
        totalVolumeInr: 50000,
        totalTransactions: 10,
      },
      {
        id: 'upi_2',
        label: 'Backup SBI',
        upiId: 'backup@oksbi',
        upiName: 'Store SBI',
        isActive: true,
        isPrimary: false,
        dailyLimitInr: 100000,
        todayVolumeInr: 1000,
        todayVolumeDate: todayIst,
        totalVolumeInr: 1000,
        totalTransactions: 1,
      },
    ];

    // FAILOVER avoids primary once daily limit is hit and switches to Backup SBI
    const failoverPick = selectUpiForOrderPure(
      { upiRoutingMode: 'FAILOVER', upiAccounts: accounts },
      now
    );
    assert.equal(failoverPick.upiId, 'backup@oksbi');

    // ROUND_ROBIN distributes across eligible accounts when primary has headroom
    accounts[0].todayVolumeInr = 1000;
    const rr0 = selectUpiForOrderPure(
      { upiRoutingMode: 'ROUND_ROBIN', upiRotationIndex: 0, upiAccounts: accounts },
      now
    );
    const rr1 = selectUpiForOrderPure(
      { upiRoutingMode: 'ROUND_ROBIN', upiRotationIndex: 1, upiAccounts: accounts },
      now
    );
    assert.equal(rr0.upiId, 'primary@okhdfcbank');
    assert.equal(rr1.upiId, 'backup@oksbi');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseBankNotification } from '../src/utils/bankNotificationParser';

describe('Bank SMS & UPI Push Notification Parser Engine', () => {

  it('correctly parses SBI Bank incoming credit SMS', () => {
    const rawSms = 'Dear SBI User, your A/c XX1234 has been credited by Rs 500.14 on 25Nov26 by UPI/412345678901 - State Bank of India';
    const parsed = parseBankNotification(rawSms, 'bank.sms.AD-SBIUPI');

    assert.strictEqual(parsed.isPaymentAlert, true);
    assert.strictEqual(parsed.amount, 500.14);
    assert.strictEqual(parsed.utr, '412345678901');
    assert.strictEqual(parsed.appName, 'SBI_BANK');
  });

  it('correctly parses HDFC Bank credit SMS with sender name', () => {
    const rawSms = 'Update: INR 1,499.28 credited to HDFC Bank A/c XX5678 on 25-NOV-26 by UPI Ref 498765432109 from Amit Sharma';
    const parsed = parseBankNotification(rawSms, 'bank.sms.VK-HDFCBK');

    assert.strictEqual(parsed.isPaymentAlert, true);
    assert.strictEqual(parsed.amount, 1499.28);
    assert.strictEqual(parsed.utr, '498765432109');
    assert.strictEqual(parsed.senderName, 'Amit Sharma');
    assert.strictEqual(parsed.appName, 'HDFC_BANK');
  });

  it('correctly parses ICICI Bank credit SMS', () => {
    const rawSms = 'Dear Customer, A/c XX9012 credited with Rs 250.05 on 25-Nov-26. Info: UPI/487654321098. ICICI Bank';
    const parsed = parseBankNotification(rawSms, 'bank.sms.ICICI');

    assert.strictEqual(parsed.isPaymentAlert, true);
    assert.strictEqual(parsed.amount, 250.05);
    assert.strictEqual(parsed.utr, '487654321098');
    assert.strictEqual(parsed.appName, 'ICICI_BANK');
  });

  it('correctly parses PhonePe push notification', () => {
    const notif = 'Received ₹ 999.42 from Rahul via PhonePe. UPI Ref: 456789123456';
    const parsed = parseBankNotification(notif, 'com.phonepe.app');

    assert.strictEqual(parsed.isPaymentAlert, true);
    assert.strictEqual(parsed.amount, 999.42);
    assert.strictEqual(parsed.utr, '456789123456');
    assert.strictEqual(parsed.appName, 'PHONEPE');
  });

  it('correctly parses Google Pay push notification', () => {
    const notif = 'You received ₹ 750.19 from Priya on Google Pay. UPI transaction ID: 498123765412';
    const parsed = parseBankNotification(notif, 'com.google.android.apps.nbu.paisa.user');

    assert.strictEqual(parsed.isPaymentAlert, true);
    assert.strictEqual(parsed.amount, 750.19);
    assert.strictEqual(parsed.utr, '498123765412');
    assert.strictEqual(parsed.appName, 'GPAY');
  });

  it('ignores debit alerts and non-payment OTP SMS messages', () => {
    const debitSms = 'A/c XX1234 debited by Rs 200.00 on 25Nov26. Avail Bal Rs 5,420.00';
    const parsedDebit = parseBankNotification(debitSms, 'bank.sms');
    assert.strictEqual(parsedDebit.isPaymentAlert, false);

    const otpSms = 'Your OTP for netbanking login is 482910. Do not share with anyone.';
    const parsedOtp = parseBankNotification(otpSms, 'bank.sms');
    assert.strictEqual(parsedOtp.isPaymentAlert, false);
  });

  it('extracts readable UPI package names and SBI slash sender names', () => {
    const gpayNoBrandText = 'Ramesh Kumar paid you ₹499.42. UPI transaction ID 432109876543.';
    const parsedGpay = parseBankNotification(gpayNoBrandText, 'com.google.android.apps.nbu.paisa.user');
    assert.strictEqual(parsedGpay.isPaymentAlert, true);
    assert.strictEqual(parsedGpay.appName, 'GOOGLE_PAY');
    assert.strictEqual(parsedGpay.senderName, 'Ramesh Kumar');

    const sbiP2aSms = 'Your a/c no. XX4321 is credited by Rs.299.18 on 26-11-26 by UPI/P2A/432109876543/Vikram Singh (SBI)';
    const parsedSbi = parseBankNotification(sbiP2aSms, 'com.google.android.apps.messaging');
    assert.strictEqual(parsedSbi.isPaymentAlert, true);
    assert.strictEqual(parsedSbi.appName, 'SBI_BANK');
    assert.strictEqual(parsedSbi.utr, '432109876543');
    assert.strictEqual(parsedSbi.senderName, 'Vikram Singh');
  });

  it('rejects outgoing debits containing "credited to" and collect requests', () => {
    const outgoingDebitWithCredited =
      'Dear UPI user A/C X1234 debited by Rs.500.44 on 27Nov26 transfer to VPA merchant@okaxis credited. Ref 412345678902';
    const parsedOut = parseBankNotification(outgoingDebitWithCredited, 'bank.sms.SBI');
    assert.strictEqual(parsedOut.isPaymentAlert, false);

    const paidToAlert = 'You paid Rs.399.12 to Merchant Store via PhonePe. Ref: 498765432111';
    const parsedPaidTo = parseBankNotification(paidToAlert, 'com.phonepe.app');
    assert.strictEqual(parsedPaidTo.isPaymentAlert, false);

    const collectRequest = 'Ramesh sent a collect request for payment of Rs.399.44 on Google Pay.';
    const parsedCollect = parseBankNotification(collectRequest, 'com.google.android.apps.nbu.paisa.user');
    assert.strictEqual(parsedCollect.isPaymentAlert, false);
  });
});

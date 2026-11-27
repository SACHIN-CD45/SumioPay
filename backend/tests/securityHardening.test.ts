import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  generateNumericOtp,
  getClientIp,
  isPrivateOrReservedIp,
  timingSafeEqualStr,
  validateSafeWebhookUrl,
} from '../src/utils/securityGuards';

describe('Senior Security Guards & Anti-SSRF / OTP Hardening', () => {
  it('generates 6-digit CSPRNG OTPs within valid numeric range', () => {
    for (let i = 0; i < 25; i++) {
      const otp = generateNumericOtp(6);
      assert.match(otp, /^\d{6}$/);
      const num = Number(otp);
      assert.ok(num >= 100000 && num <= 999999);
    }
  });

  it('performs constant-time secret and OTP comparison accurately', () => {
    assert.equal(timingSafeEqualStr('sp_sec_abc123', 'sp_sec_abc123'), true);
    assert.equal(timingSafeEqualStr('sp_sec_abc123', 'sp_sec_abc124'), false);
    assert.equal(timingSafeEqualStr('123456', '12345'), false);
  });

  it('blocks localhost, cloud metadata, and RFC1918 private networks to prevent SSRF', () => {
    const blockedUrls = [
      'http://127.0.0.1:27017/leak',
      'http://localhost:8090/internal',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.12/admin',
      'http://192.168.1.50/hook',
      'http://172.16.0.10/hook',
      'http://[::1]:8080/test',
      'http://[0:0:0:0:0:0:0:1]:8080/test',
      'http://[::ffff:127.0.0.1]/test',
      'http://[::ffff:a9fe:a9fe]/latest/meta-data/',
      'https://user:pass@example.com/webhook',
      'ftp://example.com/file',
      'http://internal-db.internal/hook',
    ];

    for (const url of blockedUrls) {
      const check = validateSafeWebhookUrl(url);
      assert.equal(check.valid, false, `Expected SSRF URL to be rejected: ${url}`);
    }

    assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
  });

  it('accepts valid public HTTPS webhook URLs and empty values', () => {
    assert.deepEqual(validateSafeWebhookUrl(''), { valid: true, url: '' });
    assert.deepEqual(validateSafeWebhookUrl('https://sumiolab.in/api/webhooks/sumiopay'), {
      valid: true,
      url: 'https://sumiolab.in/api/webhooks/sumiopay',
    });
  });

  it('neutralizes CSV spreadsheet formula injection characters cleanly', () => {
    assert.equal(escapeCsvCell('=CMD|"/C calc"!A0'), `"'=CMD|""/C calc""!A0"`);
    assert.equal(escapeCsvCell('+1234'), "'+1234");
    assert.equal(escapeCsvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)");
    assert.equal(escapeCsvCell('ORD-2026-9912'), 'ORD-2026-9912');
  });

  it('extracts originating client IP behind trusted Nginx proxy headers', () => {
    assert.equal(
      getClientIp({ 'x-forwarded-for': '203.0.113.45, 10.0.0.2' }, '127.0.0.1'),
      '203.0.113.45'
    );
    assert.equal(getClientIp({}, '::ffff:198.51.100.1'), '::ffff:198.51.100.1');
  });
});

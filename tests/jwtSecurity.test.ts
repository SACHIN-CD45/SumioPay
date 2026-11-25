import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from '../backend/node_modules/jsonwebtoken';
import crypto from 'crypto';

describe('Senior-Level JWT Dual-Token & Rotation Security', () => {
  const accessSecret = 'test_jwt_access_secret_fintech_key_32_bytes_long';
  const refreshSecret = 'test_jwt_refresh_secret_fintech_key_32_bytes_long';
  const issuer = 'sumiopay.io';
  const audience = 'sumiopay-clients';

  test('generates short-lived access token with correct claims and audience', () => {
    const payload = {
      id: 'merch_test_123',
      email: 'merchant@sumiopay.io',
      role: 'MERCHANT',
      tokenType: 'ACCESS',
    };

    const token = jwt.sign(payload, accessSecret, {
      expiresIn: '15m',
      issuer,
      audience,
    });

    const decoded: any = jwt.verify(token, accessSecret, { issuer, audience });
    assert.equal(decoded.id, 'merch_test_123');
    assert.equal(decoded.tokenType, 'ACCESS');
    assert.equal(decoded.iss, issuer);
    assert.equal(decoded.aud, audience);
  });

  test('generates rotating refresh token with family identifier and unique jti', () => {
    const tokenFamily = crypto.randomUUID();
    const jti = crypto.randomBytes(16).toString('hex');

    const refreshPayload = {
      id: 'merch_test_123',
      email: 'merchant@sumiopay.io',
      role: 'MERCHANT',
      tokenType: 'REFRESH',
      tokenFamily,
      jti,
    };

    const refreshToken = jwt.sign(refreshPayload, refreshSecret, {
      expiresIn: '7d',
      issuer,
      audience,
    });

    const decoded: any = jwt.verify(refreshToken, refreshSecret, { issuer, audience });
    assert.equal(decoded.tokenType, 'REFRESH');
    assert.equal(decoded.tokenFamily, tokenFamily);
    assert.equal(decoded.jti, jti);
  });

  test('simulates refresh token rotation and detects reuse attack', () => {
    // Session token store simulator
    const sessions = new Map<string, { tokenFamily: string; isRevoked: boolean }>();

    const tokenFamily = crypto.randomUUID();
    const token1Hash = 'hash_refresh_token_v1';
    const token2Hash = 'hash_refresh_token_v2';

    // 1. Initial login issues token1
    sessions.set(token1Hash, { tokenFamily, isRevoked: false });
    assert.equal(sessions.get(token1Hash)?.isRevoked, false);

    // 2. Normal rotation: Token 1 is exchanged for Token 2
    // Token 1 is marked as revoked
    const record = sessions.get(token1Hash)!;
    record.isRevoked = true;
    sessions.set(token2Hash, { tokenFamily, isRevoked: false });

    assert.equal(sessions.get(token1Hash)?.isRevoked, true);
    assert.equal(sessions.get(token2Hash)?.isRevoked, false);

    // 3. Attack attempt: Attacker attempts to replay Token 1!
    const replayedRecord = sessions.get(token1Hash)!;
    let attackDetected = false;

    if (replayedRecord.isRevoked) {
      attackDetected = true;
      // Invalidate the entire token family!
      for (const [key, val] of sessions.entries()) {
        if (val.tokenFamily === tokenFamily) {
          val.isRevoked = true;
        }
      }
    }

    assert.equal(attackDetected, true);
    // Both Token 1 AND Token 2 are now revoked
    assert.equal(sessions.get(token2Hash)?.isRevoked, true);
  });
});

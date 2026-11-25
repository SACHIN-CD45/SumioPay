import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { RefreshToken } from '../models/refreshToken.model';
import { SecurityEvent } from '../models/securityEvent.model';
import { config } from '../config';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  merchantId?: string;
  tokenType: 'ACCESS' | 'REFRESH';
  tokenFamily?: string;
  jti?: string;
}

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // in seconds
}

export class JwtService {
  /**
   * Hashes raw refresh token with SHA-256 before database storage
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a secure Access Token + Rotating Refresh Token pair
   */
  public static async generateTokenPair(params: {
    id: string;
    email: string;
    role: string;
    merchantId?: string;
    tokenFamily?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<TokenPairResult> {
    const { id, email, role, merchantId, ipAddress = '', userAgent = '' } = params;
    const tokenFamily = params.tokenFamily || crypto.randomUUID();
    const jti = crypto.randomBytes(16).toString('hex');

    // 1. Generate Access Token (Short-Lived: 15 minutes)
    const accessPayload: TokenPayload = {
      id,
      email,
      role,
      merchantId,
      tokenType: 'ACCESS',
    };

    const accessToken = jwt.sign(accessPayload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    // 2. Generate Refresh Token (Longer-Lived: 7 days)
    const refreshPayload: TokenPayload = {
      id,
      email,
      role,
      merchantId,
      tokenType: 'REFRESH',
      tokenFamily,
      jti,
    };

    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    // 3. Persist Hashed Refresh Token in DB for Rotation & Revocation
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      merchantId: merchantId ? new mongoose.Types.ObjectId(merchantId) : undefined,
      userId: !merchantId ? new mongoose.Types.ObjectId(id) : undefined,
      tokenHash,
      tokenFamily,
      isRevoked: false,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 900 seconds
    };
  }

  /**
   * Rotates a Refresh Token with Automatic Reuse Detection (RFC 6749 / RFC 6819)
   */
  public static async rotateRefreshToken(params: {
    rawRefreshToken: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<TokenPairResult> {
    const { rawRefreshToken, ipAddress = '', userAgent = '' } = params;

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(rawRefreshToken, config.jwt.refreshSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as TokenPayload;
    } catch (err: any) {
      throw new Error(`Invalid or expired refresh token: ${err.message}`);
    }

    if (decoded.tokenType !== 'REFRESH') {
      throw new Error('Invalid token type provided for refresh flow');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingDoc = await RefreshToken.findOne({ tokenHash });

    if (!existingDoc) {
      throw new Error('Refresh token not found or already purged');
    }

    // AUTOMATIC REUSE DETECTION:
    // If a token that was already marked revoked is presented again,
    // this indicates a token replay / session hijacking attack!
    if (existingDoc.isRevoked) {
      // Invalidate the ENTIRE token family immediately
      await RefreshToken.updateMany(
        { tokenFamily: existingDoc.tokenFamily },
        { isRevoked: true, revokedAt: new Date(), revokedReason: 'TOKEN_REUSE_DETECTED_BREACH' }
      );

      // Log Security Alert
      await SecurityEvent.create({
        merchantId: existingDoc.merchantId,
        eventType: 'SUSPICIOUS_VELOCITY',
        severity: 'CRITICAL',
        description: `Security Breach Warning: Replayed refresh token detected for family ${existingDoc.tokenFamily}. Entire session family terminated.`,
        ipAddress,
        userAgent,
      });

      throw new Error('Security Alert: Refresh token reuse detected. All sessions in this chain have been revoked.');
    }

    // Revoke current token upon rotation
    const newPair = await this.generateTokenPair({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      merchantId: decoded.merchantId,
      tokenFamily: existingDoc.tokenFamily, // Maintain same family
      ipAddress,
      userAgent,
    });

    existingDoc.isRevoked = true;
    existingDoc.revokedAt = new Date();
    existingDoc.revokedReason = 'ROTATED';
    existingDoc.replacedByTokenHash = this.hashToken(newPair.refreshToken);
    await existingDoc.save();

    return newPair;
  }

  /**
   * Explicit Single-Session Revocation (Logout)
   */
  public static async revokeSession(rawRefreshToken: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(rawRefreshToken);
      const res = await RefreshToken.findOneAndUpdate(
        { tokenHash },
        { isRevoked: true, revokedAt: new Date(), revokedReason: 'USER_LOGOUT' }
      );
      return !!res;
    } catch {
      return false;
    }
  }

  /**
   * Terminate All Active Sessions for a Merchant or User (Logout from all devices)
   */
  public static async revokeAllSessions(merchantId: string): Promise<void> {
    await RefreshToken.updateMany(
      { merchantId: new mongoose.Types.ObjectId(merchantId), isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: 'LOGOUT_ALL_DEVICES' }
    );
  }
}

export default JwtService;

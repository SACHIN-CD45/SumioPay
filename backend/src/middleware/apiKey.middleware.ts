import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Merchant, IMerchant } from '../models/merchant.model';
import { ApiKey } from '../models/apiKey.model';
import { config } from '../config';
import { timingSafeEqualStr } from '../utils/securityGuards';

export interface ApiKeyRequest extends Request {
  merchant?: IMerchant;
  isTestKey?: boolean;
}

/**
 * Validates API Key & Secret for developer integrations (Live `sp_live_`, Sandbox `sp_test_`,
 * and hashed scoped `ApiKey` tokens) OR allows Bearer JWT token from Merchant Portal.
 */
export const requireApiKeyOrMerchantAuth = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let apiKey = (req.headers['x-api-key'] as string)?.trim();
    const apiSecret = (req.headers['x-api-secret'] as string)?.trim();

    const authHeader = req.headers.authorization;

    // Support Bearer API Key: "Bearer sp_live_xxxx" or "Bearer sp_test_xxxx"
    if (!apiKey && authHeader && (authHeader.startsWith('Bearer sp_live_') || authHeader.startsWith('Bearer sp_test_'))) {
      apiKey = authHeader.split(' ')[1]?.trim();
    }

    // Support standard JWT token from dashboard
    if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, config.jwt.accessSecret, {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        });
        if (decoded.role === 'MERCHANT' && decoded.id) {
          const merchant = await Merchant.findById(decoded.id);
          if (merchant && merchant.isActive) {
            req.merchant = merchant;
            next();
            return;
          }
        }
      } catch {
        // Fallback to legacy secret if configured differently
        try {
          const decoded: any = jwt.verify(token, config.jwtSecret);
          if (decoded.role === 'MERCHANT' && decoded.id) {
            const merchant = await Merchant.findById(decoded.id);
            if (merchant && merchant.isActive) {
              req.merchant = merchant;
              next();
              return;
            }
          }
        } catch {
          // Fall through to API key check
        }
      }
    }

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'API Key is missing. Pass via "x-api-key" header or Bearer token.',
        },
      });
      return;
    }

    // 1. Check Sandbox Test Keys (sp_test_...) mapped to Merchant's sp_live_ key
    const isTestKey = apiKey.startsWith('sp_test_');
    const lookupMerchantKey = isTestKey ? apiKey.replace(/^sp_test_/, 'sp_live_') : apiKey;

    const query: any = { apiKey: lookupMerchantKey, isActive: true };
    let merchant = await Merchant.findOne(query);
    if (merchant && apiSecret) {
      if (!merchant.apiSecret || !timingSafeEqualStr(merchant.apiSecret, apiSecret)) {
        merchant = null;
      }
    }

    // 2. Fallback: Check hashed scoped project API Keys in ApiKey collection
    if (!merchant && !apiSecret) {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const scopedKey = await ApiKey.findOne({ keyHash, isActive: true });
      if (scopedKey && (!scopedKey.expiresAt || scopedKey.expiresAt > new Date())) {
        merchant = await Merchant.findOne({ _id: scopedKey.merchantId, isActive: true });
        if (merchant) {
          ApiKey.updateOne({ _id: scopedKey._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
        }
      }
    }

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or inactive API credentials provided.',
        },
      });
      return;
    }

    req.merchant = merchant;
    req.isTestKey = isTestKey;
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
};

export const authenticateApiKey = requireApiKeyOrMerchantAuth;

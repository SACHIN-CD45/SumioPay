import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Merchant, IMerchant } from '../models/merchant.model';
import { ApiKey } from '../models/apiKey.model';
import { config } from '../config';
import { timingSafeEqualStr } from '../utils/securityGuards';

export type ApiAuthMethod = 'JWT' | 'API_KEY_SECRET' | 'API_KEY_ONLY' | 'SCOPED_KEY';

export interface ApiKeyRequest extends Request {
  merchant?: IMerchant;
  isTestKey?: boolean;
  authMethod?: ApiAuthMethod;
  apiKeyPermissions?: string[];
  apiKeyProjectId?: string;
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
            req.authMethod = 'JWT';
            next();
            return;
          }
        }
      } catch {
        if (config.jwt.accessSecret !== config.jwtSecret) {
          try {
            const decoded: any = jwt.verify(token, config.jwtSecret);
            if (decoded.role === 'MERCHANT' && decoded.id) {
              const merchant = await Merchant.findById(decoded.id);
              if (merchant && merchant.isActive) {
                req.merchant = merchant;
                req.authMethod = 'JWT';
                next();
                return;
              }
            }
          } catch {
            // Fall through to API key check
          }
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

    let merchant: IMerchant | null = await Merchant.findOne({ apiKey: lookupMerchantKey, isActive: true });
    let authMethod: ApiAuthMethod = 'API_KEY_ONLY';
    let apiKeyPermissions: string[] | undefined;
    let apiKeyProjectId: string | undefined;

    if (merchant) {
      if (apiSecret) {
        if (!merchant.apiSecret || !timingSafeEqualStr(merchant.apiSecret, apiSecret)) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_API_SECRET',
              message: 'Invalid x-api-secret provided for merchant API key.',
            },
          });
          return;
        }
        authMethod = 'API_KEY_SECRET';
      }
    } else {
      // 2. Fallback: Check hashed scoped project API Keys in ApiKey collection
      const keyHash = crypto.createHash('sha256').update(lookupMerchantKey).digest('hex');
      const scopedKey = await ApiKey.findOne({ keyHash, isActive: true });
      if (scopedKey && (!scopedKey.expiresAt || scopedKey.expiresAt > new Date())) {
        merchant = await Merchant.findOne({ _id: scopedKey.merchantId, isActive: true });
        if (merchant) {
          if (apiSecret && (!merchant.apiSecret || !timingSafeEqualStr(merchant.apiSecret, apiSecret))) {
            res.status(401).json({
              success: false,
              error: {
                code: 'INVALID_API_SECRET',
                message: 'Invalid x-api-secret provided.',
              },
            });
            return;
          }
          authMethod = 'SCOPED_KEY';
          apiKeyPermissions = scopedKey.permissions || [];
          apiKeyProjectId = scopedKey.projectId ? scopedKey.projectId.toString() : undefined;
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
    req.authMethod = authMethod;
    req.apiKeyPermissions = apiKeyPermissions;
    req.apiKeyProjectId = apiKeyProjectId;
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
};

/**
 * Guards server-only privileged operations (listing all merchant orders, cancelling orders,
 * or initiating refunds). Rejects bare browser-only publishable `sp_live_` calls without `x-api-secret`,
 * preventing attackers who scrape frontend HTML checkout keys from reading orders or triggering refunds.
 */
export const requireServerApiAuth = (requiredPermission?: string) => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    if (!req.merchant) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (req.authMethod === 'JWT' || req.authMethod === 'API_KEY_SECRET') {
      next();
      return;
    }

    if (req.authMethod === 'SCOPED_KEY') {
      if (requiredPermission && Array.isArray(req.apiKeyPermissions) && !req.apiKeyPermissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_SCOPE',
            message: `Scoped API key lacks required permission: ${requiredPermission}`,
          },
        });
        return;
      }
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'API_SECRET_REQUIRED',
        message: 'Privileged operations (listing orders, refunds, cancellations) require both "x-api-key" and "x-api-secret" server headers.',
      },
    });
  };
};

export const authenticateApiKey = requireApiKeyOrMerchantAuth;

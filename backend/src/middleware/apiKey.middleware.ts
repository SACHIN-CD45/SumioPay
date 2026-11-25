import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Merchant, IMerchant } from '../models/merchant.model';
import { config } from '../config';

export interface ApiKeyRequest extends Request {
  merchant?: IMerchant;
}

/**
 * Validates API Key & Secret for developer integrations or allows Bearer JWT token from Merchant Portal
 */
export const requireApiKeyOrMerchantAuth = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let apiKey = req.headers['x-api-key'] as string;
    let apiSecret = req.headers['x-api-secret'] as string;

    const authHeader = req.headers.authorization;

    // Support Bearer API Key: "Bearer sp_live_xxxx"
    if (!apiKey && authHeader && authHeader.startsWith('Bearer sp_live_')) {
      apiKey = authHeader.split(' ')[1];
    }

    // Support standard JWT token from dashboard
    if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        if (decoded.id) {
          const merchant = await Merchant.findById(decoded.id);
          if (merchant && merchant.isActive) {
            req.merchant = merchant;
            next();
            return;
          }
        }
      } catch (tokenErr) {
        // Fall through to API key check
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

    const query: any = { apiKey, isActive: true };
    if (apiSecret) {
      query.apiSecret = apiSecret;
    }

    const merchant = await Merchant.findOne(query);
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
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
};

export const authenticateApiKey = requireApiKeyOrMerchantAuth;

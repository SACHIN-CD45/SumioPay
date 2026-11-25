import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Merchant, IMerchant } from '../models/merchant.model';
import { SuperAdmin, ISuperAdmin } from '../models/superadmin.model';

export interface AuthenticatedRequest extends Request {
  merchant?: IMerchant;
  superAdmin?: ISuperAdmin;
  userRole?: 'MERCHANT' | 'SUPERADMIN';
}

/**
 * Validates JWT access token with fallback options for maximum resilience
 */
function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  } catch (primaryErr) {
    // Fallback to legacy master secret if different
    if (config.jwt.accessSecret !== config.jwtSecret) {
      return jwt.verify(token, config.jwtSecret);
    }
    throw primaryErr;
  }
}

export const requireMerchantAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token missing' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = verifyAccessToken(token);

    if (decoded.role === 'MERCHANT' && decoded.id) {
      const merchant = await Merchant.findById(decoded.id);
      if (!merchant || !merchant.isActive) {
        res.status(401).json({ success: false, message: 'Merchant account inactive or not found' });
        return;
      }
      req.merchant = merchant;
      req.userRole = 'MERCHANT';
      next();
      return;
    }

    res.status(403).json({ success: false, message: 'Unauthorized merchant access' });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Invalid or expired session access token. Use your refresh token to renew session.',
      },
    });
  }
};

export const requireSuperAdminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Superadmin token missing' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = verifyAccessToken(token);

    if (decoded.role === 'SUPERADMIN' && decoded.id) {
      const admin = await SuperAdmin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        res.status(401).json({ success: false, message: 'Superadmin account deactivated' });
        return;
      }
      req.superAdmin = admin;
      req.userRole = 'SUPERADMIN';
      next();
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied: Superadmin privileges required' });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'SUPERADMIN_TOKEN_INVALID',
        message: 'Invalid or expired superadmin session token.',
      },
    });
  }
};

// Aliases
export const authenticateMerchant = requireMerchantAuth;
export const authenticateSuperAdmin = requireSuperAdminAuth;

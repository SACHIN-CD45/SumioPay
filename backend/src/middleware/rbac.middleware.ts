import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from '../models/user.model';

export type Permission =
  | 'orders:create'
  | 'orders:read'
  | 'orders:cancel'
  | 'refunds:create'
  | 'refunds:read'
  | 'disputes:manage'
  | 'reconciliation:read'
  | 'reconciliation:manage'
  | 'projects:read'
  | 'projects:manage'
  | 'api_keys:read'
  | 'api_keys:manage'
  | 'devices:read'
  | 'devices:manage'
  | 'team:read'
  | 'team:manage'
  | 'billing:manage'
  | 'kyc:manage'
  | 'superadmin:access';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'orders:create',
    'orders:read',
    'orders:cancel',
    'refunds:create',
    'refunds:read',
    'disputes:manage',
    'reconciliation:read',
    'reconciliation:manage',
    'projects:read',
    'projects:manage',
    'api_keys:read',
    'api_keys:manage',
    'devices:read',
    'devices:manage',
    'team:read',
    'team:manage',
    'billing:manage',
    'kyc:manage',
    'superadmin:access',
  ],
  PLATFORM_ADMIN: [
    'orders:read',
    'refunds:read',
    'disputes:manage',
    'reconciliation:read',
    'projects:read',
    'devices:read',
    'team:read',
    'kyc:manage',
    'superadmin:access',
  ],
  MERCHANT_OWNER: [
    'orders:create',
    'orders:read',
    'orders:cancel',
    'refunds:create',
    'refunds:read',
    'disputes:manage',
    'reconciliation:read',
    'reconciliation:manage',
    'projects:read',
    'projects:manage',
    'api_keys:read',
    'api_keys:manage',
    'devices:read',
    'devices:manage',
    'team:read',
    'team:manage',
    'billing:manage',
    'kyc:manage',
  ],
  MERCHANT_ADMIN: [
    'orders:create',
    'orders:read',
    'orders:cancel',
    'refunds:create',
    'refunds:read',
    'disputes:manage',
    'reconciliation:read',
    'reconciliation:manage',
    'projects:read',
    'projects:manage',
    'api_keys:read',
    'api_keys:manage',
    'devices:read',
    'devices:manage',
    'team:read',
    'team:manage',
    'kyc:manage',
  ],
  FINANCE_MANAGER: [
    'orders:read',
    'refunds:create',
    'refunds:read',
    'disputes:manage',
    'reconciliation:read',
    'reconciliation:manage',
    'projects:read',
    'billing:manage',
  ],
  DEVELOPER: [
    'orders:create',
    'orders:read',
    'orders:cancel',
    'projects:read',
    'projects:manage',
    'api_keys:read',
    'api_keys:manage',
    'devices:read',
    'devices:manage',
  ],
  SUPPORT_AGENT: [
    'orders:read',
    'refunds:read',
    'devices:read',
    'projects:read',
  ],
  READ_ONLY_ANALYST: [
    'orders:read',
    'refunds:read',
    'reconciliation:read',
    'projects:read',
  ],
};

export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // If SuperAdmin token is present, allow access
    if (req.superAdmin) {
      next();
      return;
    }

    const role = (req as any).userRole || (req.merchant ? 'MERCHANT_OWNER' : null);

    if (!role) {
      res.status(401).json({ success: false, message: 'Authentication required for permission check' });
      return;
    }

    const assignedPermissions = ROLE_PERMISSIONS[role as UserRole] || [];

    const hasAll = requiredPermissions.every((p) => assignedPermissions.includes(p));

    if (!hasAll) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required permission: ${requiredPermissions.join(', ')}. Your role: ${role}`,
        },
      });
      return;
    }

    next();
  };
};

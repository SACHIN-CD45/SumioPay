import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireMerchantAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ApiKey } from '../../models/apiKey.model';
import { AuditLog } from '../../models/auditLog.model';

const router = Router();

// GET /api/v1/api-keys - List merchant API keys
router.get('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const keys = await ApiKey.find({ merchantId }).select('-keyHash').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: keys.map((k) => ({
        id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: k.permissions,
        projectId: k.projectId,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        isActive: k.isActive,
        createdAt: k.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch API keys', error: err.message });
  }
});

// POST /api/v1/api-keys - Generate a new API key pair
router.post('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { name, projectId, permissions, expiresDays } = req.body;

    const rawSecret = crypto.randomBytes(32).toString('hex');
    const prefix = 'sp_live_' + crypto.randomBytes(4).toString('hex');
    const fullKey = `${prefix}_${rawSecret}`;

    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400000) : undefined;

    const apiKey = await ApiKey.create({
      merchantId,
      projectId: projectId || undefined,
      name: name || 'API Key',
      keyPrefix: prefix,
      keyHash,
      permissions: Array.isArray(permissions) && permissions.length ? permissions : ['orders:create', 'orders:read'],
      expiresAt,
      isActive: true,
    });

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorId: merchantId,
      actorEmail: req.merchant!.email,
      merchantId,
      action: 'API_KEY_CREATED',
      resourceType: 'API_KEY',
      resourceId: apiKey._id.toString(),
      newState: { keyPrefix: prefix, name: apiKey.name, permissions: apiKey.permissions },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Full key is ONLY returned once on creation
    res.status(201).json({
      success: true,
      message: 'API key generated. Store this key safely; it will not be displayed again.',
      data: {
        id: apiKey._id,
        name: apiKey.name,
        apiKey: fullKey,
        keyPrefix: prefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create API key', error: err.message });
  }
});

// DELETE /api/v1/api-keys/:id - Revoke an API key
router.delete('/:id', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const apiKey = await ApiKey.findOne({ _id: req.params.id, merchantId });

    if (!apiKey) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    apiKey.isActive = false;
    await apiKey.save();

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorId: merchantId,
      actorEmail: req.merchant!.email,
      merchantId,
      action: 'API_KEY_REVOKED',
      resourceType: 'API_KEY',
      resourceId: apiKey._id.toString(),
      newState: { isActive: false },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({ success: true, message: 'API key revoked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to revoke API key', error: err.message });
  }
});

export default router;

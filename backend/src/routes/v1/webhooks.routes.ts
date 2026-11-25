import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireMerchantAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { dispatchMerchantWebhook } from '../../utils/hmacSigner';
import { WebhookLog } from '../../models/webhookLog.model';
import { AuditLog } from '../../models/auditLog.model';

const router = Router();

// GET /api/v1/webhooks — Get current webhook configuration
router.get('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchant = req.merchant!;
    res.status(200).json({
      success: true,
      data: {
        webhookUrl: merchant.webhookUrl || '',
        webhookSecret: merchant.webhookSecret,
        supportedEvents: [
          'payment.created',
          'payment.pending',
          'payment.processing',
          'payment.succeeded',
          'payment.failed',
          'payment.expired',
          'payment.cancelled',
          'payment.refunded',
          'payment.disputed',
          'reconciliation.completed',
          'device.disconnected',
        ],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/webhooks — Update webhook endpoint configuration
router.post('/', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchant = req.merchant!;
    const { webhookUrl } = req.body;

    if (webhookUrl && !webhookUrl.startsWith('http')) {
      res.status(400).json({ success: false, message: 'Invalid URL. Must begin with http:// or https://' });
      return;
    }

    merchant.webhookUrl = (webhookUrl || '').trim();
    await merchant.save();

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorEmail: merchant.email,
      merchantId: merchant._id,
      action: 'WEBHOOK_CONFIG_UPDATED',
      resourceType: 'MERCHANT',
      resourceId: merchant._id.toString(),
      newState: { webhookUrl: merchant.webhookUrl },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Webhook configuration updated',
      data: {
        webhookUrl: merchant.webhookUrl,
        webhookSecret: merchant.webhookSecret,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/webhooks/test — Dispatch test ping with HMAC signature
router.post('/test', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchant = req.merchant!;
    const targetUrl = req.body.url || merchant.webhookUrl;

    if (!targetUrl) {
      res.status(400).json({ success: false, message: 'No webhook URL provided or configured' });
      return;
    }

    const testPayload = {
      order_id: `ORD-TEST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      merchant_id: merchant._id.toString(),
      amount: 99900,
      currency: 'INR',
      status: 'PAID',
      provider_reference: 'TEST_UPI_REF_998877',
      customer: {
        name: 'Test Customer',
        phone: '9876543210',
      },
      simulated: true,
    };

    const delivered = await dispatchMerchantWebhook(
      merchant._id,
      testPayload.order_id,
      targetUrl,
      merchant.webhookSecret,
      testPayload,
      'payment.succeeded'
    );

    res.status(200).json({
      success: true,
      delivered,
      message: delivered
        ? `Test webhook dispatched successfully to ${targetUrl}`
        : `Target endpoint returned error or timed out`,
      targetUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/webhooks/logs — View delivery logs
router.get('/logs', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const logs = await WebhookLog.find({ merchantId }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/webhooks/rotate-secret — Rotate HMAC secret key
router.post('/rotate-secret', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchant = req.merchant!;
    merchant.webhookSecret = crypto.randomBytes(24).toString('hex');
    await merchant.save();

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorEmail: merchant.email,
      merchantId: merchant._id,
      action: 'WEBHOOK_SECRET_ROTATED',
      resourceType: 'MERCHANT',
      resourceId: merchant._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Webhook secret rotated. Update your webhook listeners immediately.',
      webhookSecret: merchant.webhookSecret,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

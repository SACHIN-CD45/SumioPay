import { Router, Request, Response } from 'express';
import { createOrder, getOrderStatus } from '../controllers/order.controller';
import { handleListenerPush } from '../controllers/webhook.controller';
import { Device } from '../models/device.model';
import { requireApiKeyOrMerchantAuth } from '../middleware/apiKey.middleware';

const router = Router();

/**
 * Universal Central Payment Routes
 * Supports seamless single-service integration across SumioLab, SumioBilling, SumioBook, SumioJewel, and ERP.
 */

// POST /api/central-payment/create-order
router.post('/create-order', requireApiKeyOrMerchantAuth, createOrder);

// GET /api/central-payment/status/:orderId
router.get('/status/:orderId', getOrderStatus);

// POST /api/central-payment/verify-webhook
// Strictly requires a paired, active device token matching the merchant's Android listener
router.post('/verify-webhook', async (req: Request, res: Response): Promise<void> => {
  const token =
    (req.headers['x-device-token'] as string) ||
    (req.body?.deviceToken as string) ||
    (req.body?.secret_key as string);

  if (!token || typeof token !== 'string' || !token.trim()) {
    res.status(401).json({ success: false, message: 'Device token (x-device-token / secret_key) is required' });
    return;
  }

  const device = await Device.findOne({ deviceToken: token.trim(), isActive: true, isPaired: true });
  if (!device) {
    res.status(401).json({ success: false, message: 'Invalid or inactive deviceToken' });
    return;
  }

  (req as any).device = device;
  return handleListenerPush(req, res);
});

export default router;

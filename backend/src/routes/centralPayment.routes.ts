import { Router, Request, Response } from 'express';
import { createOrder, getOrderStatus } from '../controllers/order.controller';
import { handleListenerPush } from '../controllers/webhook.controller';
import { Device } from '../models/device.model';

const router = Router();

/**
 * Universal Central Payment Routes
 * Supports seamless single-service integration across SumioLab, SumioBilling, SumioBook, SumioJewel, and ERP.
 */

// POST /api/central-payment/create-order
router.post('/create-order', createOrder);

// GET /api/central-payment/status/:orderId
router.get('/status/:orderId', getOrderStatus);

// POST /api/central-payment/verify-webhook
// Accepts { secret_key, message, package_name, title }
router.post('/verify-webhook', async (req: Request, res: Response): Promise<void> => {
  const { secret_key, message } = req.body;

  // Find device matching secret_key or fallback to first active device
  let device = await Device.findOne({ deviceToken: secret_key });
  if (!device && secret_key) {
    device = await Device.findOne();
  }

  if (!device) {
    res.status(401).json({ success: false, message: 'Invalid secret_key or no device paired yet' });
    return;
  }

  (req as any).device = device;
  return handleListenerPush(req, res);
});

export default router;

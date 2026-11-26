import { Router, Request, Response } from 'express';
import { requireApiKeyOrMerchantAuth } from '../../middleware/apiKey.middleware';
import { requireIdempotency } from '../../middleware/idempotency.middleware';
import { paymentOrchestrator } from '../../services/providers/paymentOrchestrator.service';
import { StateMachineService } from '../../services/stateMachine.service';
import { Order } from '../../models/order.model';
import { Refund } from '../../models/refund.model';
import crypto from 'crypto';

const router = Router();

// GET /api/v1/payments/orders or /api/v1/payments — List payments
router.get('/', requireApiKeyOrMerchantAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const appName = req.query.appName as string;

    const filter: any = { merchantId: merchant._id };
    if (status) filter.status = status;
    if (appName) filter.appName = appName;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: orders.map((o) => ({
        orderId: o.orderId,
        appName: o.appName,
        amountInPaise: Math.round(o.baseAmount * 100),
        exactAmountInPaise: Math.round(o.exactAmount * 100),
        baseAmount: o.baseAmount,
        exactAmount: o.exactAmount,
        currency: 'INR',
        status: o.status,
        utrNumber: o.utrNumber,
        paidAt: o.paidAt,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payments/orders — Create Payment Order
router.post('/orders', requireApiKeyOrMerchantAuth, requireIdempotency, async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    const {
      amountInPaise,
      baseAmount,
      appName = 'API_CLIENT',
      customerUserId = '',
      customerPhone = '',
      customerEmail = '',
      callbackWebhookUrl,
      provider = 'UPI_DIRECT',
      metadata = {},
    } = req.body;

    const finalPaise = amountInPaise ? parseInt(amountInPaise, 10) : Math.round(parseFloat(baseAmount || '0') * 100);

    if (isNaN(finalPaise) || finalPaise <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'amountInPaise must be a positive integer' },
      });
      return;
    }

    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const adapter = paymentOrchestrator.getProvider(provider);

    const initiation = await adapter.createPayment({
      orderId,
      merchant,
      baseAmountInPaise: finalPaise,
      appName,
      customerUserId,
      metadata,
    });

    const order = new Order({
      orderId,
      merchantId: merchant._id,
      appName: appName.toUpperCase().trim(),
      customerUserId,
      customerPhone,
      customerEmail,
      baseAmount: finalPaise / 100,
      paiseOffset: (initiation.exactAmountInPaise - finalPaise) / 100,
      exactAmount: initiation.exactAmountInPaise / 100,
      status: 'PENDING',
      upiIntentUrl: initiation.upiIntentUrl || '',
      expiresAt: initiation.expiresAt,
      callbackWebhookUrl: callbackWebhookUrl || merchant.webhookUrl || '',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    await order.save();

    const frontendBase = (process.env.PUBLIC_URL || 'https://sumiopay.sumiotech.in').replace(/\/+$/, '');
    const hostedCheckoutUrl = `${frontendBase}/pay/${order.orderId}`;

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        amountInPaise: finalPaise,
        exactAmountInPaise: initiation.exactAmountInPaise,
        currency: 'INR',
        upiId: merchant.upiId,
        merchantName: merchant.upiName || merchant.businessName,
        upiIntentUrl: order.upiIntentUrl,
        checkoutUrl: initiation.checkoutUrl || hostedCheckoutUrl,
        hostedCheckoutUrl,
        metadata: order.metadata || {},
        status: order.status,
        expiresAt: order.expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/v1/payments/orders/:id — Retrieve Order
router.get('/orders/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ orderId: req.params.id }).populate('merchantId', 'businessName name upiId upiName');
    if (!order) {
      res.status(404).json({ success: false, message: 'Payment order not found' });
      return;
    }

    if (order.status === 'PENDING' && new Date() > order.expiresAt) {
      order.status = 'EXPIRED';
      await order.save();
    }

    const merchantObj: any = order.merchantId || {};

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        amountInPaise: Math.round(order.baseAmount * 100),
        exactAmountInPaise: Math.round(order.exactAmount * 100),
        currency: 'INR',
        upiId: merchantObj.upiId || '',
        merchantName: merchantObj.upiName || merchantObj.businessName || 'Merchant',
        status: order.status,
        utr: order.utrNumber,
        utrNumber: order.utrNumber,
        upiIntentUrl: order.upiIntentUrl,
        metadata: order.metadata || {},
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/payments/orders/:id/status — Fast status check for frontends
router.get('/orders/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ orderId: req.params.id }).select('orderId status exactAmount utrNumber paidAt expiresAt metadata');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Auto-expire check
    if (order.status === 'PENDING' && new Date() > order.expiresAt) {
      order.status = 'EXPIRED';
      await order.save();
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        amount: order.exactAmount,
        exactAmount: order.exactAmount,
        utr: order.utrNumber,
        utrNumber: order.utrNumber,
        metadata: order.metadata || {},
        paidAt: order.paidAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payments/orders/:id/cancel — Cancel pending order
router.post('/orders/:id/cancel', requireApiKeyOrMerchantAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    const order = await Order.findOne({ orderId: req.params.id, merchantId: merchant._id });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    await StateMachineService.transitionOrder({
      order,
      targetState: 'CANCELLED',
      trigger: 'API_CLIENT' as any,
      actorId: merchant._id.toString(),
    });

    res.status(200).json({ success: true, message: 'Order cancelled successfully', status: 'CANCELLED' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/v1/payments/orders/:id/refund — Initiate refund on settled order
router.post('/orders/:id/refund', requireApiKeyOrMerchantAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    const { amountInPaise, reason } = req.body;

    const order = await Order.findOne({ orderId: req.params.id, merchantId: merchant._id });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.status !== 'PAID') {
      res.status(400).json({ success: false, message: 'Only PAID orders can be refunded' });
      return;
    }

    const refundAmount = amountInPaise ? parseInt(amountInPaise, 10) : Math.round(order.exactAmount * 100);

    const refund = await Refund.create({
      refundId: `ref_${crypto.randomBytes(12).toString('hex')}`,
      orderId: order.orderId,
      merchantId: merchant._id,
      amountInPaise: refundAmount,
      reason: reason || 'Merchant initiated API refund',
      status: 'PROCESSED',
      initiatedBy: 'API_KEY',
      processedAt: new Date(),
    });

    await StateMachineService.transitionOrder({
      order,
      targetState: 'REFUNDED',
      trigger: 'API_CLIENT' as any,
      actorId: merchant._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refund,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;

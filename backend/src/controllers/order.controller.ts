import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/order.model.js';
import Merchant from '../models/merchant.model.js';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator.js';
import { dispatchMerchantWebhook } from '../utils/hmacSigner.js';
import { ApiKeyRequest } from '../middleware/apiKey.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';

export const createOrder = async (req: ApiKeyRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const {
      baseAmount,
      appName = 'APP',
      customerUserId = '',
      customerPhone = '',
      customerEmail = '',
      callbackWebhookUrl,
    } = req.body;

    const numBase = parseFloat(baseAmount);
    if (isNaN(numBase) || numBase <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'baseAmount must be a positive number' },
      });
    }

    // 1. Allocate unique paise offset for this merchant
    const { exactAmount, paiseOffset } = await allocateUniquePaise(merchant._id, numBase);

    // 2. Generate unique Order ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `ORD-${dateStr}-${randomSuffix}`;

    // 3. Build UPI Intent deep link
    const upiIntentUrl = buildUpiIntentUrl(
      merchant.upiId,
      merchant.upiName,
      exactAmount,
      orderId
    );

    // 4. Set 15-minute expiration
    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60 * 1000);

    const order = new Order({
      orderId,
      merchantId: merchant._id,
      appName: appName.toUpperCase().trim(),
      customerUserId: String(customerUserId).trim(),
      customerPhone: String(customerPhone).trim(),
      customerEmail: String(customerEmail).trim(),
      baseAmount: numBase,
      paiseOffset,
      exactAmount,
      status: 'PENDING',
      upiIntentUrl,
      expiresAt,
      callbackWebhookUrl: callbackWebhookUrl || merchant.webhookUrl || '',
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        baseAmount: order.baseAmount,
        paiseOffset: order.paiseOffset,
        exactAmount: order.exactAmount,
        currency: 'INR',
        upiId: merchant.upiId,
        merchantName: merchant.upiName,
        upiIntentUrl: order.upiIntentUrl,
        status: order.status,
        expiresAt: order.expiresAt,
        ttlSeconds: config.orderTtlMinutes * 60,
      },
    });
  } catch (err: any) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
};

export const getOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if expired
    if (order.status === 'PENDING' && new Date() > order.expiresAt) {
      order.status = 'EXPIRED';
      await order.save();
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        status: order.status,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        utrNumber: order.utrNumber,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMerchantOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { status, appName, search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { merchantId };
    if (status && status !== 'ALL') query.status = status;
    if (appName && appName !== 'ALL') query.appName = appName;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { utrNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Developer Sandbox Simulator: Simulates a real UPI bank transfer
 * so developers can test auto-verification without transferring real money!
 */
export const simulatePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, merchantId: merchant._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already marked PAID' });
    }

    const fakeUtr = `SIM${Date.now().toString().slice(-9)}`;
    order.status = 'PAID';
    order.utrNumber = fakeUtr;
    order.paidAt = new Date();
    order.bankAppName = 'TEST_SANDBOX_SIMULATOR';
    order.rawNotificationMessage = `[Sandbox Test] Received Rs.${order.exactAmount} on UPI ref ${fakeUtr}`;
    await order.save();

    // Increment merchant totals
    await Merchant.findByIdAndUpdate(merchant._id, {
      $inc: { totalVolume: order.exactAmount, totalTransactions: 1 },
    });

    // Dispatch webhook to merchant's callback URL
    if (order.callbackWebhookUrl) {
      dispatchMerchantWebhook(
        merchant._id,
        order.orderId,
        order.callbackWebhookUrl,
        merchant.webhookSecret,
        {
          orderId: order.orderId,
          appName: order.appName,
          customerUserId: order.customerUserId,
          amount: order.exactAmount,
          utrNumber: order.utrNumber,
          status: 'PAID',
          paidAt: order.paidAt,
        }
      );
    }

    res.json({
      success: true,
      message: `Payment simulated successfully for order ${orderId}! Amount: ₹${order.exactAmount}`,
      data: order,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

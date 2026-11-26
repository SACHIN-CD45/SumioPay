import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/order.model.js';
import Merchant from '../models/merchant.model.js';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator.js';
import { dispatchMerchantWebhook } from '../utils/hmacSigner.js';
import { ApiKeyRequest } from '../middleware/apiKey.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';
import { EmailService } from '../services/email.service.js';

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
      isTest = false,
      metadata = {},
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
      isTest: Boolean(isTest || req.headers['x-test-mode'] === 'true'),
      status: 'PENDING',
      upiIntentUrl,
      expiresAt,
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
        paiseOffset: order.paiseOffset,
        exactAmount: order.exactAmount,
        currency: 'INR',
        upiId: merchant.upiId,
        merchantName: merchant.upiName,
        upiIntentUrl: order.upiIntentUrl,
        hostedCheckoutUrl,
        metadata: order.metadata || {},
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

    const order = await Order.findOne({ orderId }).populate('merchantId', 'businessName name upiId upiName');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if expired
    if (order.status === 'PENDING' && new Date() > order.expiresAt) {
      order.status = 'EXPIRED';
      await order.save();
    }

    const merchantObj: any = order.merchantId || {};

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        status: order.status,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        paiseOffset: order.paiseOffset,
        upiIntentUrl: order.upiIntentUrl,
        isTest: order.isTest || false,
        merchantName: merchantObj.businessName || merchantObj.name || 'Merchant',
        upiId: merchantObj.upiId || '',
        utr: order.utrNumber,
        utrNumber: order.utrNumber,
        metadata: order.metadata || {},
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
    const { status, appName, search, isTest, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { merchantId };
    if (status && status !== 'ALL') query.status = status;
    if (appName && appName !== 'ALL') query.appName = appName;
    if (isTest !== undefined && isTest !== '' && isTest !== 'ALL') {
      query.isTest = isTest === 'true';
    }
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

    // Increment merchant totals only for live transactions
    if (!order.isTest) {
      await Merchant.findByIdAndUpdate(merchant._id, {
        $inc: { totalVolume: order.exactAmount, totalTransactions: 1 },
      });
    }

    // Send Payment Confirmation / Invoice Email
    const recipientEmail = order.customerEmail || merchant.email;
    if (recipientEmail) {
      EmailService.sendPaymentReceipt(recipientEmail, order.customerPhone || merchant.businessName, {
        orderId: order.orderId,
        amount: order.baseAmount,
        exactAmount: order.exactAmount,
        paiseOffset: order.paiseOffset,
        utr: order.utrNumber || fakeUtr,
        merchantBusinessName: merchant.businessName,
        appName: order.appName,
        paymentDate: order.paidAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      }).catch((emailErr) => {
        console.error(`[EmailReceipt Simulation Error] Failed to send receipt for ${order.orderId}:`, emailErr.message);
      });
    }

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
          userId: order.customerUserId,
          customerUserId: order.customerUserId,
          baseAmount: order.baseAmount,
          exactAmount: order.exactAmount,
          amount: order.exactAmount,
          amountInPaise: Math.round(order.exactAmount * 100),
          utr: order.utrNumber,
          utrNumber: order.utrNumber,
          status: 'PAID',
          metadata: order.metadata || {},
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

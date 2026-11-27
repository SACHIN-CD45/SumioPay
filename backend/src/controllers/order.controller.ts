import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/order.model.js';
import Merchant from '../models/merchant.model.js';
import Organization from '../models/organization.model.js';
import UnmappedPayment from '../models/unmappedPayment.model.js';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator.js';
import { dispatchMerchantWebhook } from '../utils/hmacSigner.js';
import { recordUpiAccountCredit, selectUpiAndAdvanceRotation } from '../services/upiRouter.service.js';
import { activatePlatformSubscriptionFromOrder } from '../services/subscriptionActivation.service.js';
import {
  buildCheckoutBranding,
  normalizeBillDetails,
  resolveCheckoutBaseRupees,
  sanitizeBrandColor,
  sanitizeSafeUrl,
} from '../utils/checkoutBranding.js';
import { validateSafeWebhookUrl } from '../utils/securityGuards.js';
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

    const webhookCheck = validateSafeWebhookUrl(callbackWebhookUrl);
    if (!webhookCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_WEBHOOK_URL', message: webhookCheck.reason },
      });
    }

    const billDetails = normalizeBillDetails(req.body);
    const numBase = resolveCheckoutBaseRupees(baseAmount, billDetails);
    if (numBase === null || isNaN(numBase) || numBase <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Provide a positive baseAmount or valid billDetails.subtotal after discount',
        },
      });
    }

    // 1. Allocate unique paise offset for this merchant
    const { exactAmount, paiseOffset } = await allocateUniquePaise(merchant._id, numBase);

    // 2. Select active / primary / rotated destination UPI ID for this merchant
    const selectedUpi = await selectUpiAndAdvanceRotation(merchant);

    // 3. Generate unique Order ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `ORD-${dateStr}-${randomSuffix}`;

    // 4. Build UPI Intent deep link
    const upiIntentUrl = buildUpiIntentUrl(
      selectedUpi.upiId,
      selectedUpi.upiName,
      exactAmount,
      orderId
    );

    // 5. Set 15-minute expiration
    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60 * 1000);

    const safeMeta = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    safeMeta.assignedUpiId = selectedUpi.upiId;
    safeMeta.assignedUpiAccountId = selectedUpi.accountId;
    if (req.body.websiteName || safeMeta.websiteName) {
      safeMeta.websiteName = String(req.body.websiteName || safeMeta.websiteName).trim().slice(0, 80);
    }
    if (req.body.websiteUrl || safeMeta.websiteUrl) {
      safeMeta.websiteUrl = sanitizeSafeUrl(req.body.websiteUrl || safeMeta.websiteUrl);
    }
    if (req.body.websiteLogoUrl || safeMeta.websiteLogoUrl) {
      safeMeta.websiteLogoUrl = sanitizeSafeUrl(req.body.websiteLogoUrl || safeMeta.websiteLogoUrl);
    }
    if (req.body.brandColor || safeMeta.brandColor) {
      safeMeta.brandColor = sanitizeBrandColor(req.body.brandColor || safeMeta.brandColor);
    }
    if (billDetails) {
      safeMeta.billDetails = billDetails;
    }

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
      isTest: Boolean(isTest || req.headers['x-test-mode'] === 'true' || req.isTestKey),
      status: 'PENDING',
      upiIntentUrl,
      expiresAt,
      callbackWebhookUrl: webhookCheck.url || merchant.webhookUrl || '',
      metadata: safeMeta,
    });

    await order.save();

    const frontendBase = (process.env.PUBLIC_URL || 'https://sumiopay.sumiotech.in').replace(/\/+$/, '');
    const hostedCheckoutUrl = `${frontendBase}/pay/${order.orderId}`;

    const org = merchant.email
      ? await Organization.findOne({ billingEmail: merchant.email }).select('kycStatus').lean()
      : null;
    const branding = buildCheckoutBranding({
      orderMeta: order.metadata,
      merchant,
      kycStatus: org?.kycStatus,
      fallbackAppName: order.appName,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        baseAmount: order.baseAmount,
        paiseOffset: order.paiseOffset,
        exactAmount: order.exactAmount,
        currency: 'INR',
        upiId: selectedUpi.upiId,
        merchantName: selectedUpi.upiName,
        websiteName: branding.websiteName,
        websiteUrl: branding.websiteUrl,
        websiteLogoUrl: branding.websiteLogoUrl,
        brandColor: branding.brandColor,
        trustedBusiness: branding.trustedBusiness,
        kycVerified: branding.kycVerified,
        trustLabel: branding.trustLabel,
        branding,
        billDetails,
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

    const order = await Order.findOne({ orderId }).populate(
      'merchantId',
      'businessName name upiId upiName websiteName websiteUrl websiteLogoUrl brandColor isActive email'
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if expired
    if (order.status === 'PENDING' && new Date() > order.expiresAt) {
      order.status = 'EXPIRED';
      await order.save();
    }

    const merchantObj: any = order.merchantId || {};
    const org = merchantObj.email
      ? await Organization.findOne({ billingEmail: merchantObj.email }).select('kycStatus').lean()
      : null;

    const branding = buildCheckoutBranding({
      orderMeta: order.metadata,
      merchant: merchantObj,
      kycStatus: org?.kycStatus,
      fallbackAppName: order.appName,
    });
    const billDetails = order.metadata?.billDetails || null;

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
        upiId: order.metadata?.assignedUpiId || merchantObj.upiId || '',
        websiteName: branding.websiteName,
        websiteUrl: branding.websiteUrl,
        websiteLogoUrl: branding.websiteLogoUrl,
        brandColor: branding.brandColor,
        trustedBusiness: branding.trustedBusiness,
        kycVerified: branding.kycVerified,
        trustLabel: branding.trustLabel,
        branding,
        billDetails,
        returnUrl: billDetails?.returnUrl || order.metadata?.returnUrl || '',
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
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Developer Sandbox Simulator: Simulates a real UPI bank transfer ONLY for Test Mode orders
 * so live production orders can NEVER be spoofed or marked PAID without real money.
 */
export const simulatePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, merchantId: merchant._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.isTest) {
      return res.status(403).json({
        success: false,
        message: 'Live production orders cannot be simulated. Switch to Test Mode or use an sp_test_ API key.',
      });
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

    // Sandbox test payments never increment real live GMV counters
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

/**
 * Customer submits 12-digit UTR on checkout when bank notification arrived slightly ahead
 * or landed in UnmappedPayment. Never auto-approves without matching a real listener credit.
 */
export const submitCustomerUtr = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const cleanUtr = String(req.body?.utrNumber || req.body?.utr || '').trim();

    if (!/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 12-digit numeric UPI Reference / UTR number.',
      });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'PAID') {
      return res.json({
        success: true,
        matchedImmediately: true,
        alreadyPaid: true,
        message: 'Order is already confirmed and PAID.',
        data: {
          orderId: order.orderId,
          status: order.status,
          baseAmount: order.baseAmount,
          exactAmount: order.exactAmount,
          utr: order.utrNumber,
          utrNumber: order.utrNumber,
          paidAt: order.paidAt,
        },
      });
    }

    if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}. Please initiate a new payment.`,
      });
    }

    const replayOrder = await Order.findOne({
      merchantId: order.merchantId,
      utrNumber: cleanUtr,
      status: 'PAID',
      orderId: { $ne: order.orderId },
    });
    if (replayOrder) {
      return res.status(409).json({
        success: false,
        message: `UTR ${cleanUtr} is already used on order ${replayOrder.orderId}.`,
      });
    }

    const unmapped = await UnmappedPayment.findOne({
      merchantId: order.merchantId,
      utrNumber: cleanUtr,
      status: 'UNRESOLVED',
    }).sort({ createdAt: -1 });

    if (unmapped && Math.abs(Number(unmapped.amount || 0) - Number(order.exactAmount || 0)) <= 0.02) {
      order.status = 'PAID';
      order.utrNumber = cleanUtr;
      order.paidAt = new Date();
      order.senderName = order.senderName || unmapped.senderName || '';
      order.bankAppName = order.bankAppName || unmapped.bankAppName || 'UTR_MATCHED';
      order.rawNotificationMessage = order.rawNotificationMessage || unmapped.rawMessage;
      await order.save();

      unmapped.status = 'RESOLVED';
      unmapped.resolvedOrderId = order.orderId;
      unmapped.notes = `Matched via customer checkout UTR submission at ${new Date().toISOString()}`;
      await unmapped.save();

      const merchant = await Merchant.findById(order.merchantId);
      if (merchant && !order.isTest) {
        await Merchant.findByIdAndUpdate(merchant._id, {
          $inc: { totalVolume: order.exactAmount, totalTransactions: 1 },
        });
        await recordUpiAccountCredit(
          merchant._id,
          (order.metadata as any)?.assignedUpiId,
          order.exactAmount
        ).catch(() => {});
      }

      await activatePlatformSubscriptionFromOrder(order).catch(() => {});

      const targetWebhook = order.callbackWebhookUrl || merchant?.webhookUrl;
      if (targetWebhook && merchant) {
        dispatchMerchantWebhook(
          merchant._id,
          order.orderId,
          targetWebhook,
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
            senderName: order.senderName || '',
            bankAppName: order.bankAppName || '',
            status: 'PAID',
            metadata: order.metadata || {},
            paidAt: order.paidAt,
          }
        );
      }

      if (order.customerEmail && merchant) {
        EmailService.sendPaymentReceipt(order.customerEmail, order.customerPhone || merchant.businessName, {
          orderId: order.orderId,
          amount: order.baseAmount,
          exactAmount: order.exactAmount,
          paiseOffset: order.paiseOffset,
          utr: cleanUtr,
          merchantBusinessName: merchant.businessName,
          appName: order.appName,
          paymentDate: order.paidAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        }).catch(() => {});
      }

      return res.json({
        success: true,
        matchedImmediately: true,
        message: 'UTR matched with bank credit! Payment confirmed.',
        data: {
          orderId: order.orderId,
          status: order.status,
          baseAmount: order.baseAmount,
          exactAmount: order.exactAmount,
          utr: order.utrNumber,
          utrNumber: order.utrNumber,
          paidAt: order.paidAt,
        },
      });
    }

    order.metadata = {
      ...(order.metadata && typeof order.metadata === 'object' ? order.metadata : {}),
      customerSubmittedUtr: cleanUtr,
      customerSubmittedUtrAt: new Date().toISOString(),
    };
    order.markModified('metadata');
    await order.save();

    res.json({
      success: true,
      matchedImmediately: false,
      status: order.status,
      utrNumber: cleanUtr,
      message: `UTR ${cleanUtr} recorded. Auto-confirming as soon as the bank SMS/notification arrives.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

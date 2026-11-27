import { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/order.model.js';
import Merchant from '../models/merchant.model.js';
import Organization from '../models/organization.model.js';
import UnmappedPayment from '../models/unmappedPayment.model.js';
import Project from '../models/project.model.js';
import { SystemSetting } from '../models/systemSetting.model.js';
import SecurityEvent from '../models/securityEvent.model.js';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator.js';
import { selectUpiAndAdvanceRotation } from '../services/upiRouter.service.js';
import { finalizePaidOrderSideEffects } from '../services/paymentSettlement.service.js';
import { checkMerchantListenerAvailability } from '../services/reliability.service.js';
import {
  buildCheckoutBranding,
  normalizeBillDetails,
  resolveCheckoutBaseRupees,
  sanitizeBrandColor,
  sanitizeSafeUrl,
} from '../utils/checkoutBranding.js';
import { escapeRegex, validateSafeWebhookUrl } from '../utils/securityGuards.js';
import { ApiKeyRequest } from '../middleware/apiKey.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';

export const createOrder = async (req: ApiKeyRequest, res: Response) => {
  try {
    const merchant = req.merchant!;

    // Enforce global maintenance gate if SuperAdmin paused order initiation
    const settings = await SystemSetting.findOne().select('maintenanceMode maintenanceMessage').lean();
    if (settings?.maintenanceMode) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message:
            settings.maintenanceMessage ||
            'SumioPay is currently in maintenance mode. Payment initiation is temporarily paused.',
        },
      });
    }

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

    // Only authenticated server callers (JWT, API_KEY_SECRET, or SCOPED_KEY) may specify per-order webhook overrides.
    // Bare publishable frontend keys (API_KEY_ONLY) fall back to the merchant/project dashboard webhookUrl to block hijacking.
    const canOverrideWebhook = req.authMethod !== 'API_KEY_ONLY';
    let resolvedWebhookUrl = merchant.webhookUrl || '';
    if (req.apiKeyProjectId) {
      const project = await Project.findOne({ _id: req.apiKeyProjectId, merchantId: merchant._id, isActive: true })
        .select('webhookUrl')
        .lean();
      if (project?.webhookUrl) {
        resolvedWebhookUrl = project.webhookUrl;
      }
    }

    if (canOverrideWebhook && callbackWebhookUrl) {
      const webhookCheck = validateSafeWebhookUrl(callbackWebhookUrl);
      if (!webhookCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_WEBHOOK_URL', message: webhookCheck.reason },
        });
      }
      if (webhookCheck.url) {
        resolvedWebhookUrl = webhookCheck.url;
      }
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

    const resolvedIsTest = Boolean(isTest || req.headers['x-test-mode'] === 'true' || req.isTestKey);

    // Offline Listener Shield: protect customer payments if merchant enabled auto-pause when phone is offline
    const listenerGate = await checkMerchantListenerAvailability(merchant, resolvedIsTest);
    if (!listenerGate.allowed) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'NO_ONLINE_LISTENER',
          message: listenerGate.reason,
        },
        message: listenerGate.reason,
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
      isTest: resolvedIsTest,
      status: 'PENDING',
      upiIntentUrl,
      expiresAt,
      callbackWebhookUrl: resolvedWebhookUrl,
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
      'businessName name upiId upiName websiteName websiteUrl websiteLogoUrl brandColor gstin isActive email'
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
    const rawMeta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    const publicMetadata = {
      ...(rawMeta.planName ? { planName: rawMeta.planName } : {}),
      ...(rawMeta.planLabel ? { planLabel: rawMeta.planLabel } : {}),
      ...(rawMeta.websiteName ? { websiteName: rawMeta.websiteName } : {}),
      ...(billDetails ? { billDetails } : {}),
      ...(billDetails?.returnUrl || rawMeta.returnUrl
        ? { returnUrl: billDetails?.returnUrl || rawMeta.returnUrl }
        : {}),
    };

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        appName: order.appName,
        status: order.status,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        upiIntentUrl: order.upiIntentUrl,
        isTest: order.isTest || false,
        merchantName: branding.websiteName,
        merchantGstin: merchantObj.gstin || '',
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
        metadata: publicMetadata,
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
      const safeSearch = escapeRegex(String(search).trim().slice(0, 80));
      if (safeSearch) {
        query.$or = [
          { orderId: { $regex: safeSearch, $options: 'i' } },
          { utrNumber: { $regex: safeSearch, $options: 'i' } },
          { customerPhone: { $regex: safeSearch, $options: 'i' } },
        ];
      }
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

    const existing = await Order.findOne({ orderId, merchantId: merchant._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!existing.isTest) {
      return res.status(403).json({
        success: false,
        message: 'Live production orders cannot be simulated. Switch to Test Mode or use an sp_test_ API key.',
      });
    }

    if (existing.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already marked PAID' });
    }

    const fakeUtr = `SIM${Date.now().toString().slice(-9)}`;
    const order = await Order.findOneAndUpdate(
      { orderId, merchantId: merchant._id, isTest: true, status: { $ne: 'PAID' } },
      {
        $set: {
          status: 'PAID',
          utrNumber: fakeUtr,
          paidAt: new Date(),
          bankAppName: 'TEST_SANDBOX_SIMULATOR',
          rawNotificationMessage: `[Sandbox Test] Received Rs.${existing.exactAmount} on UPI ref ${fakeUtr}`,
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ success: false, message: 'Order could not be simulated or was already paid.' });
    }

    await finalizePaidOrderSideEffects({
      order,
      merchant,
      skipVolumeIncrement: true,
    });

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
      SecurityEvent.create({
        merchantId: order.merchantId,
        eventType: 'DUPLICATE_UTR_ATTEMPT',
        severity: 'HIGH',
        description: `Customer checkout UTR replay attempt (${cleanUtr}) already used on order ${replayOrder.orderId}.`,
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || '',
        metadata: { orderId: order.orderId, utr: cleanUtr, existingOrderId: replayOrder.orderId },
      }).catch(() => {});

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
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId: order.orderId, merchantId: order.merchantId, status: 'PENDING' },
        {
          $set: {
            status: 'PAID',
            utrNumber: cleanUtr,
            paidAt: new Date(),
            senderName: order.senderName || unmapped.senderName || '',
            bankAppName: order.bankAppName || unmapped.bankAppName || 'UTR_MATCHED',
            rawNotificationMessage: order.rawNotificationMessage || unmapped.rawMessage,
          },
        },
        { new: true }
      );

      if (updatedOrder) {
        unmapped.status = 'RESOLVED';
        unmapped.resolvedOrderId = order.orderId;
        unmapped.notes = `Matched via customer checkout UTR submission at ${new Date().toISOString()}`;
        await unmapped.save();

        await finalizePaidOrderSideEffects({ order: updatedOrder });

        return res.json({
          success: true,
          matchedImmediately: true,
          message: 'UTR matched with bank credit! Payment confirmed.',
          data: {
            orderId: updatedOrder.orderId,
            status: updatedOrder.status,
            baseAmount: updatedOrder.baseAmount,
            exactAmount: updatedOrder.exactAmount,
            utr: updatedOrder.utrNumber,
            utrNumber: updatedOrder.utrNumber,
            paidAt: updatedOrder.paidAt,
          },
        });
      }
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

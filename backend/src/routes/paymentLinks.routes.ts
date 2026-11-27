import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { PaymentLink } from '../models/paymentLink.model';
import { Merchant } from '../models/merchant.model';
import { Organization } from '../models/organization.model';
import { requireMerchantAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';
import { evaluateMerchantSubscription } from '../services/subscriptionActivation.service';
import {
  applyPaymentLinkCoupon,
  createMerchantOrder,
  OrderCreationError,
} from '../services/orderCreation.service';
import { sanitizeBrandColor, sanitizeSafeUrl } from '../utils/checkoutBranding';
import { checkMerchantListenerAvailability } from '../services/reliability.service';

export const paymentLinksRouter = Router();
export const publicPaymentLinksRouter = Router();

const publicLinkCheckoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout attempts. Please wait a minute.' },
});

function sanitizeSlug(raw: unknown): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || `pay-${crypto.randomBytes(3).toString('hex')}`;
}

function sanitizeCoupons(rawCoupons: unknown) {
  if (!Array.isArray(rawCoupons)) return [];
  return rawCoupons
    .map((c: any) => ({
      code: String(c?.code || '').toUpperCase().trim().slice(0, 24),
      discountType: (c?.discountType === 'PERCENT' ? 'PERCENT' : 'FLAT') as 'FLAT' | 'PERCENT',
      discountValue: Math.max(0, Number(c?.discountValue || 0)),
      isActive: c?.isActive !== false,
    }))
    .filter((c) => c.code && c.discountValue > 0)
    .slice(0, 10);
}

// Merchant Portal CRUD (/api/payment-links)
paymentLinksRouter.use(requireMerchantAuth, requireActiveSubscription);

paymentLinksRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const links = await PaymentLink.find({ merchantId: req.merchant!._id })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: links });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentLinksRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchant = req.merchant!;
    const {
      title,
      slug,
      description = '',
      amountMode = 'FIXED',
      amountInr = 0,
      minAmountInr = 1,
      appName = 'PAYMENT_LINK',
      websiteName = '',
      brandColor,
      returnUrl = '',
      saasPlanCode = '',
      coupons = [],
      collectName = true,
      collectEmail = true,
      collectPhone = false,
      maxUses = 0,
      expiresAt,
      isTest = false,
    } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ success: false, message: 'Payment link title is required' });
      return;
    }

    const mode = amountMode === 'OPEN' ? 'OPEN' : 'FIXED';
    const parsedFixed = Number(amountInr || 0);
    if (mode === 'FIXED' && (isNaN(parsedFixed) || parsedFixed < 1)) {
      res.status(400).json({ success: false, message: 'Fixed payment links require amount >= ₹1' });
      return;
    }

    let finalSlug = sanitizeSlug(slug || title);
    const conflict = await PaymentLink.findOne({ slug: finalSlug }).select('_id').lean();
    if (conflict) {
      finalSlug = `${finalSlug.slice(0, 52)}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const link = await PaymentLink.create({
      merchantId: merchant._id,
      slug: finalSlug,
      title: String(title).trim().slice(0, 120),
      description: String(description || '').trim().slice(0, 500),
      amountMode: mode,
      amountInr: mode === 'FIXED' ? parsedFixed : 0,
      minAmountInr: Math.max(1, Number(minAmountInr || 1)),
      appName: String(appName || 'PAYMENT_LINK').toUpperCase().trim(),
      websiteName: String(websiteName || merchant.websiteName || merchant.businessName || '').trim().slice(0, 80),
      brandColor: sanitizeBrandColor(brandColor || merchant.brandColor),
      returnUrl: sanitizeSafeUrl(returnUrl),
      saasPlanCode: String(saasPlanCode || '').toUpperCase().trim(),
      coupons: sanitizeCoupons(coupons),
      collectName: Boolean(collectName),
      collectEmail: Boolean(collectEmail),
      collectPhone: Boolean(collectPhone),
      maxUses: Math.max(0, parseInt(maxUses, 10) || 0),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isTest: Boolean(isTest),
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Payment link created', data: link });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentLinksRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const link = await PaymentLink.findOne({ _id: req.params.id, merchantId: req.merchant!._id });
    if (!link) {
      res.status(404).json({ success: false, message: 'Payment link not found' });
      return;
    }

    const { title, description, amountMode, amountInr, minAmountInr, coupons, returnUrl, isActive } = req.body;
    if (title !== undefined && String(title).trim()) link.title = String(title).trim().slice(0, 120);
    if (description !== undefined) link.description = String(description || '').trim().slice(0, 500);
    if (amountMode === 'FIXED' || amountMode === 'OPEN') link.amountMode = amountMode;
    if (amountInr !== undefined) link.amountInr = Math.max(0, Number(amountInr || 0));
    if (minAmountInr !== undefined) link.minAmountInr = Math.max(1, Number(minAmountInr || 1));
    if (coupons !== undefined) link.coupons = sanitizeCoupons(coupons);
    if (returnUrl !== undefined) link.returnUrl = sanitizeSafeUrl(returnUrl);
    if (isActive !== undefined) link.isActive = Boolean(isActive);

    await link.save();
    res.status(200).json({ success: true, message: 'Payment link updated', data: link });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentLinksRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = await PaymentLink.findOneAndDelete({
      _id: req.params.id,
      merchantId: req.merchant!._id,
    });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Payment link not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Payment link deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public Hosted Link Resolution & Checkout (/api/public/pay-link/:slug)
publicPaymentLinksRouter.get('/pay-link/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const link = await PaymentLink.findOne({ slug }).lean();
    if (!link) {
      res.status(404).json({ success: false, message: 'Payment link not found or deleted' });
      return;
    }

    const merchant = await Merchant.findById(link.merchantId);
    if (!merchant || !merchant.isActive) {
      res.status(404).json({ success: false, message: 'Merchant account unavailable' });
      return;
    }

    const entitlement = await evaluateMerchantSubscription(merchant);
    const org = merchant.email
      ? await Organization.findOne({ billingEmail: merchant.email }).select('kycStatus').lean()
      : null;

    const isExpired = Boolean(link.expiresAt && new Date() > new Date(link.expiresAt));
    const maxReached = Boolean(link.maxUses > 0 && link.usesCount >= link.maxUses);
    const listenerGate = await checkMerchantListenerAvailability(merchant as any, Boolean(link.isTest));

    res.status(200).json({
      success: true,
      data: {
        slug: link.slug,
        title: link.title,
        description: link.description,
        amountMode: link.amountMode,
        amountInr: link.amountInr,
        minAmountInr: link.minAmountInr,
        websiteName: link.websiteName || merchant.websiteName || merchant.businessName,
        websiteLogoUrl: merchant.websiteLogoUrl || '',
        brandColor: sanitizeBrandColor(link.brandColor || merchant.brandColor),
        kycVerified: org?.kycStatus === 'VERIFIED',
        collectName: link.collectName,
        collectEmail: link.collectEmail,
        collectPhone: link.collectPhone,
        hasCoupons: Array.isArray(link.coupons) && link.coupons.some((c) => c.isActive !== false),
        isTest: Boolean(link.isTest),
        available:
          Boolean(link.isActive) &&
          !isExpired &&
          !maxReached &&
          entitlement.isEntitled &&
          listenerGate.allowed,
        unavailableReason: !link.isActive
          ? 'This payment link has been paused by the merchant.'
          : isExpired
          ? 'This payment link has expired.'
          : maxReached
          ? 'This payment link has reached its maximum payment limit.'
          : !entitlement.isEntitled
          ? 'Merchant plan is currently paused.'
          : !listenerGate.allowed
          ? listenerGate.reason
          : '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Preview coupon discount publicly without revealing coupon list
publicPaymentLinksRouter.post('/pay-link/:slug/apply-coupon', async (req: Request, res: Response): Promise<void> => {
  try {
    const link = await PaymentLink.findOne({
      slug: String(req.params.slug || '').toLowerCase().trim(),
      isActive: true,
    }).lean();
    if (!link) {
      res.status(404).json({ success: false, message: 'Payment link not found' });
      return;
    }

    const base = link.amountMode === 'FIXED' ? link.amountInr : Math.max(link.minAmountInr, Number(req.body.amountInr || 0));
    const pricing = applyPaymentLinkCoupon(base, link.coupons, req.body.couponCode);
    if (!pricing.appliedCouponCode) {
      res.status(400).json({ success: false, message: 'Invalid or inactive coupon code' });
      return;
    }

    res.status(200).json({ success: true, data: pricing });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

publicPaymentLinksRouter.post('/pay-link/:slug/checkout', publicLinkCheckoutLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const link = await PaymentLink.findOne({ slug });
    if (!link || !link.isActive) {
      res.status(404).json({ success: false, message: 'Payment link is inactive or not found' });
      return;
    }
    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      res.status(410).json({ success: false, message: 'This payment link has expired' });
      return;
    }
    if (link.maxUses > 0 && link.usesCount >= link.maxUses) {
      res.status(410).json({ success: false, message: 'This payment link has reached its maximum uses' });
      return;
    }

    const merchant = await Merchant.findById(link.merchantId);
    if (!merchant || !merchant.isActive) {
      res.status(403).json({ success: false, message: 'Merchant account unavailable' });
      return;
    }

    const entitlement = await evaluateMerchantSubscription(merchant);
    if (!entitlement.isEntitled) {
      res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Merchant SumioPay subscription is expired.',
      });
      return;
    }

    const requestedInr = link.amountMode === 'FIXED' ? link.amountInr : Number(req.body.customAmountInr || 0);
    if (isNaN(requestedInr) || requestedInr < (link.minAmountInr || 1)) {
      res.status(400).json({
        success: false,
        message: `Please enter an amount of at least ₹${link.minAmountInr || 1}.`,
      });
      return;
    }

    const { customerName = '', customerEmail = '', customerPhone = '', couponCode = '' } = req.body;
    const pricing = applyPaymentLinkCoupon(requestedInr, link.coupons, couponCode);

    const customerUserId =
      String(req.body.customerUserId || '').trim() ||
      String(customerEmail || customerPhone || customerName || 'guest').trim();

    const created = await createMerchantOrder({
      merchant,
      baseAmountInr: pricing.finalInr,
      appName: link.appName || 'PAYMENT_LINK',
      customerUserId,
      customerPhone: String(customerPhone || '').trim(),
      customerEmail: String(customerEmail || '').trim(),
      isTest: Boolean(link.isTest),
      metadata: {
        paymentLinkId: link._id.toString(),
        paymentLinkSlug: link.slug,
        planName: link.title,
        customerName: String(customerName || '').trim(),
        websiteName: link.websiteName || merchant.websiteName || merchant.businessName,
        brandColor: link.brandColor || merchant.brandColor,
        returnUrl: link.returnUrl || '',
        ...(link.saasPlanCode ? { saasPlanCode: link.saasPlanCode } : {}),
      },
      billDetails: {
        items: [{ label: link.title, quantity: 1, amount: pricing.subtotalInr }],
        subtotal: pricing.subtotalInr,
        ...(pricing.appliedCouponCode ? { couponCode: pricing.appliedCouponCode } : {}),
        ...(pricing.discountInr > 0 ? { discountAmount: pricing.discountInr } : {}),
        ...(link.description ? { note: link.description } : {}),
        ...(link.returnUrl ? { returnUrl: link.returnUrl } : {}),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: created.order.orderId,
        hostedCheckoutUrl: created.hostedCheckoutUrl,
        baseAmount: created.order.baseAmount,
        exactAmount: created.order.exactAmount,
        status: created.order.status,
      },
    });
  } catch (err: any) {
    if (err instanceof OrderCreationError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

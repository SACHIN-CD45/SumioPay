import { Router, Request, Response } from 'express';
import { SaasPlan } from '../../models/saasPlan.model';
import { CustomerEntitlement } from '../../models/customerEntitlement.model';
import { requireMerchantAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ApiKeyRequest, requireApiKeyOrMerchantAuth } from '../../middleware/apiKey.middleware';
import { requireActiveSubscription } from '../../middleware/subscription.middleware';
import { checkOrProvisionCustomerEntitlement } from '../../services/saasEntitlement.service';
import { createMerchantOrder, OrderCreationError } from '../../services/orderCreation.service';
import { sanitizeSafeUrl } from '../../utils/checkoutBranding';

export const merchantSaasPlansRouter = Router();
export const v1EntitlementsRouter = Router();

// ---------------------------------------------------------------------------
// 1. Merchant Portal Management (/api/saas-plans)
// ---------------------------------------------------------------------------
merchantSaasPlansRouter.use(requireMerchantAuth, requireActiveSubscription);

merchantSaasPlansRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const [plans, customers] = await Promise.all([
      SaasPlan.find({ merchantId }).sort({ priceInr: 1 }).lean(),
      CustomerEntitlement.find({ merchantId }).sort({ updatedAt: -1 }).limit(100).lean(),
    ]);

    const now = Date.now();
    const enrichedCustomers = customers.map((c: any) => {
      const expiresMs = new Date(c.expiresAt).getTime();
      const isActive = expiresMs > now && c.status !== 'EXPIRED';
      return {
        ...c,
        status: isActive ? c.status : 'EXPIRED',
        daysRemaining: isActive ? Math.max(1, Math.ceil((expiresMs - now) / 86_400_000)) : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        plans,
        customers: enrichedCustomers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

merchantSaasPlansRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const {
      planCode,
      name,
      description = '',
      priceInr,
      durationDays = 30,
      trialDays = 0,
      features = [],
      returnUrl = '',
    } = req.body;

    const cleanCode = String(planCode || name || '')
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);

    if (!cleanCode || !name || Number(priceInr) < 1) {
      res.status(400).json({ success: false, message: 'Plan code, name, and price >= ₹1 are required.' });
      return;
    }

    const plan = await SaasPlan.findOneAndUpdate(
      { merchantId, planCode: cleanCode },
      {
        $set: {
          planCode: cleanCode,
          name: String(name).trim().slice(0, 100),
          description: String(description || '').trim().slice(0, 400),
          priceInr: Number(Number(priceInr).toFixed(2)),
          durationDays: Math.min(3650, Math.max(1, parseInt(durationDays, 10) || 30)),
          trialDays: Math.min(90, Math.max(0, parseInt(trialDays, 10) || 0)),
          features: Array.isArray(features)
            ? features.map((f) => String(f).trim()).filter(Boolean).slice(0, 10)
            : [],
          returnUrl: sanitizeSafeUrl(returnUrl),
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'SaaS Plan saved cleanly', data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

merchantSaasPlansRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plan = await SaasPlan.findOne({ _id: req.params.id, merchantId: req.merchant!._id });
    if (!plan) {
      res.status(404).json({ success: false, message: 'SaaS plan not found' });
      return;
    }
    if (req.body.isActive !== undefined) plan.isActive = Boolean(req.body.isActive);
    if (req.body.name !== undefined && String(req.body.name).trim()) plan.name = String(req.body.name).trim();
    if (req.body.priceInr !== undefined && Number(req.body.priceInr) >= 1) plan.priceInr = Number(req.body.priceInr);
    if (req.body.durationDays !== undefined) plan.durationDays = Math.max(1, parseInt(req.body.durationDays, 10) || 30);
    if (req.body.trialDays !== undefined) plan.trialDays = Math.max(0, parseInt(req.body.trialDays, 10) || 0);
    await plan.save();
    res.status(200).json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

merchantSaasPlansRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = await SaasPlan.findOneAndDelete({ _id: req.params.id, merchantId: req.merchant!._id });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'SaaS plan not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'SaaS plan deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

merchantSaasPlansRouter.post('/manual-grant', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const { customerUserId, customerEmail = '', planCode, durationDays = 30 } = req.body;
    const cleanUser = String(customerUserId || '').trim();
    if (!cleanUser) {
      res.status(400).json({ success: false, message: 'customerUserId is required' });
      return;
    }
    const days = Math.min(3650, Math.max(1, parseInt(durationDays, 10) || 30));
    const plan = planCode
      ? await SaasPlan.findOne({ merchantId, planCode: String(planCode).toUpperCase().trim() }).lean()
      : null;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 86_400_000);
    const updated = await CustomerEntitlement.findOneAndUpdate(
      { merchantId, customerUserId: cleanUser },
      {
        $set: {
          planCode: plan?.planCode || String(planCode || 'MANUAL').toUpperCase().trim(),
          planName: plan?.name || `${days} Days Manual Access`,
          status: 'ACTIVE',
          expiresAt,
          ...(customerEmail ? { customerEmail: String(customerEmail).trim() } : {}),
        },
        $setOnInsert: { startedAt: now, trialGranted: false, activatedOrderIds: [] },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: `Granted ${days} day(s) access to ${cleanUser}`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Developer "SaaS-in-a-Box" API (/api/v1/entitlements/*)
// ---------------------------------------------------------------------------
v1EntitlementsRouter.use(requireApiKeyOrMerchantAuth, requireActiveSubscription);

v1EntitlementsRouter.get('/plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiReq = req as ApiKeyRequest;
    const plans = await SaasPlan.find({ merchantId: apiReq.merchant!._id, isActive: true })
      .sort({ priceInr: 1 })
      .select('planCode name description priceInr durationDays trialDays features')
      .lean();
    res.status(200).json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

v1EntitlementsRouter.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiReq = req as ApiKeyRequest;
    const customerUserId = String(req.query.customerUserId || '').trim();
    const planCode = typeof req.query.planCode === 'string' ? req.query.planCode : undefined;
    const customerEmail = typeof req.query.customerEmail === 'string' ? req.query.customerEmail : undefined;

    if (!customerUserId) {
      res.status(400).json({ success: false, message: 'Query parameter customerUserId is required' });
      return;
    }

    const result = await checkOrProvisionCustomerEntitlement({
      merchant: apiReq.merchant!,
      customerUserId,
      planCode,
      customerEmail,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

v1EntitlementsRouter.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiReq = req as ApiKeyRequest;
    const merchant = apiReq.merchant!;
    const {
      customerUserId,
      planCode,
      customerEmail = '',
      customerPhone = '',
      returnUrl = '',
      isTest,
    } = req.body;

    if (!customerUserId || !planCode) {
      res.status(400).json({ success: false, message: 'customerUserId and planCode are required' });
      return;
    }

    const plan = await SaasPlan.findOne({
      merchantId: merchant._id,
      planCode: String(planCode).toUpperCase().trim(),
      isActive: true,
    });
    if (!plan) {
      res.status(404).json({ success: false, message: `Active SaaS plan "${planCode}" not found` });
      return;
    }

    const resolvedReturnUrl = sanitizeSafeUrl(returnUrl || plan.returnUrl);

    const created = await createMerchantOrder({
      merchant,
      baseAmountInr: plan.priceInr,
      appName: plan.planCode,
      customerUserId: String(customerUserId).trim(),
      customerEmail: String(customerEmail || '').trim(),
      customerPhone: String(customerPhone || '').trim(),
      isTest: Boolean(isTest || req.headers['x-test-mode'] === 'true' || apiReq.isTestKey),
      metadata: {
        saasPlanCode: plan.planCode,
        saasDurationDays: plan.durationDays,
        planName: plan.name,
        websiteName: merchant.websiteName || merchant.businessName,
        brandColor: merchant.brandColor,
        ...(resolvedReturnUrl ? { returnUrl: resolvedReturnUrl } : {}),
      },
      billDetails: {
        items: [{ label: `${plan.name} (${plan.durationDays} Days)`, quantity: 1, amount: plan.priceInr }],
        subtotal: plan.priceInr,
        note: plan.description || `${plan.durationDays}-day software license access.`,
        ...(resolvedReturnUrl ? { returnUrl: resolvedReturnUrl } : {}),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: created.order.orderId,
        hostedCheckoutUrl: created.hostedCheckoutUrl,
        planCode: plan.planCode,
        planName: plan.name,
        priceInr: plan.priceInr,
        durationDays: plan.durationDays,
        exactAmount: created.order.exactAmount,
        upiIntentUrl: created.order.upiIntentUrl,
      },
    });
  } catch (err: any) {
    if (err instanceof OrderCreationError) {
      res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
      return;
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

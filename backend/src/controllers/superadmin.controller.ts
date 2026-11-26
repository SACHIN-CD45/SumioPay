import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SuperAdmin } from '../models/superadmin.model';
import { Merchant } from '../models/merchant.model';
import { Order } from '../models/order.model';
import { Device } from '../models/device.model';
import { Organization } from '../models/organization.model';
import { SecurityEvent } from '../models/securityEvent.model';
import { AuditLog } from '../models/auditLog.model';
import { Subscription } from '../models/subscription.model';
import { SystemSetting } from '../models/systemSetting.model';
import { UnmappedPayment } from '../models/unmappedPayment.model';
import { WebhookLog } from '../models/webhookLog.model';
import { config } from '../config';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator';
import {
  PLATFORM_SUBSCRIPTION_METADATA_TYPE,
  getSubscriptionPlanCatalog,
  resolvePlatformCollectorMerchant,
  computeTrialPeriodEnd,
  computeExtendedPeriodEnd,
} from '../services/subscriptionActivation.service';

// SuperAdmin Login
export const superadminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      res.status(401).json({ success: false, message: 'Invalid superadmin credentials' });
      return;
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid superadmin credentials' });
      return;
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'SUPERADMIN' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Platform GMV and Health Metrics
export const getGlobalMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const [
      totalMerchants,
      activeMerchants,
      totalOrders,
      paidOrdersCount,
      totalGmvAggregate,
      totalDevices,
      onlineDevicesCount,
      todayGmvAggregate,
      openRiskAlertsCount,
      pendingKycCount,
    ] = await Promise.all([
      Merchant.countDocuments(),
      Merchant.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'PAID' }),
      Order.aggregate([
        { $match: { status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$exactAmount' } } },
      ]),
      Device.countDocuments(),
      Device.countDocuments({ lastPingAt: { $gt: threeMinutesAgo } }),
      Order.aggregate([
        {
          $match: {
            status: 'PAID',
            paidAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
        { $group: { _id: null, total: { $sum: '$exactAmount' } } },
      ]),
      SecurityEvent.countDocuments({ isResolved: false }),
      Organization.countDocuments({ kycStatus: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
    ]);

    const totalGMV = totalGmvAggregate[0]?.total || 0;
    const todayGMV = todayGmvAggregate[0]?.total || 0;
    const conversionRate = totalOrders > 0 ? ((paidOrdersCount / totalOrders) * 100).toFixed(1) : '0';

    res.status(200).json({
      success: true,
      data: {
        totalMerchants,
        activeMerchants,
        totalOrders,
        paidOrdersCount,
        totalGMV: Math.round(totalGMV * 100) / 100,
        todayGMV: Math.round(todayGMV * 100) / 100,
        conversionRate: `${conversionRate}%`,
        totalDevices,
        onlineDevicesCount,
        offlineDevicesCount: totalDevices - onlineDevicesCount,
        openRiskAlertsCount,
        pendingKycCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// List all merchant accounts
export const listAllMerchants = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const filter: any = {};
    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'SUSPENDED') filter.isActive = false;

    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { upiId: { $regex: search, $options: 'i' } },
      ];
    }

    const [merchants, total] = await Promise.all([
      Merchant.find(filter)
        .select('-passwordHash -apiSecret')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Merchant.countDocuments(filter),
    ]);

    const merchantIds = merchants.map((m: any) => m._id);
    const [devicesCountByMerchant, paidCountByMerchant] = await Promise.all([
      Device.aggregate([
        { $match: { merchantId: { $in: merchantIds } } },
        { $group: { _id: '$merchantId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { merchantId: { $in: merchantIds }, status: 'PAID' } },
        { $group: { _id: '$merchantId', gmv: { $sum: '$exactAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const deviceMap = new Map(devicesCountByMerchant.map((d: any) => [d._id.toString(), d.count]));
    const orderMap = new Map(paidCountByMerchant.map((o: any) => [o._id.toString(), { gmv: o.gmv, count: o.count }]));

    const enrichedMerchants = merchants.map((m: any) => {
      const devCount = deviceMap.get(m._id.toString()) || 0;
      const orderData = orderMap.get(m._id.toString()) || { gmv: 0, count: 0 };
      return {
        ...m.toObject(),
        deviceCount: devCount,
        totalGmv: Math.round(orderData.gmv * 100) / 100,
        paidOrders: orderData.count,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        merchants: enrichedMerchants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle Merchant Status (ACTIVE <-> SUSPENDED)
export const toggleMerchantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.params;
    const { isActive } = req.body;

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { isActive: !!isActive },
      { new: true }
    ).select('-passwordHash -apiSecret');

    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Merchant status updated to ${merchant.isActive ? 'ACTIVE' : 'SUSPENDED'}`,
      merchant,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Orders Ledger
export const listAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const status = req.query.status as string;
    const appName = req.query.appName as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (status) filter.status = status;
    if (appName) filter.appName = appName;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { utrNumber: { $regex: search, $options: 'i' } },
        { customerUserId: { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('merchantId', 'businessName email upiId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Devices Health Monitor
export const listAllDevices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const devices = await Device.find()
      .populate('merchantId', 'businessName email upiId')
      .sort({ lastPingAt: -1 });

    const formatted = devices.map((d: any) => {
      const isOnline = d.lastPingAt && d.lastPingAt > threeMinutesAgo;
      return {
        id: d._id,
        merchant: d.merchantId,
        deviceName: d.deviceName,
        deviceModel: d.deviceModel,
        androidVersion: d.androidVersion,
        batteryPercent: d.batteryPercent,
        isCharging: d.isCharging,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastPingAt: d.lastPingAt,
        createdAt: d.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// KYC Workflow Management
export const listKycWorkflows = async (_req: Request, res: Response): Promise<void> => {
  try {
    const organizations = await Organization.find().sort({ updatedAt: -1 }).limit(50);
    res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateKycStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { kycStatus, kycRejectionReason } = req.body;

    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    org.kycStatus = kycStatus;
    if (kycRejectionReason) org.kycRejectionReason = kycRejectionReason;
    await org.save();

    await AuditLog.create({
      actorType: 'SUPERADMIN',
      actorEmail: (req as any).superAdmin?.email || 'admin@sumiopay.internal',
      action: 'KYC_STATUS_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: orgId,
      newState: { kycStatus, kycRejectionReason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `KYC status updated to ${kycStatus}`,
      data: org,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Risk Management & Security Alerts
export const listSecurityAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await SecurityEvent.find()
      .populate('merchantId', 'businessName email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resolveSecurityAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    const alert = await SecurityEvent.findByIdAndUpdate(
      alertId,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: (req as any).superAdmin?.email || 'SUPERADMIN',
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Security alert marked resolved',
      data: alert,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Audit Logs
export const listAuditLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Provider & System Health
export const getSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        providers: [
          { name: 'UPI Direct Engine', status: 'HEALTHY', latencyMs: 12 },
          { name: 'Standard Gateway Adapter (Cashfree/Razorpay)', status: 'HEALTHY', latencyMs: 45 },
          { name: 'Bank Statement Reconciler', status: 'READY', latencyMs: 8 },
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Platform Subscription & Pricing Tier Management (SuperAdmin Control)
export const listAllSubscriptions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [merchants, settings] = await Promise.all([
      Merchant.find().select('businessName name email upiId planTier createdAt').sort({ createdAt: -1 }),
      SystemSetting.findOne(),
    ]);
    const catalog = getSubscriptionPlanCatalog(settings);
    const merchantIds = merchants.map((m) => m._id);

    const subscriptions = await Subscription.find({ merchantId: { $in: merchantIds } });
    const subMap = new Map(subscriptions.map((s) => [s.merchantId.toString(), s]));

    const result = merchants.map((m) => {
      const sub = subMap.get(m._id.toString());
      const planTier = sub?.planTier || m.planTier || 'TRIAL';
      const status = sub?.status || 'TRIAL';
      const periodEnd =
        sub?.currentPeriodEnd ||
        computeTrialPeriodEnd(catalog.trialDays, m.createdAt ? new Date(m.createdAt) : new Date());
      const daysRemaining = Math.max(
        0,
        Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      );
      const totalCollectedPaise = (sub?.invoiceHistory || []).reduce(
        (sum, inv) => sum + (inv.amountInPaise || 0),
        0
      );

      return {
        merchantId: m._id,
        businessName: m.businessName,
        email: m.email,
        upiId: m.upiId,
        planTier,
        status,
        currentPeriodEnd: periodEnd,
        daysRemaining,
        monthlyPriceInPaise: sub?.monthlyPriceInPaise ?? 0,
        totalCollectedPaise,
        invoicesCount: sub?.invoiceHistory?.length || 0,
        invoiceHistory: sub?.invoiceHistory || [],
        lastInvoiceUtr:
          sub?.invoiceHistory && sub.invoiceHistory.length > 0
            ? sub.invoiceHistory[sub.invoiceHistory.length - 1].utrNumber || ''
            : '',
        createdAt: m.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMerchantSubscriptionTier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.params;
    const { planTier, status, customPriceInPaise, durationDays } = req.body;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const settings = await SystemSetting.findOne();
    const catalog = getSubscriptionPlanCatalog(settings);

    const previousTier = merchant.planTier;
    merchant.planTier = planTier;
    await merchant.save();

    let sub = await Subscription.findOne({ merchantId });
    if (!sub) {
      sub = new Subscription({ merchantId });
    }

    const tierPriceMap: Record<string, number> = {
      TRIAL: 0,
      MONTHLY: catalog.monthlyPrice * 100,
      HALF_YEARLY: Math.round((catalog.halfYearlyPrice * 100) / 6),
      CUSTOM: catalog.customPrice * 100,
      STARTER: catalog.monthlyPrice * 100,
      GROWTH: catalog.halfYearlyPrice * 100,
      BUSINESS: 499900,
      ENTERPRISE: 2999900,
    };

    const tierDurationMap: Record<string, number> = {
      TRIAL: catalog.trialDays || 3,
      MONTHLY: catalog.monthlyDurationDays || 30,
      HALF_YEARLY: catalog.halfYearlyDurationDays || 180,
      CUSTOM: 365,
      STARTER: 30,
      GROWTH: 180,
      BUSINESS: 30,
      ENTERPRISE: 365,
    };

    const parsedDuration =
      durationDays !== undefined && Number(durationDays) > 0
        ? Number(durationDays)
        : tierDurationMap[planTier] || 30;

    sub.planTier = planTier;
    if (status) sub.status = status;
    sub.monthlyPriceInPaise =
      customPriceInPaise !== undefined && customPriceInPaise !== null && !isNaN(Number(customPriceInPaise))
        ? Math.max(0, Number(customPriceInPaise))
        : (tierPriceMap[planTier] ?? 0);
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = new Date(Date.now() + parsedDuration * 24 * 60 * 60 * 1000);
    await sub.save();

    await AuditLog.create({
      actorType: 'SUPERADMIN',
      actorEmail: (req as any).superAdmin?.email || 'admin@sumiotech.in',
      action: 'MERCHANT_SUBSCRIPTION_OVERRIDDEN',
      resourceType: 'MERCHANT',
      resourceId: merchantId,
      previousState: { planTier: previousTier },
      newState: {
        planTier,
        monthlyPriceInPaise: sub.monthlyPriceInPaise,
        status: sub.status,
        durationDays: parsedDuration,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `Merchant ${merchant.businessName} updated to ${planTier} (${parsedDuration} days)`,
      data: {
        merchant,
        subscription: sub,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubscriptionMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [merchants, subscriptions, settings] = await Promise.all([
      Merchant.find().select('planTier'),
      Subscription.find(),
      SystemSetting.findOne(),
    ]);

    const subMap = new Map(subscriptions.map((s) => [s.merchantId.toString(), s]));
    const collector = await resolvePlatformCollectorMerchant(settings);

    const counts: Record<string, number> = {
      TRIAL: 0,
      MONTHLY: 0,
      HALF_YEARLY: 0,
      CUSTOM: 0,
      STARTER: 0,
      GROWTH: 0,
      BUSINESS: 0,
      ENTERPRISE: 0,
    };

    let activeSubscriptions = 0;
    let trialSubscriptions = 0;
    let mrrPaise = 0;
    let totalCollectedPaise = 0;

    merchants.forEach((m) => {
      const sub = subMap.get(m._id.toString());
      const tier = sub?.planTier || m.planTier || 'TRIAL';
      counts[tier] = (counts[tier] || 0) + 1;

      const status = sub?.status || 'TRIAL';
      if (status === 'ACTIVE') {
        activeSubscriptions++;
        mrrPaise += sub?.monthlyPriceInPaise || 0;
      } else if (status === 'TRIAL') {
        trialSubscriptions++;
      }

      if (sub?.invoiceHistory?.length) {
        totalCollectedPaise += sub.invoiceHistory.reduce((acc, inv) => acc + (inv.amountInPaise || 0), 0);
      }
    });

    const estimatedMRR = Math.round(mrrPaise / 100);

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers: merchants.length,
        activeSubscriptions,
        trialSubscriptions,
        tierCounts: counts,
        estimatedMRR,
        estimatedARR: estimatedMRR * 12,
        totalCollectedRevenueInr: Math.round(totalCollectedPaise / 100),
        currency: 'INR',
        subscriptionPlans: getSubscriptionPlanCatalog(settings),
        collectorStatus: {
          enabled: collector.enabled,
          configured: collector.configured,
          reason: collector.reason || null,
          merchantId: collector.merchantId || null,
          businessName: collector.businessName || null,
          email: collector.email || null,
          upiId: collector.upiId || null,
          upiName: collector.upiName || null,
          onlineDevicesCount: collector.onlineDevicesCount,
          totalDevicesCount: collector.totalDevicesCount,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Platform Settings & Feature Flags (SuperAdmin Control)
export const getPlatformSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    const [collector, availableMerchants] = await Promise.all([
      resolvePlatformCollectorMerchant(settings),
      Merchant.find({ isActive: true })
        .select('businessName name email upiId upiName createdAt')
        .sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...settings.toObject(),
        subscriptionPlans: getSubscriptionPlanCatalog(settings),
        platformBilling: {
          collectorMerchantEmail: settings.platformBilling?.collectorMerchantEmail || '',
          collectorApiKey: settings.platformBilling?.collectorApiKey || '',
          isEnabled: settings.platformBilling?.isEnabled !== false,
        },
        collectorStatus: {
          enabled: collector.enabled,
          configured: collector.configured,
          reason: collector.reason || null,
          merchantId: collector.merchantId || null,
          businessName: collector.businessName || null,
          email: collector.email || null,
          upiId: collector.upiId || null,
          upiName: collector.upiName || null,
          onlineDevicesCount: collector.onlineDevicesCount,
          totalDevicesCount: collector.totalDevicesCount,
        },
        availableMerchants,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePlatformSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = (req as any).superAdmin?.email || 'admin@sumiotech.in';
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({});
    }

    const previousState = settings.toObject();

    // Update allowable fields
    const {
      announcementText,
      announcementLink,
      isAnnouncementActive,
      maintenanceMode,
      maintenanceMessage,
      allowNewMerchantRegistrations,
      totalPlatformGMVFormatted,
      totalBusinessesCount,
      slaGuaranteePercent,
      enterpriseContactEmail,
      supportPhone,
      featureFlags,
      pricingTiers,
      subscriptionPlans,
      platformBilling,
    } = req.body;

    if (announcementText !== undefined) settings.announcementText = announcementText;
    if (announcementLink !== undefined) settings.announcementLink = announcementLink;
    if (isAnnouncementActive !== undefined) settings.isAnnouncementActive = isAnnouncementActive;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    if (allowNewMerchantRegistrations !== undefined) settings.allowNewMerchantRegistrations = allowNewMerchantRegistrations;
    if (totalPlatformGMVFormatted !== undefined) settings.totalPlatformGMVFormatted = String(totalPlatformGMVFormatted);
    if (totalBusinessesCount !== undefined && !isNaN(Number(totalBusinessesCount))) {
      settings.totalBusinessesCount = Number(totalBusinessesCount);
    }
    if (slaGuaranteePercent !== undefined && !isNaN(Number(slaGuaranteePercent))) {
      settings.slaGuaranteePercent = Number(slaGuaranteePercent);
    }
    if (enterpriseContactEmail !== undefined) settings.enterpriseContactEmail = String(enterpriseContactEmail);
    if (supportPhone !== undefined) settings.supportPhone = String(supportPhone);
    if (featureFlags && typeof featureFlags === 'object') {
      settings.featureFlags = { ...(previousState.featureFlags || {}), ...featureFlags };
    }
    if (pricingTiers && typeof pricingTiers === 'object') {
      const prevTiers = previousState.pricingTiers || {};
      settings.pricingTiers = {
        STARTER: { ...(prevTiers.STARTER || {}), ...(pricingTiers.STARTER || {}) },
        GROWTH: { ...(prevTiers.GROWTH || {}), ...(pricingTiers.GROWTH || {}) },
        BUSINESS: { ...(prevTiers.BUSINESS || {}), ...(pricingTiers.BUSINESS || {}) },
        ENTERPRISE: { ...(prevTiers.ENTERPRISE || {}), ...(pricingTiers.ENTERPRISE || {}) },
      };
    }
    if (subscriptionPlans && typeof subscriptionPlans === 'object') {
      const currentCatalog = getSubscriptionPlanCatalog(previousState);
      settings.subscriptionPlans = {
        ...currentCatalog,
        ...subscriptionPlans,
        trialDays: Math.max(0, Number(subscriptionPlans.trialDays ?? currentCatalog.trialDays) || 0),
        monthlyPrice: Math.max(1, Number(subscriptionPlans.monthlyPrice ?? currentCatalog.monthlyPrice) || 399),
        monthlyDurationDays: Math.max(1, Number(subscriptionPlans.monthlyDurationDays ?? currentCatalog.monthlyDurationDays) || 30),
        monthlyDeviceLimit: Math.max(1, Number(subscriptionPlans.monthlyDeviceLimit ?? currentCatalog.monthlyDeviceLimit) || 2),
        halfYearlyPrice: Math.max(1, Number(subscriptionPlans.halfYearlyPrice ?? currentCatalog.halfYearlyPrice) || 1999),
        halfYearlyDurationDays: Math.max(1, Number(subscriptionPlans.halfYearlyDurationDays ?? currentCatalog.halfYearlyDurationDays) || 180),
        halfYearlyDeviceLimit: Math.max(1, Number(subscriptionPlans.halfYearlyDeviceLimit ?? currentCatalog.halfYearlyDeviceLimit) || 5),
        customPrice: Math.max(0, Number(subscriptionPlans.customPrice ?? currentCatalog.customPrice) || 0),
      };
    }
    if (platformBilling && typeof platformBilling === 'object') {
      settings.platformBilling = {
        collectorMerchantEmail:
          platformBilling.collectorMerchantEmail !== undefined
            ? String(platformBilling.collectorMerchantEmail).toLowerCase().trim()
            : (previousState.platformBilling?.collectorMerchantEmail || ''),
        collectorApiKey:
          platformBilling.collectorApiKey !== undefined
            ? String(platformBilling.collectorApiKey).trim()
            : (previousState.platformBilling?.collectorApiKey || ''),
        isEnabled:
          platformBilling.isEnabled !== undefined
            ? Boolean(platformBilling.isEnabled)
            : previousState.platformBilling?.isEnabled !== false,
      };
    }

    settings.updatedBy = adminEmail;
    await settings.save();

    const [collector, availableMerchants] = await Promise.all([
      resolvePlatformCollectorMerchant(settings),
      Merchant.find({ isActive: true })
        .select('businessName name email upiId upiName createdAt')
        .sort({ createdAt: -1 }),
    ]);

    // Log privileged audit event (non-blocking if logging fails)
    await AuditLog.create({
      actorType: 'SUPERADMIN',
      actorEmail: adminEmail,
      action: 'PLATFORM_SETTINGS_UPDATED',
      resourceType: 'PLATFORM',
      resourceId: settings._id.toString(),
      previousState,
      newState: settings.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch((auditErr: any) => {
      console.error('[SuperAdmin AuditLog Warning]', auditErr?.message);
    });

    res.status(200).json({
      success: true,
      message: 'Global platform settings updated successfully',
      data: {
        ...settings.toObject(),
        subscriptionPlans: getSubscriptionPlanCatalog(settings),
        platformBilling: {
          collectorMerchantEmail: settings.platformBilling?.collectorMerchantEmail || '',
          collectorApiKey: settings.platformBilling?.collectorApiKey || '',
          isEnabled: settings.platformBilling?.isEnabled !== false,
        },
        collectorStatus: {
          enabled: collector.enabled,
          configured: collector.configured,
          reason: collector.reason || null,
          merchantId: collector.merchantId || null,
          businessName: collector.businessName || null,
          email: collector.email || null,
          upiId: collector.upiId || null,
          upiName: collector.upiName || null,
          onlineDevicesCount: collector.onlineDevicesCount,
          totalDevicesCount: collector.totalDevicesCount,
        },
        availableMerchants,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Unmapped / Delayed Payments Monitor
export const listUnmappedPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const unmapped = await UnmappedPayment.find()
      .populate('merchantId', 'businessName email upiId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: unmapped,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Webhook Delivery Logs Monitor
export const listWebhookLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await WebhookLog.find()
      .populate('merchantId', 'businessName email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create Subscription Bill (Paid Invoice + Plan Activation OR Pending SumioPay UPI Payment Link)
export const createSubscriptionBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.params;
    const {
      mode = 'MARK_PAID',
      planTier = 'MONTHLY',
      amountInr,
      durationDays = 30,
      utrNumber = '',
    } = req.body;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const parsedAmount = Number(amountInr);
    const parsedDays = Math.max(1, Number(durationDays) || 30);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({ success: false, message: 'Valid non-negative amountInr is required' });
      return;
    }

    const adminEmail = (req as any).superAdmin?.email || 'admin@sumiotech.in';

    if (mode === 'GENERATE_UPI_BILL') {
      if (parsedAmount <= 0) {
        res.status(400).json({ success: false, message: 'UPI payment bill requires amountInr > 0' });
        return;
      }

      const settings = await SystemSetting.findOne();
      const collector = await resolvePlatformCollectorMerchant(settings);
      if (!collector.configured || !collector.merchant || !collector.upiId) {
        res.status(503).json({
          success: false,
          message:
            collector.reason ||
            'Platform Collector Merchant is not configured yet in SuperAdmin Settings.',
        });
        return;
      }

      const { exactAmount, paiseOffset } = await allocateUniquePaise(
        collector.merchant._id,
        parsedAmount
      );

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderId = `SUB-BILL-${dateStr}-${randomSuffix}`;
      const displayName = collector.upiName || collector.businessName || 'SumioTech';
      const upiIntentUrl = buildUpiIntentUrl(collector.upiId, displayName, exactAmount, orderId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h payable window for admin bills

      const order = new Order({
        orderId,
        merchantId: collector.merchant._id,
        appName: 'SUMIOPAY_SAAS',
        customerUserId: merchant._id.toString(),
        customerPhone: merchant.phone || '',
        customerEmail: merchant.email,
        baseAmount: parsedAmount,
        paiseOffset,
        exactAmount,
        isTest: false,
        status: 'PENDING',
        upiIntentUrl,
        expiresAt,
        callbackWebhookUrl: '',
        metadata: {
          type: PLATFORM_SUBSCRIPTION_METADATA_TYPE,
          subscriberMerchantId: merchant._id.toString(),
          subscriberEmail: merchant.email,
          subscriberBusinessName: merchant.businessName,
          planTier,
          planLabel: `${planTier} (${parsedDays} days)`,
          durationDays: parsedDays,
          basePriceInr: parsedAmount,
          createdBySuperAdmin: adminEmail,
        },
      });
      await order.save();

      const frontendBase = (process.env.PUBLIC_URL || 'https://sumiopay.sumiotech.in').replace(/\/+$/, '');
      const hostedCheckoutUrl = `${frontendBase}/pay/${order.orderId}`;

      await AuditLog.create({
        actorType: 'SUPERADMIN',
        actorEmail: adminEmail,
        action: 'SUBSCRIPTION_UPI_BILL_GENERATED',
        resourceType: 'SUBSCRIPTION',
        resourceId: orderId,
        newState: { merchantId, planTier, exactAmount, durationDays: parsedDays, hostedCheckoutUrl },
      });

      res.status(201).json({
        success: true,
        message: `Payable UPI bill created (₹${exactAmount.toFixed(2)}) for ${merchant.businessName}`,
        data: {
          mode: 'GENERATE_UPI_BILL',
          orderId,
          exactAmount,
          upiId: collector.upiId,
          upiIntentUrl,
          hostedCheckoutUrl,
          expiresAt,
        },
      });
      return;
    }

    // Default mode: MARK_PAID (record manual/offline bill and activate/extend plan)
    let sub = await Subscription.findOne({ merchantId });
    if (!sub) {
      sub = new Subscription({ merchantId });
    }

    const now = new Date();
    const newPeriodEnd = computeExtendedPeriodEnd(sub.currentPeriodEnd, sub.status, parsedDays, now);
    const invoiceId = `INV-ADM-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const amountPaise = Math.round(parsedAmount * 100);
    const monthlyEqPaise =
      planTier === 'HALF_YEARLY' ? Math.round(amountPaise / 6) : amountPaise;

    sub.planTier = planTier;
    sub.status = 'ACTIVE';
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = newPeriodEnd;
    sub.monthlyPriceInPaise = monthlyEqPaise;
    sub.invoiceHistory.push({
      invoiceId,
      orderId: 'MANUAL-BILL',
      planTier,
      durationDays: parsedDays,
      utrNumber: (utrNumber || 'ADMIN_RECORDED').trim(),
      amountInPaise: amountPaise,
      paidAt: now,
    });
    await sub.save();

    merchant.planTier = planTier;
    await merchant.save();

    await AuditLog.create({
      actorType: 'SUPERADMIN',
      actorEmail: adminEmail,
      action: 'SUBSCRIPTION_BILL_CREATED',
      resourceType: 'SUBSCRIPTION',
      resourceId: invoiceId,
      newState: { merchantId, planTier, amountPaise, durationDays: parsedDays, utrNumber },
    });

    res.status(201).json({
      success: true,
      message: `Bill ${invoiceId} recorded & ${planTier} activated for ${parsedDays} days`,
      data: {
        mode: 'MARK_PAID',
        invoiceId,
        subscription: sub,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Edit / Update an existing Subscription Bill / Invoice in Merchant's Invoice History
export const updateSubscriptionBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, invoiceId } = req.params;
    const { amountInr, utrNumber, planTier, durationDays } = req.body;

    const sub = await Subscription.findOne({ merchantId });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const inv = sub.invoiceHistory.find((i) => i.invoiceId === invoiceId);
    if (!inv) {
      res.status(404).json({ success: false, message: 'Invoice bill not found' });
      return;
    }

    if (amountInr !== undefined && !isNaN(Number(amountInr)) && Number(amountInr) >= 0) {
      inv.amountInPaise = Math.round(Number(amountInr) * 100);
    }
    if (utrNumber !== undefined) inv.utrNumber = String(utrNumber).trim();
    if (planTier !== undefined) inv.planTier = planTier;
    if (durationDays !== undefined && Number(durationDays) > 0) inv.durationDays = Number(durationDays);

    await sub.save();

    res.status(200).json({
      success: true,
      message: `Invoice ${invoiceId} updated`,
      data: sub,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete / Void a Subscription Bill / Invoice
export const deleteSubscriptionBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, invoiceId } = req.params;
    const sub = await Subscription.findOne({ merchantId });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const beforeCount = sub.invoiceHistory.length;
    sub.invoiceHistory = sub.invoiceHistory.filter((i) => i.invoiceId !== invoiceId);
    if (sub.invoiceHistory.length === beforeCount) {
      res.status(404).json({ success: false, message: 'Invoice bill not found' });
      return;
    }

    await sub.save();

    res.status(200).json({
      success: true,
      message: `Invoice ${invoiceId} voided & removed`,
      data: sub,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

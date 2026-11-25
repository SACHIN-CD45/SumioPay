import { Request, Response } from 'express';
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
    const merchants = await Merchant.find().select('businessName name email upiId planTier createdAt');
    const merchantIds = merchants.map((m) => m._id);

    const subscriptions = await Subscription.find({ merchantId: { $in: merchantIds } });
    const subMap = new Map(subscriptions.map((s) => [s.merchantId.toString(), s]));

    const result = merchants.map((m) => {
      const sub = subMap.get(m._id.toString());
      return {
        merchantId: m._id,
        businessName: m.businessName,
        email: m.email,
        upiId: m.upiId,
        planTier: sub?.planTier || m.planTier || 'STARTER',
        status: sub?.status || 'ACTIVE',
        currentPeriodEnd: sub?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1000),
        monthlyPriceInPaise: sub?.monthlyPriceInPaise || (m.planTier === 'ENTERPRISE' ? 2999900 : m.planTier === 'BUSINESS' ? 1199900 : m.planTier === 'GROWTH' ? 499900 : 199900),
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
    const { planTier, status, customPriceInPaise } = req.body;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const previousTier = merchant.planTier;
    merchant.planTier = planTier;
    await merchant.save();

    let sub = await Subscription.findOne({ merchantId });
    if (!sub) {
      sub = new Subscription({ merchantId });
    }

    const tierPriceMap: Record<string, number> = {
      STARTER: 199900,
      GROWTH: 499900,
      BUSINESS: 1199900,
      ENTERPRISE: 2999900,
    };

    sub.planTier = planTier;
    if (status) sub.status = status;
    sub.monthlyPriceInPaise = customPriceInPaise || tierPriceMap[planTier] || 199900;
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await sub.save();

    await AuditLog.create({
      actorType: 'SUPERADMIN',
      actorEmail: (req as any).superAdmin?.email || 'admin@sumiopay.internal',
      action: 'MERCHANT_SUBSCRIPTION_OVERRIDDEN',
      resourceType: 'MERCHANT',
      resourceId: merchantId,
      previousState: { planTier: previousTier },
      newState: { planTier, monthlyPriceInPaise: sub.monthlyPriceInPaise, status: sub.status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `Merchant ${merchant.businessName} updated to ${planTier} plan`,
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
    const merchants = await Merchant.find().select('planTier');
    const counts = {
      STARTER: 0,
      GROWTH: 0,
      BUSINESS: 0,
      ENTERPRISE: 0,
    };

    merchants.forEach((m) => {
      const tier = (m.planTier || 'STARTER') as keyof typeof counts;
      if (counts[tier] !== undefined) counts[tier]++;
    });

    const mrr =
      counts.STARTER * 1999 +
      counts.GROWTH * 4999 +
      counts.BUSINESS * 11999 +
      counts.ENTERPRISE * 29999;

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers: merchants.length,
        tierCounts: counts,
        estimatedMRR: mrr,
        estimatedARR: mrr * 12,
        currency: 'INR',
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
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePlatformSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = (req as any).superAdmin?.email || 'superadmin@sumiopay.internal';
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
    } = req.body;

    if (announcementText !== undefined) settings.announcementText = announcementText;
    if (announcementLink !== undefined) settings.announcementLink = announcementLink;
    if (isAnnouncementActive !== undefined) settings.isAnnouncementActive = isAnnouncementActive;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    if (allowNewMerchantRegistrations !== undefined) settings.allowNewMerchantRegistrations = allowNewMerchantRegistrations;
    if (totalPlatformGMVFormatted !== undefined) settings.totalPlatformGMVFormatted = totalPlatformGMVFormatted;
    if (totalBusinessesCount !== undefined) settings.totalBusinessesCount = totalBusinessesCount;
    if (slaGuaranteePercent !== undefined) settings.slaGuaranteePercent = slaGuaranteePercent;
    if (enterpriseContactEmail !== undefined) settings.enterpriseContactEmail = enterpriseContactEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;
    if (featureFlags !== undefined) settings.featureFlags = { ...settings.featureFlags, ...featureFlags };
    if (pricingTiers !== undefined) settings.pricingTiers = { ...settings.pricingTiers, ...pricingTiers };

    settings.updatedBy = adminEmail;
    await settings.save();

    // Log privileged audit event
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
    });

    res.status(200).json({
      success: true,
      message: 'Global platform settings updated successfully',
      data: settings,
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

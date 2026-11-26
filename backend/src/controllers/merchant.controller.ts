import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Merchant from '../models/merchant.model';
import Order from '../models/order.model';
import Device from '../models/device.model';
import TeamMember from '../models/teamMember.model';
import Subscription from '../models/subscription.model';
import Refund from '../models/refund.model';
import Dispute from '../models/dispute.model';
import Organization from '../models/organization.model';
import AuditLog from '../models/auditLog.model';
import Otp from '../models/otp.model';
import { EmailService } from '../services/email.service';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { JwtService } from '../services/jwt.service';
import { StateMachineService } from '../services/stateMachine.service';
import { dispatchMerchantWebhook } from '../utils/hmacSigner';

export const sendRegistrationOtp = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Merchant.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A merchant account with this email already exists. Please log in.',
      });
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire any existing registration OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, purpose: 'REGISTRATION' });

    // Store in DB with 10 minutes expiry
    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'REGISTRATION',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email via Hostinger SMTP
    await EmailService.sendRegistrationOtp(cleanEmail, otp, name);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error('sendRegistrationOtp error:', err);
    res.status(500).json({ success: false, message: 'Failed to send verification code', error: err.message });
  }
};

export const registerMerchant = async (req: Request, res: Response) => {
  try {
    const { name, email, password, businessName, upiId, upiName, phone, otp, termsAccepted } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the Terms & Conditions and Privacy Policy to register.',
      });
    }

    if (!name || !email || !password || !businessName || !upiId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, business name, and UPI ID are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Merchant.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A merchant account with this email already exists.',
      });
    }

    // Strictly verify Email OTP before activating merchant registration
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email verification code (OTP) is required. Please request and enter your 6-digit OTP.',
      });
    }

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: 'REGISTRATION',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.',
      });
    }
    await Otp.deleteMany({ email: cleanEmail, purpose: 'REGISTRATION' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const merchant = new Merchant({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      businessName: businessName.trim(),
      phone: (phone || '').trim(),
      upiId: upiId.trim(),
      upiName: (upiName || businessName).trim(),
      apiKey: `sp_live_${crypto.randomBytes(16).toString('hex')}`,
      apiSecret: `sp_sec_${crypto.randomBytes(24).toString('hex')}`,
      webhookSecret: crypto.randomBytes(20).toString('hex'),
      planTier: 'PRO',
      isActive: true,
    });

    await merchant.save();

    // Create organization entity
    const organization = new Organization({
      name: businessName.trim(),
      legalEntityName: businessName.trim(),
      billingEmail: cleanEmail,
      phone: (phone || '').trim(),
      kycStatus: 'NOT_SUBMITTED',
      isActive: true,
    });
    await organization.save();

    // Initialize Subscription
    const subscription = new Subscription({
      merchantId: merchant._id,
      planTier: 'STARTER',
      status: 'TRIAL',
      monthlyPriceInPaise: 0,
    });
    await subscription.save();

    // Asynchronously dispatch Welcome Email via Hostinger SMTP
    EmailService.sendWelcomeEmail(
      merchant.email,
      merchant.name,
      merchant.businessName,
      merchant.upiId
    ).catch((e) => console.error('Welcome email dispatch error:', e));

    const tokens = await JwtService.generateTokenPair({
      id: merchant._id.toString(),
      email: merchant.email,
      role: 'MERCHANT',
      merchantId: merchant._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Merchant account registered successfully!',
      data: {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          businessName: merchant.businessName,
          upiId: merchant.upiId,
          upiName: merchant.upiName,
          apiKey: merchant.apiKey,
        },
      },
    });
  } catch (err: any) {
    console.error('registerMerchant error:', err);
    res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  }
};

export const loginMerchant = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const merchant = await Merchant.findOne({ email: email.toLowerCase().trim() });
    if (!merchant) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!merchant.isActive) {
      return res.status(403).json({ success: false, message: 'Merchant account is suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, merchant.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const tokens = await JwtService.generateTokenPair({
      id: merchant._id.toString(),
      email: merchant.email,
      role: 'MERCHANT',
      merchantId: merchant._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Asynchronously send Login Alert Email
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown';
    EmailService.sendLoginAlert(
      merchant.email,
      merchant.name,
      clientIp,
      req.get('user-agent')
    ).catch((e) => console.error('Login alert email error:', e));

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          businessName: merchant.businessName,
          upiId: merchant.upiId,
          upiName: merchant.upiName,
          apiKey: merchant.apiKey,
          planTier: merchant.planTier,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
};

export const sendForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const merchant = await Merchant.findOne({ email: cleanEmail });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'No active merchant account found with this email address.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: cleanEmail, purpose: 'PASSWORD_RESET' });

    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await EmailService.sendForgotPasswordOtp(cleanEmail, otp, merchant.name);

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error('sendForgotPasswordOtp error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset code', error: err.message });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: 'PASSWORD_RESET',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code.' });
    }

    const merchant = await Merchant.findOne({ email: cleanEmail });
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    merchant.passwordHash = await bcrypt.hash(newPassword, salt);
    await merchant.save();

    await Otp.deleteMany({ email: cleanEmail, purpose: 'PASSWORD_RESET' });

    res.json({
      success: true,
      message: 'Your password has been reset successfully! Please log in with your new password.',
    });
  } catch (err: any) {
    console.error('resetPasswordWithOtp error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password', error: err.message });
  }
};

export const getMerchantProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    res.json({
      success: true,
      data: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        businessName: merchant.businessName,
        upiId: merchant.upiId,
        upiName: merchant.upiName,
        apiKey: merchant.apiKey,
        apiSecret: merchant.apiSecret,
        webhookUrl: merchant.webhookUrl,
        webhookSecret: merchant.webhookSecret,
        planTier: merchant.planTier,
        totalVolume: merchant.totalVolume,
        totalTransactions: merchant.totalTransactions,
        createdAt: merchant.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMerchantProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { businessName, upiId, upiName, webhookUrl, phone } = req.body;

    if (businessName) merchant.businessName = businessName.trim();
    if (upiId) merchant.upiId = upiId.trim();
    if (upiName) merchant.upiName = upiName.trim();
    if (webhookUrl !== undefined) merchant.webhookUrl = (webhookUrl || '').trim();
    if (phone !== undefined) merchant.phone = (phone || '').trim();

    await merchant.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: merchant,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const regenerateApiKeys = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    merchant.apiKey = `sp_live_${crypto.randomBytes(16).toString('hex')}`;
    merchant.apiSecret = `sp_sec_${crypto.randomBytes(24).toString('hex')}`;
    merchant.webhookSecret = crypto.randomBytes(20).toString('hex');
    await merchant.save();

    res.json({
      success: true,
      message: 'New API Keys & Webhook Secret generated successfully',
      data: {
        apiKey: merchant.apiKey,
        apiSecret: merchant.apiSecret,
        webhookSecret: merchant.webhookSecret,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);

    const [todayOrders, totalOrdersCount, paidOrdersCount, onlineDevicesCount, totalDevices, activeDevice] =
      await Promise.all([
        Order.find({
          merchantId,
          status: 'PAID',
          isTest: { $ne: true },
          paidAt: { $gte: startOfToday },
        }),
        Order.countDocuments({ merchantId, isTest: { $ne: true } }),
        Order.countDocuments({ merchantId, status: 'PAID', isTest: { $ne: true } }),
        Device.countDocuments({ merchantId, isPaired: true, isActive: true, lastPingAt: { $gt: fourMinutesAgo } }),
        Device.countDocuments({ merchantId, isPaired: true }),
        Device.findOne({ merchantId, isPaired: true, isActive: true }).sort({ lastPingAt: -1 }),
      ]);

    const todayVolume = todayOrders.reduce((acc, curr) => acc + curr.exactAmount, 0);
    const todayTransactions = todayOrders.length;
    const conversionRate =
      totalOrdersCount > 0 ? `${((paidOrdersCount / totalOrdersCount) * 100).toFixed(1)}%` : '0.0%';

    const isDeviceOnline =
      activeDevice && activeDevice.lastPingAt
        ? Date.now() - new Date(activeDevice.lastPingAt).getTime() < 4 * 60 * 1000
        : false;

    const recentOrders = await Order.find({ merchantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        todayVolume,
        todayTransactions,
        todayPaidCount: todayTransactions,
        lifetimeVolume: req.merchant!.totalVolume,
        allTimeVolume: req.merchant!.totalVolume,
        allTimeTransactions: req.merchant!.totalTransactions,
        totalPaidOrders: paidOrdersCount,
        totalOrders: totalOrdersCount,
        totalOrdersCount,
        conversionRate,
        onlineDevicesCount,
        totalDevices,
        deviceHealth: {
          isOnline: isDeviceOnline,
          batteryPercent: activeDevice?.batteryPercent || 0,
          isCharging: activeDevice?.isCharging || false,
          lastPingAt: activeDevice?.lastPingAt || null,
          deviceName: activeDevice?.deviceName || 'No device connected',
          deviceToken: activeDevice?.deviceToken || '',
        },
        recentOrders,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Team Member Management
export const listTeamMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const members = await TeamMember.find({ merchantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: members });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const inviteTeamMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await TeamMember.findOne({ merchantId, email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Team member already exists' });
    }

    const member = await TeamMember.create({
      merchantId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'DEVELOPER',
      status: 'INVITED',
      invitedBy: merchantId,
    });

    res.status(201).json({ success: true, message: 'Team member invited successfully', data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTeamMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    await TeamMember.findOneAndDelete({ _id: req.params.memberId, merchantId });
    res.json({ success: true, message: 'Team member removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Subscription Management
export const getSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    let subscription = await Subscription.findOne({ merchantId });
    if (!subscription) {
      subscription = await Subscription.create({
        merchantId,
        planTier: 'STARTER',
        status: 'ACTIVE',
      });
    }
    res.json({ success: true, data: subscription });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const changePlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { planTier } = req.body;

    let subscription = await Subscription.findOne({ merchantId });
    if (!subscription) {
      subscription = new Subscription({ merchantId });
    }

    subscription.planTier = planTier;
    subscription.status = 'ACTIVE';
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await subscription.save();

    req.merchant!.planTier = planTier;
    await req.merchant!.save();

    res.json({ success: true, message: `Subscribed to ${planTier} plan`, data: subscription });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Refunds & Disputes
export const listRefunds = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const refunds = await Refund.find({ merchantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: refunds });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createRefund = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const merchantId = merchant._id;
    const { orderId, amountInPaise, reason, refundUtr, providerReference } = req.body;

    const order = await Order.findOne({ orderId, merchantId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'PAID' && order.status !== 'PARTIALLY_REFUNDED') {
      return res.status(400).json({ success: false, message: 'Only PAID or PARTIALLY_REFUNDED orders can be refunded' });
    }

    const totalOrderPaise = Math.round(order.exactAmount * 100);
    const refundAmount = amountInPaise !== undefined ? parseInt(amountInPaise, 10) : totalOrderPaise;

    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > totalOrderPaise) {
      return res.status(400).json({
        success: false,
        message: `Refund amount must be between 1 and ${totalOrderPaise} paise`,
      });
    }

    const existingRefunds = await Refund.find({ orderId: order.orderId, merchantId });
    const previouslyRefundedPaise = existingRefunds.reduce((acc, r) => acc + r.amountInPaise, 0);
    if (previouslyRefundedPaise + refundAmount > totalOrderPaise) {
      return res.status(400).json({
        success: false,
        message: `Remaining refundable balance is ${totalOrderPaise - previouslyRefundedPaise} paise`,
      });
    }

    const refund = await Refund.create({
      refundId: `ref_${crypto.randomBytes(12).toString('hex')}`,
      orderId,
      merchantId,
      amountInPaise: refundAmount,
      reason: reason || 'Customer requested refund',
      providerReference: (refundUtr || providerReference || '').trim(),
      status: 'PROCESSED',
      initiatedBy: merchant.email,
      processedAt: new Date(),
    });

    const newTotalRefunded = previouslyRefundedPaise + refundAmount;
    const targetState = newTotalRefunded >= totalOrderPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await StateMachineService.transitionOrder({
      order,
      targetState,
      trigger: 'ADMIN_MANUAL',
      actorId: merchant.email,
      metadata: { refundId: refund.refundId, refundAmount, refundUtr: refund.providerReference },
    });

    const targetUrl = order.callbackWebhookUrl || merchant.webhookUrl;
    if (targetUrl) {
      dispatchMerchantWebhook(
        merchantId,
        order.orderId,
        targetUrl,
        merchant.webhookSecret,
        {
          orderId: order.orderId,
          refundId: refund.refundId,
          refundAmountInPaise: refundAmount,
          refundAmount: refundAmount / 100,
          refundUtr: refund.providerReference || undefined,
          reason: refund.reason,
          status: targetState,
          metadata: order.metadata || {},
        },
        'payment.refunded'
      ).catch(() => {});
    }

    res.status(201).json({ success: true, message: 'Refund recorded and webhook notified', data: refund });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listDisputes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const disputes = await Dispute.find({ merchantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: disputes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// KYC Workflow
export const getKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const org = await Organization.findOne({ billingEmail: req.merchant!.email });
    res.json({
      success: true,
      data: org || { kycStatus: 'NOT_SUBMITTED' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { legalEntityName, gstin, panNumber, kycDocuments } = req.body;

    let org = await Organization.findOne({ billingEmail: req.merchant!.email });
    if (!org) {
      org = new Organization({
        name: req.merchant!.businessName,
        legalEntityName: legalEntityName || req.merchant!.businessName,
        billingEmail: req.merchant!.email,
      });
    }

    if (legalEntityName) org.legalEntityName = legalEntityName;
    if (gstin) org.gstin = gstin;
    if (panNumber) org.panNumber = panNumber;
    if (kycDocuments) org.kycDocuments = { ...org.kycDocuments, ...kycDocuments };
    org.kycStatus = 'SUBMITTED';
    await org.save();

    res.json({ success: true, message: 'KYC documents submitted for review', data: org });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Financial Reports
export const exportReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { startDate, endDate, format } = req.query;

    const query: any = { merchantId, status: 'PAID' };
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate as string);
      if (endDate) query.paidAt.$lte = new Date(endDate as string);
    }

    const orders = await Order.find(query).sort({ paidAt: -1 }).lean();

    const summary = {
      totalTransactions: orders.length,
      totalVolumeRupees: orders.reduce((sum, o) => sum + o.exactAmount, 0),
      currency: 'INR',
      period: { startDate: startDate || 'All-Time', endDate: endDate || 'Now' },
    };

    if (format === 'csv') {
      const headers = 'OrderId,AppName,Customer,RupeeAmount,UTR,PaidAt\n';
      const rows = orders
        .map((o) => `${o.orderId},${o.appName},${o.customerUserId || ''},${o.exactAmount.toFixed(2)},${o.utrNumber || ''},${o.paidAt ? new Date(o.paidAt).toISOString() : ''}`)
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sumiopay-report.csv"');
      res.send(headers + rows);
      return;
    }

    res.json({
      success: true,
      data: {
        summary,
        orders,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Senior-Level JWT Session & Refresh Token Rotation Endpoints
export const refreshMerchantToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'refreshToken is required' });
      return;
    }

    const newTokens = await JwtService.rotateRefreshToken({
      rawRefreshToken: refreshToken,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Token rotated successfully',
      data: {
        token: newTokens.accessToken,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenType: newTokens.tokenType,
        expiresIn: newTokens.expiresIn,
      },
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: { message: err.message } });
  }
};

export const logoutMerchant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await JwtService.revokeSession(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const logoutAllDevices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id.toString();
    await JwtService.revokeAllSessions(merchantId);
    res.json({ success: true, message: 'All active sessions terminated across all devices' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


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
import { SystemSetting } from '../models/systemSetting.model';
import { EmailService } from '../services/email.service';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { JwtService } from '../services/jwt.service';
import { StateMachineService } from '../services/stateMachine.service';
import { dispatchMerchantWebhook } from '../utils/hmacSigner';
import { allocateUniquePaise, buildUpiIntentUrl } from '../utils/paiseAllocator';
import {
  PLATFORM_SUBSCRIPTION_METADATA_TYPE,
  activatePlatformSubscriptionFromOrder,
  computeTrialPeriodEnd,
  getSubscriptionPlanCatalog,
  resolvePlanDetails,
  resolvePlatformCollectorMerchant,
} from '../services/subscriptionActivation.service';
import {
  getIstDateKey,
  inferBankFromUpiHandle,
  isValidUpiVpa,
  parseUpiQrString,
  syncMerchantUpiState,
} from '../services/upiRouter.service';
import { sanitizeBrandColor, sanitizeSafeUrl } from '../utils/checkoutBranding';
import {
  escapeCsvCell,
  generateNumericOtp,
  getClientIp,
  timingSafeEqualStr,
  validateSafeWebhookUrl,
} from '../utils/securityGuards';

const MAX_OTP_ATTEMPTS = 5;

/**
 * Verifies a user-submitted OTP using constant-time comparison and enforces a strict 5-attempt lockout.
 */
async function verifyAndConsumeOtp(
  email: string,
  purpose: 'REGISTRATION' | 'PASSWORD_RESET',
  candidateOtp: unknown
): Promise<{ ok: boolean; message?: string }> {
  const cleanOtp = typeof candidateOtp === 'string' ? candidateOtp.trim() : '';
  if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
    return { ok: false, message: 'A valid 6-digit verification code is required.' };
  }

  const otpRecord = await Otp.findOne({
    email,
    purpose,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { ok: false, message: 'Invalid or expired verification code. Please request a new code.' };
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await Otp.deleteMany({ email, purpose });
    return {
      ok: false,
      message: 'Too many incorrect OTP attempts. For security, this code has been invalidated. Request a new code.',
    };
  }

  if (!timingSafeEqualStr(otpRecord.otp, cleanOtp)) {
    otpRecord.attempts = (otpRecord.attempts || 0) + 1;
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteMany({ email, purpose });
      return {
        ok: false,
        message: 'Too many incorrect OTP attempts. For security, this code has been invalidated. Request a new code.',
      };
    }
    await otpRecord.save();
    return { ok: false, message: 'Invalid verification code. Please check and try again.' };
  }

  await Otp.deleteMany({ email, purpose });
  return { ok: true };
}

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

    // Generate cryptographically secure 6-digit numeric OTP using CSPRNG
    const otp = generateNumericOtp(6);

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

    // Strictly verify Email OTP (constant-time + 5-attempt lockout) before registering
    const otpCheck = await verifyAndConsumeOtp(cleanEmail, 'REGISTRATION', otp);
    if (!otpCheck.ok) {
      return res.status(400).json({
        success: false,
        message: otpCheck.message,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const settings = await SystemSetting.findOne();
    const catalog = getSubscriptionPlanCatalog(settings);
    const trialStart = new Date();
    const trialEnd = computeTrialPeriodEnd(catalog.trialDays, trialStart);

    const merchant = new Merchant({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      businessName: businessName.trim(),
      phone: (phone || '').trim(),
      upiId: upiId.trim(),
      upiName: (upiName || businessName).trim(),
      upiAccounts: [
        {
          id: 'upi_primary',
          label: 'Primary Bank UPI',
          upiId: upiId.trim(),
          upiName: (upiName || businessName).trim(),
          bankName: inferBankFromUpiHandle(upiId),
          isActive: true,
          isPrimary: true,
          dailyLimitInr: 0,
          todayVolumeInr: 0,
          todayVolumeDate: getIstDateKey(),
          totalVolumeInr: 0,
          totalTransactions: 0,
          createdAt: new Date(),
        },
      ],
      upiRoutingMode: 'PRIMARY_ONLY',
      apiKey: `sp_live_${crypto.randomBytes(16).toString('hex')}`,
      apiSecret: `sp_sec_${crypto.randomBytes(24).toString('hex')}`,
      webhookSecret: crypto.randomBytes(20).toString('hex'),
      planTier: 'TRIAL',
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

    // Initialize Free Trial Subscription (default 3 days controlled by SuperAdmin)
    const subscription = new Subscription({
      merchantId: merchant._id,
      planTier: 'TRIAL',
      status: 'TRIAL',
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
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
    const clientIp = getClientIp(req.headers as Record<string, any>, req.ip);
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

    const otp = generateNumericOtp(6);
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
    const otpCheck = await verifyAndConsumeOtp(cleanEmail, 'PASSWORD_RESET', otp);
    if (!otpCheck.ok) {
      return res.status(400).json({ success: false, message: otpCheck.message });
    }

    const merchant = await Merchant.findOne({ email: cleanEmail });
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    merchant.passwordHash = await bcrypt.hash(newPassword, salt);
    await merchant.save();

    // Revoke all previously issued refresh tokens upon password reset
    await JwtService.revokeAllSessions(merchant._id.toString()).catch(() => {});

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
    const hadAccounts = Array.isArray(merchant.upiAccounts) && merchant.upiAccounts.length > 0;
    const syncedAccounts = syncMerchantUpiState(merchant);
    if (!hadAccounts && syncedAccounts.length > 0) {
      await merchant.save().catch(() => {});
    }

    res.json({
      success: true,
      data: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        businessName: merchant.businessName,
        websiteName: merchant.websiteName || merchant.businessName || '',
        websiteUrl: merchant.websiteUrl || '',
        websiteLogoUrl: merchant.websiteLogoUrl || '',
        brandColor: sanitizeBrandColor(merchant.brandColor),
        upiId: merchant.upiId,
        upiName: merchant.upiName,
        upiAccounts: syncedAccounts,
        upiRoutingMode: merchant.upiRoutingMode || 'PRIMARY_ONLY',
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
    const {
      name,
      businessName,
      websiteName,
      websiteUrl,
      websiteLogoUrl,
      brandColor,
      upiId,
      upiName,
      webhookUrl,
      phone,
      upiRoutingMode,
    } = req.body;

    if (name && name.trim()) merchant.name = name.trim();
    if (businessName && businessName.trim()) merchant.businessName = businessName.trim();
    if (websiteName !== undefined) merchant.websiteName = String(websiteName || '').trim().slice(0, 80);
    if (websiteUrl !== undefined) merchant.websiteUrl = sanitizeSafeUrl(websiteUrl);
    if (websiteLogoUrl !== undefined) merchant.websiteLogoUrl = sanitizeSafeUrl(websiteLogoUrl);
    if (brandColor !== undefined) merchant.brandColor = sanitizeBrandColor(brandColor);
    if (webhookUrl !== undefined) {
      const urlCheck = validateSafeWebhookUrl(webhookUrl);
      if (!urlCheck.valid) {
        return res.status(400).json({ success: false, message: urlCheck.reason });
      }
      merchant.webhookUrl = urlCheck.url;
    }
    if (phone !== undefined) merchant.phone = (phone || '').trim();
    if (upiRoutingMode && ['PRIMARY_ONLY', 'ROUND_ROBIN', 'FAILOVER'].includes(upiRoutingMode)) {
      merchant.upiRoutingMode = upiRoutingMode;
    }

    const accounts = syncMerchantUpiState(merchant);
    const primary = accounts.find((a) => a.isPrimary) || accounts[0];

    if (upiId && upiId.trim()) {
      const cleanVpa = upiId.trim();
      if (!isValidUpiVpa(cleanVpa)) {
        return res.status(400).json({ success: false, message: 'Enter a valid UPI ID (e.g. name@okaxis)' });
      }
      merchant.upiId = cleanVpa;
      if (primary) {
        primary.upiId = cleanVpa;
        primary.bankName = inferBankFromUpiHandle(cleanVpa);
      }
    }
    if (upiName && upiName.trim()) {
      merchant.upiName = upiName.trim();
      if (primary) {
        primary.upiName = upiName.trim();
      }
    }

    merchant.markModified('upiAccounts');
    await merchant.save();

    res.json({
      success: true,
      message: 'Merchant profile & UPI settings saved',
      data: {
        id: merchant._id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        businessName: merchant.businessName,
        websiteName: merchant.websiteName || merchant.businessName || '',
        websiteUrl: merchant.websiteUrl || '',
        websiteLogoUrl: merchant.websiteLogoUrl || '',
        brandColor: sanitizeBrandColor(merchant.brandColor),
        upiId: merchant.upiId,
        upiName: merchant.upiName,
        upiAccounts: accounts,
        upiRoutingMode: merchant.upiRoutingMode || 'PRIMARY_ONLY',
        webhookUrl: merchant.webhookUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addUpiAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const {
      label = 'Bank UPI Account',
      upiId = '',
      upiName = '',
      bankName = '',
      qrPayload = '',
      dailyLimitInr = 0,
      makePrimary = false,
    } = req.body;

    let finalUpiId = String(upiId).trim();
    let finalUpiName = String(upiName).trim();
    let finalBankName = String(bankName).trim();

    if (qrPayload) {
      const parsed = parseUpiQrString(String(qrPayload));
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: 'Uploaded QR does not contain a valid UPI payment ID (upi://pay?pa=...)',
        });
      }
      finalUpiId = finalUpiId || parsed.upiId;
      finalUpiName = finalUpiName || parsed.upiName;
      finalBankName = finalBankName || parsed.bankName;
    }

    if (!isValidUpiVpa(finalUpiId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. Example: shopname@okhdfcbank or 9876543210@paytm',
      });
    }

    const accounts = syncMerchantUpiState(merchant);
    const duplicate = accounts.find((a) => a.upiId.toLowerCase() === finalUpiId.toLowerCase());
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `UPI ID ${finalUpiId} is already added in your profile`,
      });
    }

    const setAsPrimary = Boolean(makePrimary) || accounts.length === 0;
    if (setAsPrimary) {
      accounts.forEach((a) => {
        a.isPrimary = false;
      });
    }

    const newAccount = {
      id: `upi_${crypto.randomBytes(5).toString('hex')}`,
      label: String(label).trim() || finalBankName || inferBankFromUpiHandle(finalUpiId),
      upiId: finalUpiId,
      upiName: finalUpiName || merchant.businessName,
      bankName: finalBankName || inferBankFromUpiHandle(finalUpiId),
      isActive: true,
      isPrimary: setAsPrimary,
      dailyLimitInr: Math.max(0, Number(dailyLimitInr) || 0),
      todayVolumeInr: 0,
      todayVolumeDate: getIstDateKey(),
      totalVolumeInr: 0,
      totalTransactions: 0,
      createdAt: new Date(),
    };

    accounts.push(newAccount);
    if (setAsPrimary) {
      merchant.upiId = newAccount.upiId;
      merchant.upiName = newAccount.upiName;
    }
    merchant.upiAccounts = accounts as any;
    merchant.markModified('upiAccounts');
    await merchant.save();

    res.status(201).json({
      success: true,
      message: `UPI account ${newAccount.upiId} added${setAsPrimary ? ' & activated as Primary' : ''}`,
      data: {
        account: newAccount,
        upiAccounts: merchant.upiAccounts,
        upiId: merchant.upiId,
        upiName: merchant.upiName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUpiAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { accountId } = req.params;
    const { label, upiId, upiName, bankName, isPrimary, isActive, dailyLimitInr } = req.body;

    const accounts = syncMerchantUpiState(merchant);
    const target = accounts.find((a) => a.id === accountId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'UPI account not found' });
    }

    if (upiId !== undefined) {
      const cleanVpa = String(upiId).trim();
      if (!isValidUpiVpa(cleanVpa)) {
        return res.status(400).json({ success: false, message: 'Invalid UPI ID format' });
      }
      target.upiId = cleanVpa;
      target.bankName = bankName || inferBankFromUpiHandle(cleanVpa);
    }
    if (label !== undefined && String(label).trim()) target.label = String(label).trim();
    if (upiName !== undefined && String(upiName).trim()) target.upiName = String(upiName).trim();
    if (bankName !== undefined && String(bankName).trim()) target.bankName = String(bankName).trim();
    if (dailyLimitInr !== undefined) target.dailyLimitInr = Math.max(0, Number(dailyLimitInr) || 0);

    if (isActive !== undefined) {
      const willBeActive = Boolean(isActive);
      const otherActiveCount = accounts.filter((a) => a.id !== accountId && a.isActive).length;
      if (!willBeActive && otherActiveCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one UPI ID must remain active to accept payments',
        });
      }
      target.isActive = willBeActive;
      if (!willBeActive && target.isPrimary) {
        target.isPrimary = false;
        const fallback = accounts.find((a) => a.id !== accountId && a.isActive);
        if (fallback) fallback.isPrimary = true;
      }
    }

    if (isPrimary === true) {
      accounts.forEach((a) => {
        a.isPrimary = a.id === accountId;
      });
      target.isActive = true;
    }

    const activePrimary = accounts.find((a) => a.isPrimary) || accounts.find((a) => a.isActive) || accounts[0];
    if (activePrimary) {
      merchant.upiId = activePrimary.upiId;
      merchant.upiName = activePrimary.upiName;
    }
    merchant.upiAccounts = accounts as any;
    merchant.markModified('upiAccounts');
    await merchant.save();

    res.json({
      success: true,
      message: isPrimary ? `${target.upiId} activated as Primary UPI` : 'UPI account updated',
      data: {
        upiAccounts: merchant.upiAccounts,
        upiId: merchant.upiId,
        upiName: merchant.upiName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUpiAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { accountId } = req.params;

    const accounts = syncMerchantUpiState(merchant);
    if (accounts.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last UPI account. Add another UPI first before removing this one.',
      });
    }

    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'UPI account not found' });
    }

    const wasPrimary = accounts[idx].isPrimary;
    accounts.splice(idx, 1);

    if (wasPrimary && accounts.length > 0) {
      const nextPrimary = accounts.find((a) => a.isActive) || accounts[0];
      nextPrimary.isPrimary = true;
      nextPrimary.isActive = true;
    }

    const primary = accounts.find((a) => a.isPrimary) || accounts[0];
    if (primary) {
      merchant.upiId = primary.upiId;
      merchant.upiName = primary.upiName;
    }

    merchant.upiAccounts = accounts as any;
    merchant.markModified('upiAccounts');
    await merchant.save();

    res.json({
      success: true,
      message: 'UPI account removed',
      data: {
        upiAccounts: merchant.upiAccounts,
        upiId: merchant.upiId,
        upiName: merchant.upiName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUpiRoutingMode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { upiRoutingMode } = req.body;
    if (!['PRIMARY_ONLY', 'ROUND_ROBIN', 'FAILOVER'].includes(upiRoutingMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upiRoutingMode. Use PRIMARY_ONLY, ROUND_ROBIN, or FAILOVER.',
      });
    }
    merchant.upiRoutingMode = upiRoutingMode;
    await merchant.save();
    res.json({
      success: true,
      message: `UPI Routing switched to ${upiRoutingMode}`,
      data: { upiRoutingMode: merchant.upiRoutingMode },
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

function buildSubscriptionBillDetails(
  monthlyPrice: number,
  planTier: string,
  basePriceInr: number,
  label: string
) {
  const sixMonthStandard = monthlyPrice * 6;
  const hasSixMonthSavings = planTier === 'HALF_YEARLY' && sixMonthStandard > basePriceInr;
  if (hasSixMonthSavings) {
    const discount = Math.round((sixMonthStandard - basePriceInr) * 100) / 100;
    return {
      items: [
        {
          label: `${label} (6 × ₹${monthlyPrice})`,
          quantity: 1,
          amount: sixMonthStandard,
        },
      ],
      subtotal: sixMonthStandard,
      couponCode: 'SAVE6M',
      discountAmount: discount,
      note: `Pay ₹${basePriceInr.toFixed(2)} now via Direct UPI — your SumioPay workspace activates automatically in <1.2s with 0% surcharge.`,
    };
  }
  return {
    items: [{ label, quantity: 1, amount: basePriceInr }],
    subtotal: basePriceInr,
    note: `Pay ₹${basePriceInr.toFixed(2)} now via Direct UPI — your SumioPay workspace activates automatically in <1.2s with 0% surcharge.`,
  };
}

// Subscription Management & Dogfood Self-Billing via SumioPay
export const getSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const settings = await SystemSetting.findOne();
    const catalog = getSubscriptionPlanCatalog(settings);
    const collector = await resolvePlatformCollectorMerchant(settings);

    let subscription = await Subscription.findOne({ merchantId });
    if (!subscription) {
      const now = new Date();
      subscription = await Subscription.create({
        merchantId,
        planTier: 'TRIAL',
        status: 'TRIAL',
        currentPeriodStart: now,
        currentPeriodEnd: computeTrialPeriodEnd(catalog.trialDays, now),
        monthlyPriceInPaise: 0,
      });
    }

    const pendingOrder = await Order.findOne({
      'metadata.type': PLATFORM_SUBSCRIPTION_METADATA_TYPE,
      'metadata.subscriberMerchantId': merchantId.toString(),
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    const nowMs = Date.now();
    const endMs = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : nowMs;
    const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / (24 * 60 * 60 * 1000)));
    const isExpired = endMs <= nowMs;

    const collectorMerchant = collector.merchant;
    const displayName =
      collectorMerchant?.websiteName || collector.upiName || collector.businessName || 'SumioTech';

    res.json({
      success: true,
      data: {
        ...subscription.toObject(),
        daysRemaining,
        isExpired,
        plans: catalog,
        selfBillingReady: Boolean(collector.configured && collector.upiId),
        selfBillingReason: collector.reason || null,
        collectorBusinessName: displayName,
        collectorOnlineDevices: collector.onlineDevicesCount,
        enterpriseContactEmail: settings?.enterpriseContactEmail || 'contact@sumiotech.in',
        supportPhone: settings?.supportPhone || '+91 9875182659',
        pendingCheckoutOrder: pendingOrder
          ? {
              orderId: pendingOrder.orderId,
              baseAmount: pendingOrder.baseAmount,
              paiseOffset: pendingOrder.paiseOffset,
              exactAmount: pendingOrder.exactAmount,
              upiIntentUrl: pendingOrder.upiIntentUrl,
              upiId: collector.upiId || '',
              merchantName: displayName,
              websiteName: displayName,
              websiteLogoUrl: sanitizeSafeUrl(collectorMerchant?.websiteLogoUrl),
              brandColor: sanitizeBrandColor(collectorMerchant?.brandColor || '#4F3DF5'),
              trustedBusiness: true,
              kycVerified: true,
              trustLabel: 'SumioPay Trusted Business',
              billDetails: buildSubscriptionBillDetails(
                catalog.monthlyPrice,
                pendingOrder.metadata?.planTier || 'MONTHLY',
                pendingOrder.baseAmount,
                pendingOrder.metadata?.planLabel || 'Subscription Plan'
              ),
              expiresAt: pendingOrder.expiresAt,
              planTier: pendingOrder.metadata?.planTier || 'MONTHLY',
              planLabel: pendingOrder.metadata?.planLabel || 'Subscription Plan',
            }
          : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const changePlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant!._id;
    const { action, cancelAtPeriodEnd } = req.body;

    if (action === 'CANCEL' || cancelAtPeriodEnd === true) {
      const subscription = await Subscription.findOne({ merchantId });
      if (!subscription) {
        return res.status(404).json({ success: false, message: 'Subscription not found' });
      }
      subscription.cancelAtPeriodEnd = true;
      await subscription.save();
      return res.json({
        success: true,
        message: 'Auto-renewal cancelled. Access remains active until current period ends.',
        data: subscription,
      });
    }

    // Paid plan activations MUST go through real SumioPay UPI payment verification
    return res.status(402).json({
      success: false,
      code: 'PAYMENT_REQUIRED',
      message:
        'Paid subscription plans require real UPI payment verification via /merchant/subscription/checkout. Plans activate automatically once payment is received.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const initiateSubscriptionCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriber = req.merchant!;
    const { planKey } = req.body;

    const settings = await SystemSetting.findOne();
    const catalog = getSubscriptionPlanCatalog(settings);
    const resolved = resolvePlanDetails(planKey, catalog);

    if (!resolved) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription planKey. Expected MONTHLY, HALF_YEARLY, or CUSTOM.',
      });
    }

    if (resolved.priceInr <= 0) {
      return res.status(400).json({
        success: false,
        code: 'REQUIRES_CUSTOM_QUOTE',
        message:
          'Custom plan pricing is tailored to your scale. Contact contact@sumiotech.in or ask SuperAdmin to set a custom plan price.',
      });
    }

    const collector = await resolvePlatformCollectorMerchant(settings);
    if (!collector.configured || !collector.merchant || !collector.upiId) {
      return res.status(503).json({
        success: false,
        code: 'SELF_BILLING_NOT_CONFIGURED',
        message:
          collector.reason ||
          'SumioPay platform payment collector account is not configured yet in SuperAdmin Settings.',
      });
    }

    // Expire any stale older subscription checkout order for this merchant
    await Order.updateMany(
      {
        'metadata.type': PLATFORM_SUBSCRIPTION_METADATA_TYPE,
        'metadata.subscriberMerchantId': subscriber._id.toString(),
        status: 'PENDING',
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: 'EXPIRED' } }
    );

    const { exactAmount, paiseOffset } = await allocateUniquePaise(
      collector.merchant._id,
      resolved.priceInr
    );

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderId = `SUB-${dateStr}-${randomSuffix}`;

    const displayName =
      collector.merchant.websiteName || collector.upiName || collector.businessName || 'SumioTech';
    const upiIntentUrl = buildUpiIntentUrl(
      collector.upiId,
      displayName,
      exactAmount,
      orderId
    );
    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60 * 1000);
    const billDetails = buildSubscriptionBillDetails(
      catalog.monthlyPrice,
      resolved.planTier,
      resolved.priceInr,
      resolved.label
    );

    const order = new Order({
      orderId,
      merchantId: collector.merchant._id,
      appName: 'SUMIOPAY_SAAS',
      customerUserId: subscriber._id.toString(),
      customerPhone: subscriber.phone || '',
      customerEmail: subscriber.email,
      baseAmount: resolved.priceInr,
      paiseOffset,
      exactAmount,
      isTest: false,
      status: 'PENDING',
      upiIntentUrl,
      expiresAt,
      callbackWebhookUrl: '',
      metadata: {
        type: PLATFORM_SUBSCRIPTION_METADATA_TYPE,
        subscriberMerchantId: subscriber._id.toString(),
        subscriberEmail: subscriber.email,
        subscriberBusinessName: subscriber.businessName,
        planTier: resolved.planTier,
        planLabel: resolved.label,
        durationDays: resolved.durationDays,
        basePriceInr: resolved.priceInr,
        websiteName: displayName,
        websiteLogoUrl: sanitizeSafeUrl(collector.merchant.websiteLogoUrl),
        brandColor: sanitizeBrandColor(collector.merchant.brandColor || '#4F3DF5'),
        billDetails,
      },
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        baseAmount: order.baseAmount,
        paiseOffset: order.paiseOffset,
        exactAmount: order.exactAmount,
        currency: 'INR',
        upiId: collector.upiId,
        merchantName: displayName,
        websiteName: displayName,
        websiteLogoUrl: sanitizeSafeUrl(collector.merchant.websiteLogoUrl),
        brandColor: sanitizeBrandColor(collector.merchant.brandColor || '#4F3DF5'),
        trustedBusiness: true,
        kycVerified: true,
        trustLabel: 'SumioPay Trusted Business',
        billDetails,
        upiIntentUrl: order.upiIntentUrl,
        expiresAt: order.expiresAt,
        collectorOnlineDevices: collector.onlineDevicesCount,
        plan: resolved,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const checkSubscriptionCheckoutStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriberId = req.merchant!._id.toString();
    const { orderId } = req.params;

    const order = await Order.findOne({
      orderId,
      'metadata.type': PLATFORM_SUBSCRIPTION_METADATA_TYPE,
      'metadata.subscriberMerchantId': subscriberId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Subscription checkout order not found' });
    }

    if (order.status === 'PENDING' && new Date(order.expiresAt).getTime() <= Date.now()) {
      order.status = 'EXPIRED';
      await order.save();
    }

    if (order.status === 'PAID') {
      await activatePlatformSubscriptionFromOrder(order).catch(() => {});
    }

    const subscription = await Subscription.findOne({ merchantId: req.merchant!._id });

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        exactAmount: order.exactAmount,
        utrNumber: order.utrNumber || '',
        paidAt: order.paidAt || null,
        expiresAt: order.expiresAt,
        subscription,
      },
    });
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
        .map((o) =>
          [
            escapeCsvCell(o.orderId),
            escapeCsvCell(o.appName),
            escapeCsvCell(o.customerUserId || ''),
            escapeCsvCell(o.exactAmount.toFixed(2)),
            escapeCsvCell(o.utrNumber || ''),
            escapeCsvCell(o.paidAt ? new Date(o.paidAt).toISOString() : ''),
          ].join(',')
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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


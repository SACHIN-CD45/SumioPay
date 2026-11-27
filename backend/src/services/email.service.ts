import nodemailer from 'nodemailer';
import { sanitizeSafeUrl } from '../utils/checkoutBranding';

/**
 * SumioPay Enterprise Email & Billing Receipt Service
 * Configured for Hostinger SMTP (smtp.hostinger.com)
 * Corporate Branding: SumioTech • contact@sumiotech.in • +91 9875182659
 */

const COMPANY = {
  name: 'SumioTech',
  productName: 'SumioPay',
  supportEmail: 'contact@sumiotech.in',
  supportPhone: '+91 9875182659',
  websiteUrl: 'https://sumiopay.sumiotech.in',
  portalUrl: 'https://sumiopay.sumiotech.in/login',
};

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPaymentMethodLabel(rawChannel?: string): string {
  const clean = String(rawChannel || '').trim().toUpperCase();
  if (!clean) return 'UPI Direct';
  if (clean.includes('PHONEPE')) return 'PhonePe UPI';
  if (clean.includes('GPAY') || clean.includes('GOOGLE')) return 'Google Pay UPI';
  if (clean.includes('PAYTM')) return 'Paytm UPI';
  if (clean.includes('BHIM')) return 'BHIM UPI';
  if (clean.includes('CRED')) return 'CRED UPI';
  if (clean.includes('TEST_SANDBOX')) return 'Sandbox Test Mode';
  if (clean.includes('BANK_SMS') || clean.includes('STATEMENT')) return 'UPI Bank Transfer';
  return `${clean.replace(/_/g, ' ')}`;
}

// Create resilient SMTP transport with Hostinger defaults
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'false' ? false : port === 465;
  const user = process.env.SMTP_USER || COMPANY.supportEmail;
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_STRICT === 'true',
    },
  });
};

/**
 * Base Responsive HTML Email Wrapper with SumioPay / SumioTech Branding
 */
const renderEmailLayout = (title: string, bodyContent: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-spacing: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0F172A; padding: 36px 10px; }
    .main-card { background-color: #FFFFFF; border-radius: 20px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1E293B; }
    .header-banner { background: linear-gradient(135deg, #0B132B 0%, #1C2541 50%, #2563EB 100%); padding: 32px; text-align: center; }
    .brand-title { color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .brand-subtitle { color: #93C5FD; font-size: 12px; font-weight: 700; margin-top: 6px; letter-spacing: 0.6px; text-transform: uppercase; }
    .content-area { padding: 32px; color: #1E293B; font-size: 15px; line-height: 1.6; }
    .otp-display { margin: 24px 0; background: #F8FAFC; border: 2px dashed #2563EB; border-radius: 14px; padding: 18px; text-align: center; }
    .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1E3A8A; font-family: 'Courier New', monospace; margin: 0; }
    .otp-expiry { font-size: 12px; color: #64748B; margin-top: 6px; font-weight: 600; }
    .info-box { background: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #1E40AF; line-height: 1.5; }
    .btn-action { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; margin: 20px 0; text-align: center; }
    .footer-area { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748B; }
    .footer-links a { color: #2563EB; text-decoration: none; font-weight: 600; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header-banner">
        <h1 class="brand-title">SumioPay</h1>
        <div class="brand-subtitle">Enterprise Payment Automation &bull; ${COMPANY.name}</div>
      </div>
      <div class="content-area">
        ${bodyContent}
      </div>
      <div class="footer-area">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E293B;">
          ${COMPANY.name}
        </p>
        <p style="margin: 0 0 12px 0;">
          Email: <a href="mailto:${COMPANY.supportEmail}" style="color: #2563EB;">${COMPANY.supportEmail}</a> &bull; Phone: <a href="tel:${COMPANY.supportPhone}" style="color: #2563EB;">${COMPANY.supportPhone}</a>
        </p>
        <div class="footer-links">
          <a href="${COMPANY.websiteUrl}">Official Website</a> &bull;
          <a href="${COMPANY.portalUrl}">Merchant Console</a> &bull;
          <a href="${COMPANY.websiteUrl}/security">Security &amp; Legal</a> &bull;
          <a href="${COMPANY.websiteUrl}/terms">Terms</a>
        </div>
        <p style="margin: 14px 0 0 0; font-size: 11px; color: #94A3B8;">
          &copy; ${new Date().getFullYear()} ${COMPANY.name}. Non-custodial UPI automation software — ₹0.00 held in escrow.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export interface EnterpriseReceiptBillItem {
  label: string;
  quantity?: number;
  amount: number;
}

export interface EnterpriseReceiptBillDetails {
  items?: EnterpriseReceiptBillItem[];
  subtotal?: number;
  couponCode?: string;
  discountAmount?: number;
  taxAmount?: number;
  platformFee?: number;
  note?: string;
}

export interface PaymentReceiptRenderParams {
  recipientName: string;
  orderId: string;
  amount: number;
  exactAmount: number;
  paiseOffset?: number;
  utr: string;
  merchantBusinessName: string;
  websiteName?: string;
  websiteUrl?: string;
  appName?: string;
  planOrItemName?: string;
  paymentMethodLabel?: string;
  paymentDate?: string;
  billDetails?: EnterpriseReceiptBillDetails | null;
  isTest?: boolean;
  recipientRole?: 'CUSTOMER' | 'MERCHANT';
}

export function renderPaymentReceiptEmail(orderDetails: PaymentReceiptRenderParams): {
  subject: string;
  html: string;
} {
  const siteName = orderDetails.websiteName || orderDetails.merchantBusinessName || 'SumioTech';
  const safeSiteName = escapeHtml(siteName);
  const safeRecipient = escapeHtml(
    orderDetails.recipientName || (orderDetails.recipientRole === 'MERCHANT' ? siteName : 'Valued Customer')
  );
  const safeOrderId = escapeHtml(orderDetails.orderId);
  const billNo = `BILL-${safeOrderId}`;
  const safeUtr = escapeHtml(orderDetails.utr || 'Bank Reference Confirmed');
  const safeMethod = escapeHtml(formatPaymentMethodLabel(orderDetails.paymentMethodLabel));
  const safeWebsiteUrl = sanitizeSafeUrl(orderDetails.websiteUrl);
  const formattedDate = escapeHtml(
    orderDetails.paymentDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  );
  const totalPaidFormatted = formatInr(orderDetails.exactAmount || orderDetails.amount);
  const testPrefix = orderDetails.isTest ? '[TEST MODE] ' : '';

  const subject =
    orderDetails.recipientRole === 'MERCHANT'
      ? `${testPrefix}Payment Received: ₹${totalPaidFormatted} • Order #${orderDetails.orderId}`
      : `${testPrefix}Payment Bill & Receipt — ${siteName} (₹${totalPaidFormatted})`;

  const bill = orderDetails.billDetails || {};
  const billItems = Array.isArray(bill.items) ? bill.items.filter((it) => it && it.label) : [];
  const hasCouponDiscount = typeof bill.discountAmount === 'number' && bill.discountAmount > 0;
  const hasTaxOrFee =
    (typeof bill.taxAmount === 'number' && bill.taxAmount > 0) ||
    (typeof bill.platformFee === 'number' && bill.platformFee > 0);
  const hasRichBreakdown = billItems.length > 0 || hasCouponDiscount || hasTaxOrFee;

  let itemsHtml = '';
  if (hasRichBreakdown) {
    if (billItems.length > 0) {
      itemsHtml += billItems
        .map((item) => {
          const qtyText = item.quantity && item.quantity > 1 ? ` &times; ${item.quantity}` : '';
          return `
              <tr>
                <td style="color: #334155; padding: 6px 0;">${escapeHtml(item.label)}${qtyText}</td>
                <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">₹${formatInr(item.amount)}</td>
              </tr>`;
        })
        .join('');
    } else if (typeof bill.subtotal === 'number' && bill.subtotal > 0) {
      itemsHtml += `
          <tr>
            <td style="color: #334155; padding: 6px 0;">${escapeHtml(orderDetails.planOrItemName || orderDetails.appName || 'Subtotal')}</td>
            <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">₹${formatInr(bill.subtotal)}</td>
          </tr>`;
    }

    if (hasCouponDiscount && bill.discountAmount) {
      const couponLabel = bill.couponCode ? `Discount (${escapeHtml(bill.couponCode)})` : 'Discount Applied';
      itemsHtml += `
          <tr>
            <td style="color: #059669; font-weight: 600; padding: 5px 0;">${couponLabel}</td>
            <td style="color: #059669; font-weight: 700; text-align: right; padding: 5px 0;">-₹${formatInr(bill.discountAmount)}</td>
          </tr>`;
    }
    if (typeof bill.taxAmount === 'number' && bill.taxAmount > 0) {
      itemsHtml += `
          <tr>
            <td style="color: #64748B; padding: 5px 0;">Taxes</td>
            <td style="color: #0F172A; font-weight: 600; text-align: right; padding: 5px 0;">₹${formatInr(bill.taxAmount)}</td>
          </tr>`;
    }
    if (typeof bill.platformFee === 'number' && bill.platformFee > 0) {
      itemsHtml += `
          <tr>
            <td style="color: #64748B; padding: 5px 0;">Convenience Fee</td>
            <td style="color: #0F172A; font-weight: 600; text-align: right; padding: 5px 0;">₹${formatInr(bill.platformFee)}</td>
          </tr>`;
    }
  } else {
    itemsHtml = `
        <tr>
          <td style="color: #334155; padding: 6px 0;">${escapeHtml(orderDetails.planOrItemName || orderDetails.appName || 'Online Order Payment')}</td>
          <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">₹${totalPaidFormatted}</td>
        </tr>`;
  }

  const introParagraph =
    orderDetails.recipientRole === 'MERCHANT'
      ? `A customer payment of <strong>₹${totalPaidFormatted}</strong> for <strong>${safeSiteName}</strong> has been confirmed and credited directly to your linked bank UPI account.`
      : `Thank you for your payment to <strong>${safeSiteName}</strong>. Your transaction is confirmed. Please retain this official SumioPay Enterprise Bill for your records.`;

  const testBanner = orderDetails.isTest
    ? `<div style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:700;text-align:center;margin-bottom:18px;">SANDBOX TEST RECEIPT — No real bank funds were transferred</div>`
    : '';

  const siteLinkHtml = safeWebsiteUrl
    ? `<div style="font-size:11px;color:#2563EB;margin-top:2px;"><a href="${escapeHtml(safeWebsiteUrl)}" style="color:#2563EB;text-decoration:none;">${escapeHtml(safeWebsiteUrl)}</a></div>`
    : '';

  const body = `
      ${testBanner}
      <div style="text-align: center; margin-bottom: 22px;">
        <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 50%; background: #DCFCE7; color: #16A34A; font-size: 26px; font-weight: bold;">
          &#10003;
        </div>
        <h2 style="margin: 12px 0 4px 0; color: #0F172A; font-size: 22px; font-weight: 800;">Payment Successful</h2>
        <p style="margin: 0; color: #64748B; font-size: 13px; font-weight: 600;">SumioPay Enterprise Bill &bull; Verified Business Transaction</p>
      </div>

      <p style="font-size: 14px; color: #334155;">
        Hello <strong>${safeRecipient}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        ${introParagraph}
      </p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 22px; margin: 22px 0;">
        <table style="width: 100%; border-bottom: 1px dashed #CBD5E1; padding-bottom: 14px; margin-bottom: 14px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.6px;">Enterprise Bill No.</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A; font-family: monospace;">${billNo}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Order Ref: #${safeOrderId}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.6px;">Status</div>
              <span style="display: inline-block; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; margin-top: 2px;">PAID</span>
            </td>
          </tr>
        </table>

        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #64748B; padding: 5px 0;">Paid To:</td>
            <td style="font-weight: 700; color: #0F172A; text-align: right; padding: 5px 0;">
              ${safeSiteName}
              ${siteLinkHtml}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B;">Bill Summary</td>
          </tr>
          ${itemsHtml}
          <tr style="border-top: 2px solid #CBD5E1; border-bottom: 1px solid #E2E8F0;">
            <td style="font-weight: 800; font-size: 15px; color: #0F172A; padding: 12px 0;">Total Amount Paid:</td>
            <td style="font-weight: 900; font-size: 18px; color: #0F172A; text-align: right; font-family: monospace; padding: 12px 0;">₹${totalPaidFormatted}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 10px 0 4px 0;">Payment Method:</td>
            <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 10px 0 4px 0;">${safeMethod}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 4px 0;">Bank Reference / UTR:</td>
            <td style="font-weight: 700; font-family: monospace; color: #1E40AF; text-align: right; padding: 4px 0;">${safeUtr}</td>
          </tr>
          <tr>
            <td style="color: #64748B; padding: 4px 0;">Date &amp; Time:</td>
            <td style="font-weight: 600; color: #64748B; text-align: right; padding: 4px 0;">${formattedDate} IST</td>
          </tr>
        </table>
      </div>

      <div class="info-box">
        <strong>Direct Bank Settlement:</strong> Funds settled directly into ${safeSiteName}'s bank account. SumioPay never holds, pools, or escrows user funds (₹0.00 balance held).
      </div>

      <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
        Need help with your order or billing? Contact <strong>${safeSiteName}</strong> or SumioTech support at <a href="mailto:${COMPANY.supportEmail}" style="color: #2563EB;">${COMPANY.supportEmail}</a>.
      </p>
    `;

  return {
    subject,
    html: renderEmailLayout(`Payment Receipt • ${siteName}`, body),
  };
}

export class EmailService {
  /**
   * Helper to dispatch mail via Hostinger SMTP with local console fallback
   */
  private static async send(to: string, subject: string, html: string): Promise<boolean> {
    const cleanTo = String(to || '').trim();
    if (!cleanTo || !cleanTo.includes('@')) {
      return false;
    }

    const smtpUser = process.env.SMTP_USER || COMPANY.supportEmail;
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"SumioPay" <${smtpUser}>`;

    if (!smtpPass) {
      console.log(`\n======================================================`);
      console.log(`📧 [EMAIL SIMULATOR - Hostinger SMTP_PASS Missing]`);
      console.log(`To: ${cleanTo}`);
      console.log(`Subject: ${subject}`);
      console.log(`Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}:${process.env.SMTP_PORT || '465'}`);
      console.log(`Note: Set SMTP_PASS in backend/.env to dispatch real emails`);
      console.log(`======================================================\n`);
      return true;
    }

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from,
        to: cleanTo,
        subject,
        html,
      });
      console.log(`[EmailService] Sent "${subject}" to ${cleanTo} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${cleanTo}:`, err.message);
      return false;
    }
  }

  /**
   * 1. Send Email Verification OTP for Merchant Account Registration
   */
  public static async sendRegistrationOtp(email: string, otp: string, name?: string): Promise<boolean> {
    const safeName = name ? escapeHtml(name) : 'Merchant';
    const subject = `${otp} is your SumioPay Verification Code`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Verify Your Email Address</h2>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Thank you for choosing <strong>SumioPay</strong> for your UPI payment automation. To complete your merchant account registration, please enter the one-time verification code below:</p>

      <div class="otp-display">
        <div class="otp-code">${escapeHtml(otp)}</div>
        <div class="otp-expiry">Valid for 10 minutes &bull; Do NOT share this code with anyone</div>
      </div>

      <div class="info-box">
        <strong>Security Tip:</strong> SumioTech representatives will never ask for your password, UPI PIN, or verification OTP.
      </div>

      <p style="margin-bottom: 0; font-size: 13px; color: #64748B;">
        If you did not request this registration, please disregard this email or contact support at <a href="mailto:${COMPANY.supportEmail}" style="color: #2563EB;">${COMPANY.supportEmail}</a>.
      </p>
    `;

    return this.send(email, subject, renderEmailLayout('Email Verification', body));
  }

  /**
   * 2. Send Forgot Password OTP
   */
  public static async sendForgotPasswordOtp(email: string, otp: string, name?: string): Promise<boolean> {
    const safeName = name ? escapeHtml(name) : 'Merchant';
    const subject = `${otp} is your SumioPay Password Reset Code`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Password Reset Request</h2>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>We received a request to reset the password for your <strong>SumioPay</strong> merchant account associated with this email address.</p>

      <div class="otp-display">
        <div class="otp-code">${escapeHtml(otp)}</div>
        <div class="otp-expiry">Valid for 10 minutes &bull; One-time password reset code</div>
      </div>

      <div class="info-box">
        If you did NOT request a password reset, please ignore this message and secure your email account immediately. Support: <strong>${COMPANY.supportPhone}</strong>.
      </div>
    `;

    return this.send(email, subject, renderEmailLayout('Reset Password Code', body));
  }

  /**
   * 3. Send Welcome Email upon Successful Registration
   */
  public static async sendWelcomeEmail(email: string, name: string, businessName: string, upiId: string): Promise<boolean> {
    const safeName = escapeHtml(name);
    const safeBusiness = escapeHtml(businessName || name);
    const safeUpi = escapeHtml(upiId);
    const safeEmail = escapeHtml(email);

    const subject = `Welcome to SumioPay, ${businessName || name}!`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Welcome to SumioPay Smart Payments!</h2>
      <p>Dear <strong>${safeName}</strong>,</p>
      <p>Congratulations! Your merchant account for <strong>${safeBusiness}</strong> has been created and activated on SumioPay.</p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: #1E293B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Account Summary</h4>
        <table style="width: 100%; font-size: 13px;">
          <tr><td style="color: #64748B; padding: 4px 0;">Business Name:</td><td style="font-weight: 700; color: #0F172A; text-align: right;">${safeBusiness}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Merchant Email:</td><td style="font-weight: 700; color: #0F172A; text-align: right;">${safeEmail}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Receiving UPI VPA:</td><td style="font-weight: 700; color: #2563EB; font-family: monospace; text-align: right;">${safeUpi}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Settlement Model:</td><td style="font-weight: 700; color: #10B981; text-align: right;">Direct to Bank (₹0 Held by SumioPay)</td></tr>
        </table>
      </div>

      <h3 style="color: #1E293B; font-size: 15px; margin-top: 24px;">Next 3 Steps to Go Live:</h3>
      <ol style="padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
        <li><strong>Install Companion APK:</strong> Download <code>SumioPayListener.apk</code> from Devices on your dedicated Android phone.</li>
        <li><strong>Pair Listener:</strong> Scan the 30-minute expiring pairing QR code in your dashboard.</li>
        <li><strong>Connect Store or SaaS:</strong> Follow <code>/guide</code> or copy your server API credentials under Connect.</li>
      </ol>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${COMPANY.portalUrl}" class="btn-action">Access Merchant Console &rarr;</a>
      </div>
    `;

    return this.send(email, subject, renderEmailLayout('Welcome to SumioPay', body));
  }

  /**
   * 4. Send Security Alert for New Logins
   */
  public static async sendLoginAlert(email: string, name: string, ipAddress: string, userAgent?: string): Promise<boolean> {
    const subject = `Security Alert: New Login to your SumioPay Account`;
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">New Login Detected</h2>
      <p>Hello <strong>${escapeHtml(name || 'Merchant')}</strong>,</p>
      <p>Your SumioPay merchant console was just accessed with your credentials.</p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <table style="width: 100%;">
          <tr><td style="color: #64748B; padding: 4px 0;">Date &amp; Time:</td><td style="font-weight: 700; color: #0F172A; text-align: right;">${escapeHtml(loginTime)} IST</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">IP Address:</td><td style="font-family: monospace; font-weight: 700; color: #0F172A; text-align: right;">${escapeHtml(ipAddress || 'Unknown')}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Device / Browser:</td><td style="font-weight: 600; color: #0F172A; text-align: right;">${escapeHtml(userAgent ? userAgent.substring(0, 60) : 'Web Console')}</td></tr>
        </table>
      </div>

      <div class="info-box">
        If this was you, you can safely ignore this email. If you did not log in, reset your password immediately.
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${COMPANY.portalUrl}?reset=true" style="color: #EF4444; font-weight: 700; text-decoration: underline; font-size: 13px;">
          Not you? Reset your password &rarr;
        </a>
      </div>
    `;

    return this.send(email, subject, renderEmailLayout('Security Alert: Login', body));
  }

  /**
   * 5. Send SumioPay Enterprise Bill / Payment Receipt Email (Customer & Merchant)
   * Note: Strictly omits internal backend mechanics (paise offsets / listener internals).
   */
  public static async sendPaymentReceipt(
    email: string,
    recipientName: string,
    orderDetails: {
      orderId: string;
      amount: number;
      exactAmount: number;
      paiseOffset?: number;
      utr: string;
      merchantBusinessName: string;
      websiteName?: string;
      websiteUrl?: string;
      appName?: string;
      planOrItemName?: string;
      paymentMethodLabel?: string;
      paymentDate?: string;
      billDetails?: EnterpriseReceiptBillDetails | null;
      isTest?: boolean;
      recipientRole?: 'CUSTOMER' | 'MERCHANT';
    }
  ): Promise<boolean> {
    const { subject, html } = renderPaymentReceiptEmail({
      recipientName,
      ...orderDetails,
    });
    return this.send(email, subject, html);
  }

  /**
   * 6. Send Listener Device Offline Alert to Merchant
   */
  public static async sendDeviceOfflineAlert(
    email: string,
    name: string,
    businessName: string,
    details: {
      offlineMinutes: number;
      totalDevices: number;
      pauseCheckoutWhenOffline: boolean;
    }
  ): Promise<boolean> {
    const subject = `Alert: SumioPay Listener Phone Offline (${businessName})`;
    const body = `
      <h2 style="margin-top: 0; color: #B91C1C; font-size: 20px;">Android Listener Offline Alert</h2>
      <p>Hello <strong>${escapeHtml(name || businessName || 'Merchant')}</strong>,</p>
      <p>All <strong>${details.totalDevices}</strong> paired SumioPay Android Listener device(s) for <strong>${escapeHtml(businessName)}</strong> have not sent a heartbeat ping for more than <strong>${details.offlineMinutes} minute(s)</strong>.</p>

      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #7F1D1D;">
        <strong>What to check on your phone right away:</strong>
        <ul style="margin: 8px 0 0 18px; padding: 0;">
          <li>Verify mobile data / Wi-Fi is active and device is powered on.</li>
          <li>Confirm <strong>Battery Optimization</strong> is set to <em>Unrestricted</em> for SumioPay Listener.</li>
          <li>Open SumioPay Listener once to verify the foreground notification badge is active.</li>
        </ul>
      </div>

      <div class="info-box">
        ${
          details.pauseCheckoutWhenOffline
            ? '<strong>Checkout Shield Active:</strong> New live UPI checkouts are temporarily paused to prevent customers from paying while your listener phone is offline.'
            : '<strong>Tip:</strong> You can enable <em>Pause Checkout When Offline</em> under Devices in your console so customers cannot pay while your phone is unreachable.'
        }
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${COMPANY.websiteUrl}/devices" class="btn-action">Open Listener Devices &rarr;</a>
      </div>
    `;

    return this.send(email, subject, renderEmailLayout('Listener Device Offline Alert', body));
  }
}

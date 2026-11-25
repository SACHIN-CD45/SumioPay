import nodemailer from 'nodemailer';

/**
 * SumioPay Enterprise Email Notification Service
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

// Create resilient SMTP transport with Hostinger defaults
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465);
  const user = process.env.SMTP_USER || 'contact@sumiotech.in';
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
      rejectUnauthorized: false,
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
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-spacing: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0F172A; padding: 40px 10px; }
    .main-card { background-color: #FFFFFF; border-radius: 20px; max-width: 580px; margin: 0 auto; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1E293B; }
    .header-banner { background: linear-gradient(135deg, #0B132B 0%, #1C2541 50%, #2563EB 100%); padding: 36px 32px; text-align: center; }
    .brand-title { color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .brand-subtitle { color: #93C5FD; font-size: 13px; font-weight: 600; margin-top: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
    .content-area { padding: 36px 32px; color: #1E293B; font-size: 15px; line-height: 1.6; }
    .otp-display { margin: 24px 0; background: #F8FAFC; border: 2px dashed #2563EB; border-radius: 14px; padding: 18px; text-align: center; }
    .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1E3A8A; font-family: 'Courier New', monospace; margin: 0; }
    .otp-expiry { font-size: 12px; color: #64748B; margin-top: 6px; font-weight: 600; }
    .info-box { background: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #1E40AF; }
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
        <div class="brand-subtitle">Smart Payment Solutions by ${COMPANY.name}</div>
      </div>
      <div class="content-area">
        ${bodyContent}
      </div>
      <div class="footer-area">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E293B;">
          ${COMPANY.name} Solutions Private Limited
        </p>
        <p style="margin: 0 0 12px 0;">
          Email: <a href="mailto:${COMPANY.supportEmail}" style="color: #2563EB;">${COMPANY.supportEmail}</a> • Phone: <a href="tel:${COMPANY.supportPhone}" style="color: #2563EB;">${COMPANY.supportPhone}</a>
        </p>
        <div class="footer-links">
          <a href="${COMPANY.websiteUrl}">Official Website</a> •
          <a href="${COMPANY.portalUrl}">Merchant Console</a> •
          <a href="${COMPANY.websiteUrl}/terms">Terms &amp; Conditions</a>
        </div>
        <p style="margin: 14px 0 0 0; font-size: 11px; color: #94A3B8;">
          © ${new Date().getFullYear()} ${COMPANY.name}. All rights reserved. 100% Direct Bank Settlement UPI Gateway.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export class EmailService {
  /**
   * Helper to dispatch mail via Hostinger SMTP with local console fallback
   */
  private static async send(to: string, subject: string, html: string): Promise<boolean> {
    const smtpUser = process.env.SMTP_USER || COMPANY.supportEmail;
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"SumioPay" <${smtpUser}>`;

    // If SMTP_PASS is missing, log gracefully to server console so registration/login never fails
    if (!smtpPass) {
      console.log(`\n======================================================`);
      console.log(`📧 [EMAIL SIMULATOR - Hostinger SMTP Pending]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}:${process.env.SMTP_PORT || '465'}`);
      console.log(`Note: Set SMTP_PASS in backend/.env to send live emails`);
      console.log(`======================================================\n`);
      return true;
    }

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Sent to ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      return false;
    }
  }

  /**
   * 1. Send Email Verification OTP for Merchant Account Registration
   */
  public static async sendRegistrationOtp(email: string, otp: string, name?: string): Promise<boolean> {
    const subject = `${otp} is your SumioPay Verification Code`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Verify Your Email Address</h2>
      <p>Hello ${name ? `<strong>${name}</strong>` : 'Merchant'},</p>
      <p>Thank you for choosing <strong>SumioPay</strong> for your UPI payment automation. To complete your merchant account registration, please enter the one-time verification code below:</p>
      
      <div class="otp-display">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Valid for 10 minutes • Do NOT share this code with anyone</div>
      </div>

      <div class="info-box">
        🔒 <strong>Security Tip:</strong> SumioTech representatives will never ask for your password, UPI PIN, or verification OTP.
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
    const subject = `${otp} is your SumioPay Password Reset Code`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Password Reset Request</h2>
      <p>Hello ${name ? `<strong>${name}</strong>` : 'Merchant'},</p>
      <p>We received a request to reset the password for your <strong>SumioPay</strong> merchant account associated with this email address.</p>
      
      <div class="otp-display">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Valid for 10 minutes • One-time password reset code</div>
      </div>

      <div class="info-box">
        ⚠️ If you did NOT request a password reset, your account may be compromised. Please secure your email and contact our support desk immediately at <strong>${COMPANY.supportPhone}</strong>.
      </div>

      <p style="font-size: 13px; color: #64748B;">
        To proceed with changing your password, return to the SumioPay console and enter this code along with your new password.
      </p>
    `;

    return this.send(email, subject, renderEmailLayout('Reset Password Code', body));
  }

  /**
   * 3. Send Welcome Email upon Successful Registration
   */
  public static async sendWelcomeEmail(email: string, name: string, businessName: string, upiId: string): Promise<boolean> {
    const subject = `Welcome to SumioPay, ${businessName || name}! 🚀`;
    const body = `
      <h2 style="margin-top: 0; color: #0F172A; font-size: 20px;">Welcome to SumioPay Smart Payments!</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Congratulations! Your merchant account for <strong>${businessName}</strong> has been successfully created and activated on SumioPay.</p>
      
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: #1E293B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Account Summary</h4>
        <table style="width: 100%; font-size: 13px;">
          <tr><td style="color: #64748B; padding: 4px 0;">Business Name:</td><td style="font-weight: 700; color: #0F172A;">${businessName}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Merchant Email:</td><td style="font-weight: 700; color: #0F172A;">${email}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Receiving UPI VPA:</td><td style="font-weight: 700; color: #2563EB; font-family: monospace;">${upiId}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Gateway Commission:</td><td style="font-weight: 700; color: #10B981;">0% (Direct Bank Settlement)</td></tr>
        </table>
      </div>

      <h3 style="color: #1E293B; font-size: 16px; margin-top: 24px;">Next 3 Steps to Start Receiving Money:</h3>
      <ol style="padding-left: 20px; font-size: 14px; line-height: 1.8; color: #334155;">
        <li><strong>Download Companion APK:</strong> Install <code>SumioPayListener.apk</code> on your spare Android phone.</li>
        <li><strong>Pair Device:</strong> Scan the pairing QR code from your merchant dashboard.</li>
        <li><strong>Embed Checkout:</strong> Add our 1-line script to your website or WooCommerce store.</li>
      </ol>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${COMPANY.portalUrl}" class="btn-action">Access Merchant Console &rarr;</a>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #64748B;">
        Need technical assistance? Our engineering team is here to help at <a href="mailto:${COMPANY.supportEmail}" style="color: #2563EB;">${COMPANY.supportEmail}</a> or call <strong>${COMPANY.supportPhone}</strong>.
      </p>
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
      <p>Hello <strong>${name || 'Merchant'}</strong>,</p>
      <p>Your SumioPay merchant console was just accessed with your credentials.</p>
      
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <table style="width: 100%;">
          <tr><td style="color: #64748B; padding: 4px 0;">Date &amp; Time:</td><td style="font-weight: 700; color: #0F172A;">${loginTime} IST</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">IP Address:</td><td style="font-family: monospace; font-weight: 700; color: #0F172A;">${ipAddress || 'Unknown'}</td></tr>
          <tr><td style="color: #64748B; padding: 4px 0;">Device / Browser:</td><td style="font-weight: 600; color: #0F172A;">${userAgent ? userAgent.substring(0, 60) : 'Web Console'}</td></tr>
        </table>
      </div>

      <div class="info-box">
        If this was you, you can safely ignore this email. If you did not log in, please reset your password immediately and contact support at <strong>${COMPANY.supportPhone}</strong>.
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${COMPANY.portalUrl}?reset=true" style="color: #EF4444; font-weight: 700; text-decoration: underline; font-size: 13px;">
          Not you? Secure your account &rarr;
        </a>
      </div>
    `;

    return this.send(email, subject, renderEmailLayout('Security Alert: Login', body));
  }
}

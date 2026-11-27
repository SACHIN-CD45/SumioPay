import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { SystemSetting } from '../models/systemSetting.model';
import { Merchant } from '../models/merchant.model';
import { Order } from '../models/order.model';
import { downloadApk } from '../controllers/device.controller';
import { publicPaymentLinksRouter } from './paymentLinks.routes';
import {
  getSubscriptionPlanCatalog,
  resolvePlatformCollectorMerchant,
} from '../services/subscriptionActivation.service';

const router = Router();

// First-party Vector SVG QR endpoint scoped strictly to UPI payment intents (avoids leaking VPA/amount to 3rd parties)
router.get('/qr', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData = typeof req.query.data === 'string' ? req.query.data.trim() : '';
    if (!rawData || rawData.length > 512 || !/^upi:\/\/pay\?/i.test(rawData)) {
      res.status(400).json({ success: false, message: 'Invalid or unsupported UPI QR payload' });
      return;
    }

    const svg = await QRCode.toString(rawData, {
      type: 'svg',
      width: 220,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(svg);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to render QR' });
  }
});

// Public APK Download (Direct link or phone camera QR scan)
router.get('/download-apk', downloadApk);

// Public Drop-In Checkout SDK JavaScript
router.get('/checkout.js', (_req: Request, res: Response): void => {
  const candidatePaths = [
    path.resolve(__dirname, '../../public/checkout.js'),
    path.resolve(process.cwd(), 'backend/public/checkout.js'),
    path.resolve(process.cwd(), 'public/checkout.js'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(p);
      return;
    }
  }
  res.status(404).send('// checkout.js not found');
});

// Public WooCommerce Plugin ZIP Download
router.get('/download-woocommerce-plugin', (_req: Request, res: Response): void => {
  const pluginZipPaths = [
    path.resolve(__dirname, '../../public/downloads/sumiopay-woocommerce.zip'),
    path.resolve(process.cwd(), 'public/downloads/sumiopay-woocommerce.zip'),
    path.resolve(process.cwd(), 'backend/public/downloads/sumiopay-woocommerce.zip'),
  ];

  for (const p of pluginZipPaths) {
    if (fs.existsSync(p)) {
      res.download(p, 'sumiopay-woocommerce.zip');
      return;
    }
  }

  res.status(404).json({ success: false, message: 'WooCommerce plugin archive not found' });
});

// Downloadable Zero-Dependency Node.js / MERN SDK Helper (Reads process.env.SUMIOPAY_*)
router.get('/sdk/sumiopay.js', (_req: Request, res: Response): void => {
  const sdkCode = `/**
 * SumioPay Universal Zero-Dependency Node.js / MERN SDK Helper
 * 1. Paste your .env variables downloaded from SumioPay Connect (/connect)
 * 2. Import and call createOrder(), checkSubscription(), or webhookHandler()
 */
const crypto = require('crypto');

class SumioPayClient {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || process.env.SUMIOPAY_API_BASE || 'https://apipay.sumiotech.in/api/v1').replace(/\\/+$/, '');
    this.apiKey = config.apiKey || process.env.SUMIOPAY_PUBLIC_KEY || process.env.SUMIOPAY_API_KEY || '';
    this.apiSecret = config.apiSecret || process.env.SUMIOPAY_API_SECRET || '';
    this.webhookSecret = config.webhookSecret || process.env.SUMIOPAY_WEBHOOK_SECRET || '';
  }

  _headers(extra = {}) {
    if (!this.apiKey) throw new Error('Missing SUMIOPAY_PUBLIC_KEY in .env');
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(this.apiSecret ? { 'x-api-secret': this.apiSecret } : {}),
      ...extra,
    };
  }

  async createOrder({ amountInr, appName = 'APP', customerUserId, customerEmail = '', customerPhone = '', websiteName, brandColor, callbackWebhookUrl, billDetails, idempotencyKey }) {
    const res = await fetch(\`\${this.baseUrl}/payments/orders\`, {
      method: 'POST',
      headers: this._headers(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      body: JSON.stringify({
        amountInPaise: Math.round(Number(amountInr) * 100),
        appName,
        customerUserId,
        customerEmail,
        customerPhone,
        websiteName,
        brandColor,
        callbackWebhookUrl,
        billDetails,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json?.error?.message || json.message || 'Order creation failed');
    return json.data;
  }

  async getOrderStatus(orderId) {
    const res = await fetch(\`\${this.baseUrl}/payments/orders/\${encodeURIComponent(orderId)}/status\`, {
      headers: this._headers(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Status fetch failed');
    return json.data;
  }

  async checkSubscription(customerUserId, planCode) {
    const query = new URLSearchParams({ customerUserId, ...(planCode ? { planCode } : {}) });
    const res = await fetch(\`\${this.baseUrl}/entitlements/check?\${query.toString()}\`, {
      headers: this._headers(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Subscription check failed');
    return json.data;
  }

  async createSubscriptionCheckout({ customerUserId, planCode, customerEmail = '', returnUrl = '' }) {
    const res = await fetch(\`\${this.baseUrl}/entitlements/checkout\`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ customerUserId, planCode, customerEmail, returnUrl }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Checkout creation failed');
    return json.data;
  }

  verifyWebhookSignature(rawBody, signatureHeader, timestampHeader) {
    if (!this.webhookSecret) throw new Error('Missing SUMIOPAY_WEBHOOK_SECRET in .env');
    const ts = parseInt(String(timestampHeader || '0'), 10);
    if (!ts || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
      throw new Error('Expired webhook timestamp');
    }
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(\`\${timestampHeader}.\${rawBody}\`)
      .digest('hex');
    const sigBuf = Buffer.from(String(signatureHeader || ''), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error('Invalid SumioPay HMAC signature');
    }
    return JSON.parse(rawBody);
  }

  /**
   * Drop-in Express middleware (mount BEFORE app.use(express.json())):
   * app.post('/api/webhooks/sumiopay', express.raw({ type: 'application/json' }), sumiopay.webhookMiddleware(async (event) => { ... }));
   */
  webhookMiddleware(onEvent) {
    return async (req, res) => {
      try {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
        const event = this.verifyWebhookSignature(
          raw,
          req.headers['x-sumiopay-signature'],
          req.headers['x-sumiopay-timestamp']
        );
        await onEvent(event, req);
        res.status(200).json({ received: true });
      } catch (err) {
        res.status(401).json({ success: false, message: err.message });
      }
    };
  }
}

module.exports = new SumioPayClient();
module.exports.SumioPayClient = SumioPayClient;
`;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sumiopay.js"');
  res.send(sdkCode);
});

// Downloadable Single-File PHP 8+ SDK Helper
router.get('/sdk/SumioPayClient.php', (_req: Request, res: Response): void => {
  const phpCode = `<?php
/**
 * SumioPay Single-File PHP Integration Helper
 * Configure SUMIOPAY_API_BASE, SUMIOPAY_PUBLIC_KEY, SUMIOPAY_API_SECRET & SUMIOPAY_WEBHOOK_SECRET in .env
 */
class SumioPayClient {
    private string $baseUrl;
    private string $apiKey;
    private string $apiSecret;
    private string $webhookSecret;

    public function __construct(?string $apiKey = null, ?string $apiSecret = null, ?string $webhookSecret = null, ?string $baseUrl = null) {
        $this->baseUrl = rtrim($baseUrl ?: (getenv('SUMIOPAY_API_BASE') ?: 'https://apipay.sumiotech.in/api/v1'), '/');
        $this->apiKey = $apiKey ?: (getenv('SUMIOPAY_PUBLIC_KEY') ?: getenv('SUMIOPAY_API_KEY') ?: '');
        $this->apiSecret = $apiSecret ?: (getenv('SUMIOPAY_API_SECRET') ?: '');
        $this->webhookSecret = $webhookSecret ?: (getenv('SUMIOPAY_WEBHOOK_SECRET') ?: '');
    }

    public function createOrder(float $amountInr, string $customerUserId, string $customerEmail = '', array $extra = []): array {
        $payload = array_merge([
            'amountInPaise' => (int) round($amountInr * 100),
            'customerUserId' => $customerUserId,
            'customerEmail' => $customerEmail,
        ], $extra);
        return $this->request('POST', '/payments/orders', $payload);
    }

    public function getOrderStatus(string $orderId): array {
        return $this->request('GET', '/payments/orders/' . urlencode($orderId) . '/status');
    }

    public function verifyWebhook(string $rawBody, string $signatureHeader, string $timestampHeader): array {
        if (!ctype_digit($timestampHeader) || abs(time() - (int) $timestampHeader) > 300) {
            throw new Exception('Expired webhook timestamp');
        }
        $expected = hash_hmac('sha256', $timestampHeader . '.' . $rawBody, $this->webhookSecret);
        if (!hash_equals($expected, $signatureHeader)) {
            throw new Exception('Invalid SumioPay signature');
        }
        return json_decode($rawBody, true) ?: [];
    }

    private function request(string $method, string $path, ?array $body = null): array {
        $ch = curl_init($this->baseUrl . $path);
        $headers = ['Content-Type: application/json', 'x-api-key: ' . $this->apiKey];
        if ($this->apiSecret) $headers[] = 'x-api-secret: ' . $this->apiSecret;
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 15,
        ]);
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        $raw = curl_exec($ch);
        curl_close($ch);
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded['data'] ?? $decoded : [];
    }
}
`;
  res.setHeader('Content-Type', 'application/x-httpd-php; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="SumioPayClient.php"');
  res.send(phpCode);
});

// Public Platform Configuration Endpoint (Used by Landing Page & Checkout Modal)
router.get('/platform-config', async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    // Dynamic stats to ensure authentic real-time metrics
    const totalMerchants = await Merchant.countDocuments();
    const totalOrdersPaid = await Order.countDocuments({ status: 'PAID' });
    const subscriptionPlans = getSubscriptionPlanCatalog(settings);
    const collector = await resolvePlatformCollectorMerchant(settings);

    res.status(200).json({
      success: true,
      data: {
        announcementText: settings.announcementText,
        announcementLink: settings.announcementLink,
        isAnnouncementActive: settings.isAnnouncementActive,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        allowNewMerchantRegistrations: settings.allowNewMerchantRegistrations,
        totalPlatformGMVFormatted: settings.totalPlatformGMVFormatted,
        totalBusinessesCount: Math.max(settings.totalBusinessesCount, totalMerchants),
        totalOrdersProcessed: totalOrdersPaid,
        slaGuaranteePercent: settings.slaGuaranteePercent,
        enterpriseContactEmail: settings.enterpriseContactEmail,
        supportPhone: settings.supportPhone,
        featureFlags: settings.featureFlags,
        pricingTiers: settings.pricingTiers,
        subscriptionPlans,
        selfBillingReady: Boolean(collector.configured && collector.upiId),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
      data: {
        announcementText: 'New v2.4 Release: Enterprise Multi-Tenant UPI Auto-Verification — 100% Direct Bank Settlement.',
        announcementLink: '/login?register=true',
        isAnnouncementActive: true,
        maintenanceMode: false,
        allowNewMerchantRegistrations: true,
        totalPlatformGMVFormatted: '₹50+ Cr',
        totalBusinessesCount: 1250,
        slaGuaranteePercent: 99.98,
      },
    });
  }
});

router.use(publicPaymentLinksRouter);

export default router;

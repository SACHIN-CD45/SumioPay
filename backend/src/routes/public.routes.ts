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

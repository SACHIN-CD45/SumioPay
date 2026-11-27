import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from './app';
import { config } from './config';
import { SuperAdmin } from './models/superadmin.model';
import { Merchant } from './models/merchant.model';
import { Order } from './models/order.model';

const bootstrap = async () => {
  try {
    console.log(`[SumioPay] Connecting to MongoDB: ${config.MONGODB_URI}...`);
    await mongoose.connect(config.MONGODB_URI);
    console.log('[SumioPay] Connected to MongoDB successfully.');

    // Critical Data Integrity Migration: ensure Order collection does NOT carry a destructive TTL index
    // that deletes PAID order history after 15 minutes.
    try {
      const existingIndexes = await Order.collection.indexes();
      const ttlExpiresIndex = existingIndexes.find(
        (idx: any) =>
          idx?.name === 'expiresAt_1' &&
          typeof idx?.expireAfterSeconds === 'number'
      );
      if (ttlExpiresIndex) {
        await Order.collection.dropIndex('expiresAt_1');
        console.log('[SumioPay Migration] Dropped legacy destructive TTL index expiresAt_1 on orders collection.');
      }
      await Order.syncIndexes();
    } catch (idxErr: any) {
      console.warn('[SumioPay] Order index check warning:', idxErr?.message);
    }

    // Seed default SuperAdmin if none exists
    const adminCount = await SuperAdmin.countDocuments();
    if (adminCount === 0) {
      console.log('[SumioPay] Seeding default SuperAdmin...');
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      const passwordHash = await bcrypt.hash(config.superAdminDefault.password, salt);
      const admin = new SuperAdmin({
        name: config.superAdminDefault.name,
        email: config.superAdminDefault.email.toLowerCase(),
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      await admin.save();
      console.log(
        `[SumioPay] Initial SuperAdmin seeded for ${config.superAdminDefault.email} (set SUPERADMIN_PASSWORD in .env and rotate after login).`
      );
    }

    // Seed default SumioTech corporate merchant for internal apps if not present
    const defaultMerchant = await Merchant.findOne({ email: 'contact@sumiotech.in' });
    if (!defaultMerchant) {
      console.log('[SumioPay] Seeding default SumioTech Corporate Merchant...');
      const initialPassword =
        (process.env.DEFAULT_MERCHANT_PASSWORD || '').trim() ||
        crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      const passwordHash = await bcrypt.hash(initialPassword, salt);
      const sumioMerchant = new Merchant({
        name: 'SumioTech Admin',
        businessName: 'SumioTech',
        email: 'contact@sumiotech.in',
        passwordHash,
        upiId: 'sumiotech@okhdfcbank',
        upiName: 'SumioTech',
        phone: '+91 9875182659',
        webhookUrl: '',
        planTier: 'CUSTOM',
        isActive: true,
      });
      await sumioMerchant.save();
      console.log('[SumioPay] Default SumioTech Merchant created (contact@sumiotech.in).');
      if (!process.env.DEFAULT_MERCHANT_PASSWORD) {
        console.log('[SumioPay] Generated one-time initial password logged outside source; reset via Forgot Password OTP if needed.');
      }
    }

    const app = createApp();

    app.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SumioPay Gateway Backend running on port ${config.PORT}`);
      console.log(`🔗 API Base: http://localhost:${config.PORT}/api`);
      console.log(`🩺 Health: http://localhost:${config.PORT}/health`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('[SumioPay] Bootstrap error:', err);
    process.exit(1);
  }
};

bootstrap();

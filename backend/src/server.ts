import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from './app';
import { config } from './config';
import { SuperAdmin } from './models/superadmin.model';
import { Merchant } from './models/merchant.model';

const bootstrap = async () => {
  try {
    console.log(`[SumioPay] Connecting to MongoDB: ${config.MONGODB_URI}...`);
    await mongoose.connect(config.MONGODB_URI);
    console.log('[SumioPay] Connected to MongoDB successfully.');

    // Seed default SuperAdmin if none exists
    const adminCount = await SuperAdmin.countDocuments();
    if (adminCount === 0) {
      console.log('[SumioPay] Seeding default SuperAdmin...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(config.superAdminDefault.password, salt);
      const admin = new SuperAdmin({
        name: config.superAdminDefault.name,
        email: config.superAdminDefault.email.toLowerCase(),
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      await admin.save();
      console.log(`[SumioPay] Initial SuperAdmin seeded for ${config.superAdminDefault.email} (set SUPERADMIN_PASSWORD in .env and rotate after login).`);
    }

    // Seed default SumioTech corporate merchant for internal apps (SumioLab, SumioBilling, etc.)
    const defaultMerchant = await Merchant.findOne({ email: 'contact@sumiotech.in' });
    if (!defaultMerchant) {
      console.log('[SumioPay] Seeding default SumioTech Corporate Merchant...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password@123', salt);
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
      console.log('[SumioPay] Default SumioTech Merchant created.');
      console.log(`   API Key: ${sumioMerchant.apiKey}`);
      console.log(`   Webhook Secret: ${sumioMerchant.webhookSecret}`);
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

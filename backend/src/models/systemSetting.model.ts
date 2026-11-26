import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  // Marketing & Public Announcement
  announcementText: string;
  announcementLink: string;
  isAnnouncementActive: boolean;

  // Platform Operational Controls
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewMerchantRegistrations: boolean;

  // Enterprise Social Proof & Metrics (displayed on marketing landing)
  totalPlatformGMVFormatted: string;
  totalBusinessesCount: number;
  slaGuaranteePercent: number;
  enterpriseContactEmail: string;
  supportPhone: string;

  // Feature Flags
  featureFlags: {
    enableAutoReconciliation: boolean;
    enableDelayedPaymentRescue: boolean;
    enableSandboxSimulator: boolean;
    enableDeviceHeartbeatAlerts: boolean;
    enableDynamicPaiseEngine: boolean;
  };

  // Pricing Tiers Configuration (Legacy + Rupees & Limits)
  pricingTiers: {
    STARTER: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    GROWTH: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    BUSINESS: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    ENTERPRISE: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
  };

  // Canonical SumioPay SaaS Subscription Plans (SuperAdmin controlled)
  subscriptionPlans: {
    trialDays: number;
    monthlyPrice: number;
    monthlyDurationDays: number;
    monthlyDeviceLimit: number;
    monthlyDescription: string;
    halfYearlyPrice: number;
    halfYearlyDurationDays: number;
    halfYearlyDeviceLimit: number;
    halfYearlyDescription: string;
    customPrice: number;
    customLabel: string;
    customDescription: string;
  };

  // Dogfood Self-Billing Collector Merchant (Collects SumioPay subscription payments via SumioPay)
  platformBilling: {
    collectorMerchantEmail: string;
    collectorApiKey: string;
    isEnabled: boolean;
  };

  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    announcementText: {
      type: String,
      default: 'New v2.4 Release: Enterprise Multi-Tenant UPI Auto-Verification — 100% Direct Bank Settlement.',
    },
    announcementLink: {
      type: String,
      default: '/login?register=true',
    },
    isAnnouncementActive: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'SumioPay Platform is undergoing scheduled infrastructure maintenance. Services will resume shortly.',
    },
    allowNewMerchantRegistrations: {
      type: Boolean,
      default: true,
    },
    totalPlatformGMVFormatted: {
      type: String,
      default: '₹50+ Cr',
    },
    totalBusinessesCount: {
      type: Number,
      default: 1250,
    },
    slaGuaranteePercent: {
      type: Number,
      default: 99.98,
    },
    enterpriseContactEmail: {
      type: String,
      default: 'enterprise@sumiopay.internal',
    },
    supportPhone: {
      type: String,
      default: '+91 800-SUMIOPAY',
    },
    featureFlags: {
      enableAutoReconciliation: { type: Boolean, default: true },
      enableDelayedPaymentRescue: { type: Boolean, default: true },
      enableSandboxSimulator: { type: Boolean, default: true },
      enableDeviceHeartbeatAlerts: { type: Boolean, default: true },
      enableDynamicPaiseEngine: { type: Boolean, default: true },
    },
    pricingTiers: {
      STARTER: {
        monthlyPrice: { type: Number, default: 399 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 2 },
        maxGmv: { type: Number, default: 500000 },
      },
      GROWTH: {
        monthlyPrice: { type: Number, default: 1999 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 5 },
        maxGmv: { type: Number, default: 2500000 },
      },
      BUSINESS: {
        monthlyPrice: { type: Number, default: 4999 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 10 },
        maxGmv: { type: Number, default: 10000000 },
      },
      ENTERPRISE: {
        monthlyPrice: { type: Number, default: 29999 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 999 },
        maxGmv: { type: Number, default: 100000000 },
      },
    },
    subscriptionPlans: {
      trialDays: { type: Number, default: 3 },
      monthlyPrice: { type: Number, default: 399 },
      monthlyDurationDays: { type: Number, default: 30 },
      monthlyDeviceLimit: { type: Number, default: 2 },
      monthlyDescription: {
        type: String,
        default: 'All core UPI auto-verification features, instant webhooks & dynamic QR checkout for 1 month.',
      },
      halfYearlyPrice: { type: Number, default: 1999 },
      halfYearlyDurationDays: { type: Number, default: 180 },
      halfYearlyDeviceLimit: { type: Number, default: 5 },
      halfYearlyDescription: {
        type: String,
        default: 'Best value 6-month plan — multi-device pairing, priority webhooks & full API suite.',
      },
      customPrice: { type: Number, default: 0 },
      customLabel: { type: String, default: 'Custom — All Features Unlocked' },
      customDescription: {
        type: String,
        default: 'All features included: unlimited devices, custom white-label branding, SLA & dedicated support.',
      },
    },
    platformBilling: {
      collectorMerchantEmail: { type: String, default: '', lowercase: true, trim: true },
      collectorApiKey: { type: String, default: '', trim: true },
      isEnabled: { type: Boolean, default: true },
    },
    updatedBy: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

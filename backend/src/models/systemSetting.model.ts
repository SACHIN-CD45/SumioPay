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

  // Pricing Tiers Configuration (Rupees & Limits)
  pricingTiers: {
    STARTER: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    GROWTH: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    BUSINESS: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
    ENTERPRISE: { monthlyPrice: number; feePercent: number; deviceLimit: number; maxGmv: number };
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
        monthlyPrice: { type: Number, default: 1999 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 1 },
        maxGmv: { type: Number, default: 500000 },
      },
      GROWTH: {
        monthlyPrice: { type: Number, default: 4999 },
        feePercent: { type: Number, default: 0 },
        deviceLimit: { type: Number, default: 3 },
        maxGmv: { type: Number, default: 2500000 },
      },
      BUSINESS: {
        monthlyPrice: { type: Number, default: 11999 },
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
    updatedBy: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

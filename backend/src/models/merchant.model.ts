import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type PlanTier =
  | 'FREE'
  | 'TRIAL'
  | 'MONTHLY'
  | 'HALF_YEARLY'
  | 'CUSTOM'
  | 'STARTER'
  | 'GROWTH'
  | 'PRO'
  | 'BUSINESS'
  | 'ENTERPRISE';

export type UpiRoutingMode = 'PRIMARY_ONLY' | 'ROUND_ROBIN' | 'FAILOVER';

export interface IUpiAccount {
  id: string;
  label: string;
  upiId: string;
  upiName: string;
  bankName?: string;
  isActive: boolean;
  isPrimary: boolean;
  dailyLimitInr: number;
  todayVolumeInr: number;
  todayVolumeDate: string;
  totalVolumeInr: number;
  totalTransactions: number;
  createdAt: Date;
}

export interface IMerchant extends Document {
  name: string;
  email: string;
  passwordHash: string;
  businessName: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteLogoUrl?: string;
  brandColor?: string;
  phone?: string;
  upiId: string; // Active Primary UPI e.g. sumiotech@okaxis
  upiName: string; // Active Merchant Display Name in UPI
  upiAccounts: IUpiAccount[];
  upiRoutingMode: UpiRoutingMode;
  upiRotationIndex: number;
  apiKey: string; // sp_live_xxxx
  apiSecret: string; // sp_sec_xxxx
  webhookUrl?: string; // Merchant's callback endpoint
  webhookSecret: string; // Used for HMAC-SHA256 signature
  planTier: PlanTier;
  isActive: boolean;
  totalVolume: number;
  totalTransactions: number;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    businessName: { type: String, required: true, trim: true },
    websiteName: { type: String, trim: true, default: '' },
    websiteUrl: { type: String, trim: true, default: '' },
    websiteLogoUrl: { type: String, trim: true, default: '' },
    brandColor: { type: String, trim: true, default: '#4F3DF5' },
    phone: { type: String, trim: true },
    upiId: { type: String, required: true, trim: true },
    upiName: { type: String, required: true, trim: true },
    upiAccounts: [
      {
        id: { type: String, required: true },
        label: { type: String, default: 'Primary UPI Account', trim: true },
        upiId: { type: String, required: true, trim: true },
        upiName: { type: String, required: true, trim: true },
        bankName: { type: String, default: '', trim: true },
        isActive: { type: Boolean, default: true },
        isPrimary: { type: Boolean, default: false },
        dailyLimitInr: { type: Number, default: 0 },
        todayVolumeInr: { type: Number, default: 0 },
        todayVolumeDate: { type: String, default: '' },
        totalVolumeInr: { type: Number, default: 0 },
        totalTransactions: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    upiRoutingMode: {
      type: String,
      enum: ['PRIMARY_ONLY', 'ROUND_ROBIN', 'FAILOVER'],
      default: 'PRIMARY_ONLY',
    },
    upiRotationIndex: { type: Number, default: 0 },
    apiKey: {
      type: String,
      unique: true,
      default: () => `sp_live_${crypto.randomBytes(16).toString('hex')}`,
    },
    apiSecret: {
      type: String,
      default: () => `sp_sec_${crypto.randomBytes(24).toString('hex')}`,
    },
    webhookUrl: { type: String, trim: true, default: '' },
    webhookSecret: {
      type: String,
      default: () => crypto.randomBytes(20).toString('hex'),
    },
    planTier: {
      type: String,
      enum: [
        'FREE',
        'TRIAL',
        'MONTHLY',
        'HALF_YEARLY',
        'CUSTOM',
        'STARTER',
        'GROWTH',
        'PRO',
        'BUSINESS',
        'ENTERPRISE',
      ],
      default: 'TRIAL',
    },
    isActive: { type: Boolean, default: true },
    totalVolume: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MerchantSchema.index({ email: 1 });
MerchantSchema.index({ apiKey: 1 });

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);
export default Merchant;

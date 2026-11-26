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

export interface IMerchant extends Document {
  name: string;
  email: string;
  passwordHash: string;
  businessName: string;
  phone?: string;
  upiId: string; // e.g. sumiotech@okaxis, 9876543210@paytm
  upiName: string; // Merchant Display Name in UPI
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
    phone: { type: String, trim: true },
    upiId: { type: String, required: true, trim: true },
    upiName: { type: String, required: true, trim: true },
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

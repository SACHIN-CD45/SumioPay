import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentLinkCoupon {
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
  isActive: boolean;
}

export interface IPaymentLink extends Document {
  merchantId: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  description?: string;
  amountMode: 'FIXED' | 'OPEN';
  amountInr: number;
  minAmountInr: number;
  appName: string;
  websiteName?: string;
  brandColor?: string;
  returnUrl?: string;
  saasPlanCode?: string;
  coupons: IPaymentLinkCoupon[];
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  maxUses: number;
  usesCount: number;
  totalCollectedInr: number;
  expiresAt?: Date | null;
  isTest: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    amountMode: { type: String, enum: ['FIXED', 'OPEN'], default: 'FIXED' },
    amountInr: { type: Number, default: 0, min: 0 },
    minAmountInr: { type: Number, default: 1, min: 1 },
    appName: { type: String, trim: true, uppercase: true, default: 'PAYMENT_LINK' },
    websiteName: { type: String, trim: true, default: '' },
    brandColor: { type: String, trim: true, default: '#4F3DF5' },
    returnUrl: { type: String, trim: true, default: '' },
    saasPlanCode: { type: String, trim: true, uppercase: true, default: '' },
    coupons: [
      {
        code: { type: String, required: true, uppercase: true, trim: true },
        discountType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
        discountValue: { type: Number, required: true, min: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    collectName: { type: Boolean, default: true },
    collectEmail: { type: Boolean, default: true },
    collectPhone: { type: Boolean, default: false },
    maxUses: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usesCount: { type: Number, default: 0, min: 0 },
    totalCollectedInr: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    isTest: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PaymentLinkSchema.index({ merchantId: 1, createdAt: -1 });

export const PaymentLink = mongoose.model<IPaymentLink>('PaymentLink', PaymentLinkSchema);
export default PaymentLink;

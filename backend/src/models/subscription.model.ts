import mongoose, { Schema, Document } from 'mongoose';
export type PlanTier =
  | 'TRIAL'
  | 'MONTHLY'
  | 'HALF_YEARLY'
  | 'CUSTOM'
  | 'STARTER'
  | 'GROWTH'
  | 'BUSINESS'
  | 'ENTERPRISE';

export interface ISubscription extends Document {
  merchantId: mongoose.Types.ObjectId;
  planTier: PlanTier;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  monthlyPriceInPaise: number;
  invoiceHistory: Array<{
    invoiceId: string;
    orderId?: string;
    planTier?: string;
    durationDays?: number;
    utrNumber?: string;
    amountInPaise: number;
    paidAt: Date;
    receiptUrl?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, unique: true, index: true },
    planTier: {
      type: String,
      enum: ['TRIAL', 'MONTHLY', 'HALF_YEARLY', 'CUSTOM', 'STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'],
      default: 'TRIAL',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED'],
      default: 'TRIAL',
      index: true,
    },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days free trial default
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    monthlyPriceInPaise: { type: Number, default: 0 },
    invoiceHistory: [
      {
        invoiceId: { type: String, required: true },
        orderId: { type: String },
        planTier: { type: String },
        durationDays: { type: Number },
        utrNumber: { type: String },
        amountInPaise: { type: Number, required: true },
        paidAt: { type: Date, default: Date.now },
        receiptUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;

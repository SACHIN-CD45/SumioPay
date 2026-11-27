import mongoose, { Schema, Document } from 'mongoose';

export interface ISaasPlan extends Document {
  merchantId: mongoose.Types.ObjectId;
  planCode: string;
  name: string;
  description?: string;
  priceInr: number;
  durationDays: number;
  trialDays: number;
  features: string[];
  returnUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SaasPlanSchema = new Schema<ISaasPlan>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    planCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: '', maxlength: 400 },
    priceInr: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, required: true, min: 1, max: 3650 },
    trialDays: { type: Number, default: 0, min: 0, max: 90 },
    features: { type: [String], default: [] },
    returnUrl: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SaasPlanSchema.index({ merchantId: 1, planCode: 1 }, { unique: true });

export const SaasPlan = mongoose.model<ISaasPlan>('SaasPlan', SaasPlanSchema);
export default SaasPlan;

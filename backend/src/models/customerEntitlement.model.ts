import mongoose, { Schema, Document } from 'mongoose';

export type CustomerEntitlementStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export interface ICustomerEntitlement extends Document {
  merchantId: mongoose.Types.ObjectId;
  customerUserId: string;
  customerEmail?: string;
  customerName?: string;
  planCode: string;
  planName: string;
  status: CustomerEntitlementStatus;
  startedAt: Date;
  expiresAt: Date;
  trialGranted: boolean;
  lastOrderId?: string;
  lastUtr?: string;
  activatedOrderIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerEntitlementSchema = new Schema<ICustomerEntitlement>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    customerUserId: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, default: '' },
    customerName: { type: String, trim: true, default: '' },
    planCode: { type: String, required: true, uppercase: true, trim: true },
    planName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'EXPIRED'],
      default: 'TRIAL',
    },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    trialGranted: { type: Boolean, default: false },
    lastOrderId: { type: String, default: '' },
    lastUtr: { type: String, default: '' },
    activatedOrderIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

CustomerEntitlementSchema.index({ merchantId: 1, customerUserId: 1 }, { unique: true });
CustomerEntitlementSchema.index({ merchantId: 1, expiresAt: -1 });

export const CustomerEntitlement = mongoose.model<ICustomerEntitlement>(
  'CustomerEntitlement',
  CustomerEntitlementSchema
);
export default CustomerEntitlement;

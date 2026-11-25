import mongoose, { Schema, Document } from 'mongoose';

export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'REJECTED';

export interface IRefund extends Document {
  refundId: string;
  orderId: string;
  merchantId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  amountInPaise: number;
  reason: string;
  status: RefundStatus;
  providerReference?: string;
  initiatedBy: string; // User ID or 'API'
  processedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    amountInPaise: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    providerReference: { type: String, default: '' },
    initiatedBy: { type: String, default: 'SYSTEM' },
    processedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

RefundSchema.index({ merchantId: 1, createdAt: -1 });

export const Refund = mongoose.model<IRefund>('Refund', RefundSchema);
export default Refund;

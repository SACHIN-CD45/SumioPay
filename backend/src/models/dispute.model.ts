import mongoose, { Schema, Document } from 'mongoose';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_MERCHANT' | 'RESOLVED_CUSTOMER';

export interface IDispute extends Document {
  disputeId: string;
  orderId: string;
  merchantId: mongoose.Types.ObjectId;
  amountInPaise: number;
  reason: string;
  customerStatement?: string;
  merchantResponse?: string;
  status: DisputeStatus;
  evidenceDocs: string[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    disputeId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    amountInPaise: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    customerStatement: { type: String, default: '' },
    merchantResponse: { type: String, default: '' },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_MERCHANT', 'RESOLVED_CUSTOMER'],
      default: 'OPEN',
      index: true,
    },
    evidenceDocs: [{ type: String }],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

DisputeSchema.index({ merchantId: 1, createdAt: -1 });

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
export default Dispute;

import mongoose, { Schema, Document } from 'mongoose';

export interface IUnmappedPayment extends Document {
  merchantId: mongoose.Types.ObjectId;
  amount: number;
  utrNumber?: string;
  senderName?: string;
  rawMessage: string;
  bankAppName?: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'REFUNDED';
  resolvedOrderId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UnmappedPaymentSchema = new Schema<IUnmappedPayment>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    amount: { type: Number, required: true },
    utrNumber: { type: String, default: '', index: true },
    senderName: { type: String, default: '' },
    rawMessage: { type: String, required: true },
    bankAppName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['UNRESOLVED', 'RESOLVED', 'REFUNDED'],
      default: 'UNRESOLVED',
      index: true,
    },
    resolvedOrderId: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const UnmappedPayment = mongoose.model<IUnmappedPayment>('UnmappedPayment', UnmappedPaymentSchema);
export default UnmappedPayment;

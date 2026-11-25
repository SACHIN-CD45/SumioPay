import mongoose, { Schema, Document } from 'mongoose';

export type PaymentOrderState =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'DISPUTED';

export interface IPaymentEvent extends Document {
  orderId: string;
  merchantId: mongoose.Types.ObjectId;
  previousState: PaymentOrderState;
  newState: PaymentOrderState;
  trigger: 'SYSTEM' | 'ANDROID_SIGNAL' | 'WEBHOOK' | 'RECONCILIATION' | 'ADMIN_MANUAL';
  actorId?: string;
  utrNumber?: string;
  metadata?: any;
  createdAt: Date;
}

const PaymentEventSchema = new Schema<IPaymentEvent>(
  {
    orderId: { type: String, required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    previousState: { type: String, required: true },
    newState: { type: String, required: true, index: true },
    trigger: {
      type: String,
      enum: ['SYSTEM', 'ANDROID_SIGNAL', 'WEBHOOK', 'RECONCILIATION', 'ADMIN_MANUAL'],
      required: true,
    },
    actorId: { type: String, default: 'SYSTEM' },
    utrNumber: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PaymentEvent = mongoose.model<IPaymentEvent>('PaymentEvent', PaymentEventSchema);
export default PaymentEvent;

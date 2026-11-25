import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus =
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

export interface IOrder extends Document {
  orderId: string; // e.g. ORD-20261125-9481
  merchantId: mongoose.Types.ObjectId;
  appName: string; // e.g. SUMIOLAB, SUMIOBILLING, SUMIOJEWEL
  customerUserId?: string;
  customerPhone?: string;
  customerEmail?: string;
  baseAmount: number; // e.g. 999
  paiseOffset: number; // e.g. 0.47
  exactAmount: number; // e.g. 999.47
  status: OrderStatus;
  upiIntentUrl: string; // upi://pay?...
  utrNumber?: string; // 12-digit UPI reference ID
  rawNotificationMessage?: string;
  bankAppName?: string;
  expiresAt: Date; // 15 mins TTL
  paidAt?: Date;
  callbackWebhookUrl?: string;
  webhookDeliveryStatus: 'NOT_SENT' | 'DELIVERED' | 'FAILED';
  webhookResponseCode?: number;
  webhookRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    appName: { type: String, required: true, default: 'APP' },
    customerUserId: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    baseAmount: { type: Number, required: true, min: 1 },
    paiseOffset: { type: Number, required: true, min: 0.01, max: 0.99 },
    exactAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'CREATED',
        'PENDING',
        'PROCESSING',
        'PAID',
        'FAILED',
        'EXPIRED',
        'CANCELLED',
        'UNDER_REVIEW',
        'PARTIALLY_REFUNDED',
        'REFUNDED',
        'DISPUTED',
      ],
      default: 'PENDING',
    },
    upiIntentUrl: { type: String, required: true },
    utrNumber: { type: String, default: '' },
    rawNotificationMessage: { type: String, default: '' },
    bankAppName: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
    callbackWebhookUrl: { type: String, default: '' },
    webhookDeliveryStatus: {
      type: String,
      enum: ['NOT_SENT', 'DELIVERED', 'FAILED'],
      default: 'NOT_SENT',
    },
    webhookResponseCode: { type: Number },
    webhookRetries: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index for instant exactAmount match during Android Notification webhook lookup
OrderSchema.index({ merchantId: 1, exactAmount: 1, status: 1 });
OrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // optional TTL index

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;

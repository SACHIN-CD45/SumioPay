import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookLog extends Document {
  merchantId: mongoose.Types.ObjectId;
  orderId: string;
  url: string;
  payload: any;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attempt: number;
  maxAttempts: number;
  delivered: boolean;
  status: 'PENDING_RETRY' | 'DELIVERED' | 'EXHAUSTED';
  nextRetryAt?: Date | null;
  lastAttemptAt?: Date;
  createdAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    orderId: { type: String, required: true },
    url: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    responseStatus: { type: Number },
    responseBody: { type: String },
    error: { type: String },
    attempt: { type: Number, default: 1 },
    maxAttempts: { type: Number, default: 5 },
    delivered: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['PENDING_RETRY', 'DELIVERED', 'EXHAUSTED'],
      default: 'DELIVERED',
    },
    nextRetryAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WebhookLogSchema.index({ merchantId: 1, createdAt: -1 });
WebhookLogSchema.index({ status: 1, nextRetryAt: 1 });

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);
export default WebhookLog;

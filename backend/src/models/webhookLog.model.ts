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
  delivered: boolean;
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
    delivered: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WebhookLogSchema.index({ merchantId: 1, createdAt: -1 });

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);
export default WebhookLog;

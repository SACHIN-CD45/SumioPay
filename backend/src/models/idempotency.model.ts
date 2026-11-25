import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  merchantId: mongoose.Types.ObjectId;
  endpoint: string;
  requestHash: string;
  responseStatus: number;
  responseBody: any;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-expunged by MongoDB TTL
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

IdempotencyRecordSchema.index({ key: 1, merchantId: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>(
  'IdempotencyRecord',
  IdempotencyRecordSchema
);
export default IdempotencyRecord;

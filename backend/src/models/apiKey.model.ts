import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  merchantId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  name: string;
  keyPrefix: string; // e.g. sp_live_a1b2 or sp_test_c3d4
  keyHash: string; // SHA-256 hash of complete key
  permissions: string[]; // e.g. ['orders:create', 'orders:read', 'refunds:create']
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    name: { type: String, required: true, default: 'Default API Key' },
    keyPrefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    permissions: {
      type: [String],
      default: ['orders:create', 'orders:read', 'refunds:create', 'webhooks:manage'],
    },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
export default ApiKey;

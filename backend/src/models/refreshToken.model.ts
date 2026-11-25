import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  merchantId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  tokenHash: string; // SHA-256 hash of refresh token
  tokenFamily: string; // Group identifier for rotation
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  replacedByTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenFamily: { type: String, required: true, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date },
    revokedReason: { type: String },
    replacedByTokenHash: { type: String },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL automatic deletion
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ merchantId: 1, isRevoked: 1 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;

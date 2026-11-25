import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'MERCHANT_OWNER'
  | 'MERCHANT_ADMIN'
  | 'FINANCE_MANAGER'
  | 'DEVELOPER'
  | 'SUPPORT_AGENT'
  | 'READ_ONLY_ANALYST';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  organizationId?: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  mfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: [
        'SUPER_ADMIN',
        'PLATFORM_ADMIN',
        'MERCHANT_OWNER',
        'MERCHANT_ADMIN',
        'FINANCE_MANAGER',
        'DEVELOPER',
        'SUPPORT_AGENT',
        'READ_ONLY_ANALYST',
      ],
      default: 'MERCHANT_OWNER',
      index: true,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, default: '' },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;

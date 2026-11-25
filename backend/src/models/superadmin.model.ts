import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    name: { type: String, required: true, default: 'Super Admin' },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'SUPER_ADMIN' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

SuperAdminSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);
export default SuperAdmin;

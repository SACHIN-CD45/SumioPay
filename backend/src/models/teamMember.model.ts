import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './user.model';

export interface ITeamMember extends Document {
  merchantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  invitedBy?: mongoose.Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: [
        'MERCHANT_OWNER',
        'MERCHANT_ADMIN',
        'FINANCE_MANAGER',
        'DEVELOPER',
        'SUPPORT_AGENT',
        'ANALYST',
      ],
      default: 'DEVELOPER',
    },
    status: {
      type: String,
      enum: ['INVITED', 'ACTIVE', 'SUSPENDED'],
      default: 'INVITED',
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'Merchant' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

TeamMemberSchema.index({ merchantId: 1, email: 1 }, { unique: true });

export const TeamMember = mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
export default TeamMember;

import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  merchantId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  name: string;
  code: string; // e.g. 'SUMIOLAB', 'SUMIOBILLING', 'SUMIOBOOK'
  description?: string;
  webhookUrl?: string;
  webhookSecret: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  isActive: boolean;
  totalOrders: number;
  totalVolumeInPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    webhookUrl: { type: String, default: '' },
    webhookSecret: { type: String, required: true },
    environment: {
      type: String,
      enum: ['SANDBOX', 'PRODUCTION'],
      default: 'PRODUCTION',
    },
    isActive: { type: Boolean, default: true },
    totalOrders: { type: Number, default: 0 },
    totalVolumeInPaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProjectSchema.index({ merchantId: 1, code: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
export default Project;

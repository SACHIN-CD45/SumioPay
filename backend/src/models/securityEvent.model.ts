import mongoose, { Schema, Document } from 'mongoose';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ISecurityEvent extends Document {
  merchantId?: mongoose.Types.ObjectId;
  eventType:
    | 'DUPLICATE_UTR_REPLAY'
    | 'SUSPICIOUS_VELOCITY'
    | 'TAMPERED_WEBHOOK_SIGNATURE'
    | 'BRUTE_FORCE_LOGIN'
    | 'UNAUTHORIZED_CROSS_TENANT_ACCESS'
    | 'INVALID_DEVICE_TOKEN';
  severity: SecuritySeverity;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    description: { type: String, required: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
    isResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SecurityEventSchema.index({ createdAt: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
export default SecurityEvent;

import mongoose, { Schema, Document } from 'mongoose';

export type AuditActorType =
  | 'USER'
  | 'MERCHANT'
  | 'SUPERADMIN'
  | 'API_KEY'
  | 'SYSTEM'
  | 'ANDROID_DEVICE';

export interface IAuditLog extends Document {
  merchantId?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  actorId?: string;
  actorEmail?: string;
  actorType: AuditActorType;
  action: string; // e.g. 'MERCHANT_STATUS_TOGGLED', 'API_KEY_REVOKED', 'ORDER_MANUALLY_RECONCILED'
  resourceType: string; // 'ORDER' | 'MERCHANT' | 'DEVICE' | 'PROJECT' | 'REFUND'
  resourceId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    actorId: { type: String, default: 'SYSTEM', index: true },
    actorEmail: { type: String, default: '' },
    actorType: {
      type: String,
      enum: ['USER', 'MERCHANT', 'SUPERADMIN', 'API_KEY', 'SYSTEM', 'ANDROID_DEVICE'],
      default: 'SYSTEM',
    },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, default: '' },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;

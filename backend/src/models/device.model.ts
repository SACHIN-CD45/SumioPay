import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IDevice extends Document {
  merchantId: mongoose.Types.ObjectId;
  deviceName: string;
  deviceToken: string; // Live pair token for Android APK
  pairingToken?: string; // Short-lived token for initial QR pairing
  deviceModel?: string;
  androidVersion?: string;
  androidId?: string;
  batteryPercent: number;
  isCharging: boolean;
  lastPingAt: Date;
  isActive: boolean;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    deviceName: { type: String, required: true, default: 'Merchant Android Listener' },
    deviceToken: {
      type: String,
      required: true,
      unique: true,
      default: () => `dev_${crypto.randomBytes(20).toString('hex')}`,
    },
    pairingToken: { type: String, sparse: true },
    deviceModel: { type: String, default: 'Android Device' },
    androidVersion: { type: String, default: '13' },
    androidId: { type: String, default: '' },
    batteryPercent: { type: Number, default: 100 },
    isCharging: { type: Boolean, default: true },
    lastPingAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    fcmToken: { type: String, default: '' },
  },
  { timestamps: true }
);

DeviceSchema.index({ merchantId: 1 });
DeviceSchema.index({ deviceToken: 1 });
DeviceSchema.index({ pairingToken: 1 });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
export default Device;

import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  purpose: 'REGISTRATION' | 'PASSWORD_RESET';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ['REGISTRATION', 'PASSWORD_RESET'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Automatic TTL index: MongoDB will delete the document automatically once expiresAt is reached
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
export default Otp;

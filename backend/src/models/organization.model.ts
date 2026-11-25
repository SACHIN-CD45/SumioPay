import mongoose, { Schema, Document } from 'mongoose';

export type KycStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface IOrganization extends Document {
  name: string;
  legalEntityName: string;
  gstin?: string;
  panNumber?: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string;
  kycDocuments: {
    panDocUrl?: string;
    gstDocUrl?: string;
    incorporationCertUrl?: string;
    bankCancelledChequeUrl?: string;
  };
  billingEmail: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    legalEntityName: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },
    kycStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'NOT_SUBMITTED',
      index: true,
    },
    kycRejectionReason: { type: String, default: '' },
    kycDocuments: {
      panDocUrl: { type: String, default: '' },
      gstDocUrl: { type: String, default: '' },
      incorporationCertUrl: { type: String, default: '' },
      bankCancelledChequeUrl: { type: String, default: '' },
    },
    billingEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
export default Organization;

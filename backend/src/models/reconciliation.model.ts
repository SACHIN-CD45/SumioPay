import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliationRecord {
  orderId?: string;
  utrNumber: string;
  amountInPaise: number;
  matchedStatus: 'MATCHED_EXACT' | 'MATCHED_PAISE_DIFFERENTIAL' | 'UNMATCHED_NO_ORDER' | 'DUPLICATE_UTR' | 'MANUAL_RESOLVED';
  matchedAt?: Date;
  bankRawStatementLine?: string;
  notes?: string;
}

export interface IReconciliationBatch extends Document {
  batchId: string;
  merchantId: mongoose.Types.ObjectId;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  totalAmountInPaise: number;
  matchedAmountInPaise: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  records: IReconciliationRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationBatchSchema = new Schema<IReconciliationBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    totalRecords: { type: Number, default: 0 },
    matchedRecords: { type: Number, default: 0 },
    unmatchedRecords: { type: Number, default: 0 },
    totalAmountInPaise: { type: Number, default: 0 },
    matchedAmountInPaise: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    records: [
      {
        orderId: { type: String, default: '' },
        utrNumber: { type: String, required: true },
        amountInPaise: { type: Number, required: true },
        matchedStatus: {
          type: String,
          enum: [
            'MATCHED_EXACT',
            'MATCHED_PAISE_DIFFERENTIAL',
            'UNMATCHED_NO_ORDER',
            'DUPLICATE_UTR',
            'MANUAL_RESOLVED',
          ],
          default: 'UNMATCHED_NO_ORDER',
        },
        matchedAt: { type: Date },
        bankRawStatementLine: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export const ReconciliationBatch = mongoose.model<IReconciliationBatch>(
  'ReconciliationBatch',
  ReconciliationBatchSchema
);
export default ReconciliationBatch;

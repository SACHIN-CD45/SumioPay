import { ReconciliationBatch, IReconciliationRecord } from '../models/reconciliation.model';
import { Order } from '../models/order.model';
import { UnmappedPayment } from '../models/unmappedPayment.model';
import { AuditLog } from '../models/auditLog.model';
import { StateMachineService } from './stateMachine.service';
import mongoose from 'mongoose';
import crypto from 'crypto';

export interface StatementEntry {
  utrNumber: string;
  amountInPaise: number;
  timestamp?: Date;
  rawStatementLine?: string;
  senderName?: string;
}

export class ReconciliationService {
  /**
   * Universal CSV / Text bank passbook parser
   */
  public static parseCsvStatement(csvContent: string): StatementEntry[] {
    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const entries: StatementEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header line if detected
      if (i === 0 && (line.toLowerCase().includes('utr') || line.toLowerCase().includes('amount'))) {
        continue;
      }

      // Format: Date,UTR,Amount,Sender/Description or UTR,Amount
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      let utr = '';
      let amountFloat = 0;
      let sender = '';

      if (parts.length >= 3 && parts[1].length >= 8) {
        utr = parts[1];
        amountFloat = parseFloat(parts[2]);
        sender = parts[3] || '';
      } else {
        utr = parts[0];
        amountFloat = parseFloat(parts[1]);
      }

      if (!isNaN(amountFloat) && amountFloat > 0) {
        entries.push({
          utrNumber: utr,
          amountInPaise: Math.round(amountFloat * 100),
          senderName: sender,
          rawStatementLine: line,
        });
      }
    }

    return entries;
  }

  /**
   * Processes bank statement entries with multi-rule auto matching
   */
  public static async processStatement(params: {
    merchantId: mongoose.Types.ObjectId;
    entries: StatementEntry[];
  }) {
    const batchId = `REC_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const records: IReconciliationRecord[] = [];
    let matchedCount = 0;
    let matchedAmount = 0;
    let totalAmount = 0;

    for (const entry of params.entries) {
      totalAmount += entry.amountInPaise;
      const amountRupees = entry.amountInPaise / 100;

      // RULE 1: Exact UTR Match with already PAID order (Duplicate check)
      if (entry.utrNumber) {
        const existingPaid = await Order.findOne({
          merchantId: params.merchantId,
          utrNumber: entry.utrNumber,
          status: 'PAID',
        });

        if (existingPaid) {
          records.push({
            orderId: existingPaid.orderId,
            utrNumber: entry.utrNumber,
            amountInPaise: entry.amountInPaise,
            matchedStatus: 'MATCHED_EXACT',
            matchedAt: new Date(),
            bankRawStatementLine: entry.rawStatementLine || '',
            notes: `Verified previously settled order ${existingPaid.orderId} with UTR ${entry.utrNumber}`,
          });
          matchedCount++;
          matchedAmount += entry.amountInPaise;
          continue;
        }
      }

      // RULE 2: Exact Paise Match with active PENDING order
      const pendingMatch = await Order.findOne({
        merchantId: params.merchantId,
        exactAmount: amountRupees,
        status: { $in: ['PENDING', 'PROCESSING'] },
      }).sort({ createdAt: -1 });

      if (pendingMatch) {
        matchedCount++;
        matchedAmount += entry.amountInPaise;

        await StateMachineService.transitionOrder({
          order: pendingMatch,
          targetState: 'PAID',
          trigger: 'RECONCILIATION',
          utrNumber: entry.utrNumber,
          metadata: { batchId, rawLine: entry.rawStatementLine },
        });

        records.push({
          orderId: pendingMatch.orderId,
          utrNumber: entry.utrNumber,
          amountInPaise: entry.amountInPaise,
          matchedStatus: 'MATCHED_PAISE_DIFFERENTIAL',
          matchedAt: new Date(),
          bankRawStatementLine: entry.rawStatementLine || '',
          notes: `Auto-reconciled order ${pendingMatch.orderId} via statement paise match ₹${amountRupees.toFixed(2)}`,
        });
        continue;
      }

      // RULE 3: Delayed Payment Detection (Order EXPIRED but exact paise was received late)
      const expiredMatch = await Order.findOne({
        merchantId: params.merchantId,
        exactAmount: amountRupees,
        status: 'EXPIRED',
      }).sort({ createdAt: -1 });

      if (expiredMatch) {
        matchedCount++;
        matchedAmount += entry.amountInPaise;

        // Transition through UNDER_REVIEW to PAID
        await StateMachineService.transitionOrder({
          order: expiredMatch,
          targetState: 'UNDER_REVIEW',
          trigger: 'RECONCILIATION',
          utrNumber: entry.utrNumber,
          metadata: { batchId, reason: 'Delayed transaction arrived after expiry' },
        });

        await StateMachineService.transitionOrder({
          order: expiredMatch,
          targetState: 'PAID',
          trigger: 'RECONCILIATION',
          utrNumber: entry.utrNumber,
          metadata: { batchId, settledDelayed: true },
        });

        records.push({
          orderId: expiredMatch.orderId,
          utrNumber: entry.utrNumber,
          amountInPaise: entry.amountInPaise,
          matchedStatus: 'MATCHED_EXACT',
          matchedAt: new Date(),
          bankRawStatementLine: entry.rawStatementLine || '',
          notes: `Delayed payment matched: Rescued expired order ${expiredMatch.orderId} and confirmed settlement`,
        });
        continue;
      }

      // RULE 4: Unmatched - Log into UnmappedPayment queue for manual review
      records.push({
        utrNumber: entry.utrNumber,
        amountInPaise: entry.amountInPaise,
        matchedStatus: 'UNMATCHED_NO_ORDER',
        bankRawStatementLine: entry.rawStatementLine || '',
        notes: `No pending or expired order matched ₹${amountRupees.toFixed(2)}. Added to Unmapped Payments ledger.`,
      });

      try {
        await UnmappedPayment.create({
          merchantId: params.merchantId,
          amount: amountRupees,
          utrNumber: entry.utrNumber || '',
          senderName: entry.senderName || '',
          rawMessage: entry.rawStatementLine || `Batch ${batchId}: ₹${amountRupees.toFixed(2)}`,
          bankAppName: 'BANK_STATEMENT_UPLOAD',
          status: 'UNRESOLVED',
          notes: `Ingested from Reconciliation Batch ${batchId}`,
        });
      } catch (err: any) {
        console.error('[UnmappedPayment Log Error]', err.message);
      }
    }

    const batch = new ReconciliationBatch({
      batchId,
      merchantId: params.merchantId,
      totalRecords: params.entries.length,
      matchedRecords: matchedCount,
      unmatchedRecords: params.entries.length - matchedCount,
      totalAmountInPaise: totalAmount,
      matchedAmountInPaise: matchedAmount,
      status: 'COMPLETED',
      records,
    });

    await batch.save();
    return batch;
  }

  /**
   * Manual Reconciliation Workflow: Associate unmapped transaction to a specific order
   */
  public static async resolveManualMatch(params: {
    merchantId: mongoose.Types.ObjectId;
    unmappedId: string;
    orderId: string;
    actorEmail: string;
  }) {
    const { merchantId, unmappedId, orderId, actorEmail } = params;

    const unmapped = await UnmappedPayment.findOne({ _id: unmappedId, merchantId });
    if (!unmapped) {
      throw new Error('Unmapped payment record not found');
    }

    if (unmapped.status === 'RESOLVED') {
      throw new Error('This unmapped payment has already been resolved');
    }

    const order = await Order.findOne({ orderId, merchantId });
    if (!order) {
      throw new Error(`Order ${orderId} not found under this merchant account`);
    }

    // Apply state change via State Machine
    await StateMachineService.transitionOrder({
      order,
      targetState: 'PAID',
      trigger: 'ADMIN_MANUAL',
      actorId: actorEmail,
      utrNumber: unmapped.utrNumber || order.utrNumber,
      metadata: { unmappedPaymentId: unmappedId, resolvedBy: actorEmail },
    });

    unmapped.status = 'RESOLVED';
    unmapped.resolvedOrderId = orderId;
    unmapped.notes = `Manually resolved by ${actorEmail} to order ${orderId} on ${new Date().toISOString()}`;
    await unmapped.save();

    await AuditLog.create({
      actorType: 'MERCHANT',
      actorEmail,
      merchantId,
      action: 'PAYMENT_MANUALLY_RECONCILED',
      resourceType: 'ORDER',
      resourceId: orderId,
      newState: { orderId, utr: unmapped.utrNumber, amount: unmapped.amount },
    });

    return { order, unmapped };
  }
}

export default ReconciliationService;

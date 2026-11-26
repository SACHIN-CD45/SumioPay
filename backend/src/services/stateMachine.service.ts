export type PaymentOrderState =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'DISPUTED';

const VALID_TRANSITIONS: Record<PaymentOrderState, PaymentOrderState[]> = {
  CREATED: ['PENDING', 'CANCELLED'],
  PENDING: ['PROCESSING', 'PAID', 'EXPIRED', 'CANCELLED', 'UNDER_REVIEW'],
  PROCESSING: ['PAID', 'FAILED', 'UNDER_REVIEW'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED'],
  FAILED: [],
  EXPIRED: ['UNDER_REVIEW'], // Can be manually reviewed if payment arrived late
  CANCELLED: [],
  UNDER_REVIEW: ['PAID', 'FAILED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
  DISPUTED: ['PAID', 'REFUNDED'],
};

export class StateMachineService {
  public static canTransition(from: PaymentOrderState, to: PaymentOrderState): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static async transitionOrder(params: {
    order: any;
    targetState: PaymentOrderState;
    trigger: 'SYSTEM' | 'ANDROID_SIGNAL' | 'WEBHOOK' | 'RECONCILIATION' | 'ADMIN_MANUAL';
    actorId?: string;
    utrNumber?: string;
    metadata?: any;
  }): Promise<boolean> {
    const { order, targetState, trigger, actorId = 'SYSTEM', utrNumber, metadata } = params;
    const currentState = (order.status || 'CREATED') as PaymentOrderState;

    if (currentState === targetState) {
      return true; // Idempotent no-op
    }

    if (!this.canTransition(currentState, targetState)) {
      throw new Error(
        `Invalid payment state transition: Cannot change status from '${currentState}' to '${targetState}'.`
      );
    }

    // Apply state change
    order.status = targetState;
    if (targetState === 'PAID') {
      order.paidAt = new Date();
      if (utrNumber) order.utrNumber = utrNumber;
    }
    if (typeof order.save === 'function') {
      await order.save();
    }

    // Create immutable audit event
    try {
      const { PaymentEvent } = require('../models/paymentEvent.model');
      if (PaymentEvent && typeof PaymentEvent.create === 'function') {
        await PaymentEvent.create({
          orderId: order.orderId,
          merchantId: order.merchantId,
          previousState: currentState,
          newState: targetState,
          trigger,
          actorId,
          utrNumber: utrNumber || order.utrNumber,
          metadata,
        });
      }
    } catch {
      // In isolated unit tests or memory mode, gracefully continue
    }

    return true;
  }
}

export default StateMachineService;

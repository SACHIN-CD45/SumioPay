import { IPaymentProvider, PaymentInitiationResult, PaymentStatusResult, WebhookVerificationResult, RefundResult } from './paymentProvider.interface';
import { allocateUniquePaise, buildUpiIntentUrl } from '../../utils/paiseAllocator';
import { parseBankNotification } from '../../utils/bankNotificationParser';
import { Order } from '../../models/order.model';
import { config } from '../../config';
import { selectUpiAndAdvanceRotation } from '../upiRouter.service';

export class UpiDirectAdapter implements IPaymentProvider {
  name = 'UPI_DIRECT';

  async createPayment(params: {
    orderId: string;
    merchant: any;
    baseAmountInPaise: number;
    appName: string;
    customerUserId?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentInitiationResult> {
    const baseRupees = params.baseAmountInPaise / 100;
    const { exactAmount, paiseOffset } = await allocateUniquePaise(params.merchant._id, baseRupees);
    const exactAmountInPaise = Math.round(exactAmount * 100);
    const selectedUpi = await selectUpiAndAdvanceRotation(params.merchant);

    const upiIntentUrl = buildUpiIntentUrl(
      selectedUpi.upiId,
      selectedUpi.upiName || params.merchant.businessName,
      exactAmount,
      params.orderId
    );

    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60 * 1000);

    return {
      success: true,
      orderId: params.orderId,
      amountInPaise: params.baseAmountInPaise,
      exactAmountInPaise,
      currency: 'INR',
      upiIntentUrl,
      providerReference: `UPI_${selectedUpi.upiId}`,
      expiresAt,
      metadata: {
        paiseOffsetInPaise: Math.round(paiseOffset * 100),
        merchantVpa: selectedUpi.upiId,
        assignedUpiId: selectedUpi.upiId,
        assignedUpiAccountId: selectedUpi.accountId,
      },
    };
  }

  async getPaymentStatus(orderId: string, merchant: any): Promise<PaymentStatusResult> {
    const order = await Order.findOne({ orderId, merchantId: merchant._id });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const isPaid = order.status === 'PAID';
    return {
      orderId: order.orderId,
      status: order.status as any,
      amountInPaise: Math.round(order.exactAmount * 100),
      currency: 'INR',
      utrNumber: order.utrNumber,
      paidAt: order.paidAt,
      providerReference: order.utrNumber,
    };
  }

  async verifyWebhook(payload: any, headers: Record<string, string>, merchant: any): Promise<WebhookVerificationResult> {
    const message = payload.message || '';
    const packageName = payload.package_name || '';
    const parsed = parseBankNotification(message, packageName);

    if (!parsed.isPaymentAlert || !parsed.amount) {
      return {
        isValid: false,
        eventType: 'notification.ignored',
        isPaid: false,
        rawPayload: payload,
      };
    }

    const amountInPaise = Math.round(parsed.amount * 100);
    return {
      isValid: true,
      eventType: 'payment.success',
      amountInPaise,
      utrNumber: parsed.utr || undefined,
      isPaid: true,
      rawPayload: payload,
    };
  }

  async initiateRefund(params: { orderId: string; amountInPaise: number; reason: string; merchant: any }): Promise<RefundResult> {
    // For Direct UPI, refunds are executed as reverse UPI transfers
    return {
      success: true,
      refundId: `RFD_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      amountInPaise: params.amountInPaise,
      status: 'PENDING',
      providerReference: `MANUAL_REVERSE_UPI_${params.orderId}`,
    };
  }

  async getProviderHealth(): Promise<{ isHealthy: boolean; latencyMs: number; status: string }> {
    return {
      isHealthy: true,
      latencyMs: 12,
      status: 'OPERATIONAL',
    };
  }
}

export const upiDirectAdapter = new UpiDirectAdapter();

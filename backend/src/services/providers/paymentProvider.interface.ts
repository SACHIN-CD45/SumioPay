export interface PaymentInitiationResult {
  success: boolean;
  orderId: string;
  amountInPaise: number;
  exactAmountInPaise: number;
  currency: string;
  upiIntentUrl?: string;
  checkoutUrl?: string;
  providerReference?: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface PaymentStatusResult {
  orderId: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  amountInPaise: number;
  currency: string;
  providerReference?: string;
  utrNumber?: string;
  paidAt?: Date;
  rawEvent?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  orderId?: string;
  eventType: string;
  amountInPaise?: number;
  utrNumber?: string;
  providerReference?: string;
  isPaid: boolean;
  rawPayload: any;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amountInPaise: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  providerReference?: string;
}

export interface IPaymentProvider {
  name: string;
  createPayment(params: {
    orderId: string;
    merchant: any;
    baseAmountInPaise: number;
    appName: string;
    customerUserId?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentInitiationResult>;

  getPaymentStatus(orderId: string, merchant: any): Promise<PaymentStatusResult>;

  verifyWebhook(payload: any, headers: Record<string, string>, merchant: any): Promise<WebhookVerificationResult>;

  initiateRefund(params: {
    orderId: string;
    amountInPaise: number;
    reason: string;
    merchant: any;
  }): Promise<RefundResult>;

  getProviderHealth(): Promise<{ isHealthy: boolean; latencyMs: number; status: string }>;
}

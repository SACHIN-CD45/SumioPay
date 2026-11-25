export type PaymentOrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED';

export interface SumioPayConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface CreateOrderParams {
  appName: string; // e.g. 'SUMIOLAB', 'SUMIOBILLING'
  userId: string;
  planName: string;
  amountInPaise?: number; // Integer minor units (e.g. 49900 for ₹499.00)
  baseAmount?: number; // Rupee float fallback (e.g. 499)
  callbackWebhookUrl?: string;
  customerPhone?: string;
  customerEmail?: string;
  expiryMinutes?: number;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface OrderResponse {
  orderId: string;
  merchantId?: string;
  appName: string;
  userId: string;
  planName: string;
  amountInPaise: number;
  exactAmountInPaise: number;
  baseAmount: number;
  exactAmount: number;
  currency: string;
  status: PaymentOrderStatus;
  upiIntentString: string;
  qrPayload: string;
  expiresAt: string;
  createdAt: string;
  utr?: string;
}

export interface OrderStatusResponse {
  orderId: string;
  status: PaymentOrderStatus;
  amountInPaise: number;
  exactAmount: number;
  appName: string;
  utr?: string;
  paidAt?: string;
  expiresAt: string;
}

export interface CreateRefundParams {
  orderId: string;
  amountInPaise?: number;
  reason: string;
  idempotencyKey?: string;
}

export interface RefundResponse {
  refundId: string;
  orderId: string;
  amountInPaise: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  reason: string;
  createdAt: string;
}

export interface WebhookEventPayload {
  event: 'payment.paid' | 'payment.failed' | 'payment.expired' | 'payment.refunded';
  timestamp: string;
  orderId: string;
  appName: string;
  userId: string;
  planName: string;
  amountInPaise: number;
  exactAmount: number;
  utr?: string;
  metadata?: Record<string, any>;
}

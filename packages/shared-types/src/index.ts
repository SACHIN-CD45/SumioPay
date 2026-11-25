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

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'MERCHANT_OWNER'
  | 'MERCHANT_ADMIN'
  | 'FINANCE_MANAGER'
  | 'DEVELOPER'
  | 'SUPPORT_AGENT'
  | 'ANALYST';

export type PlanTier = 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE';

export interface PlanLimits {
  tier: PlanTier;
  name: string;
  monthlyPriceInPaise: number;
  maxProjects: number;
  maxTeamMembers: number;
  maxMonthlyVolumeInPaise: number;
  maxApiKeys: number;
  maxDevices: number;
  features: string[];
}

export interface PaymentOrderDTO {
  orderId: string;
  merchantId: string;
  projectId?: string;
  appName: string;
  customerUserId?: string;
  customerPhone?: string;
  customerEmail?: string;
  baseAmountInPaise: number;
  exactAmountInPaise: number;
  currency: 'INR';
  status: PaymentOrderState;
  upiId: string;
  upiName: string;
  upiIntentUrl?: string;
  qrPayload?: string;
  utrNumber?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface WebhookEventPayload<T = any> {
  id: string;
  type:
    | 'payment.created'
    | 'payment.pending'
    | 'payment.processing'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'payment.expired'
    | 'payment.cancelled'
    | 'payment.refunded'
    | 'payment.disputed'
    | 'reconciliation.completed'
    | 'device.disconnected';
  created_at: string;
  data: T;
}

export interface BankStatementEntry {
  utr: string;
  amount: number; // in Rupees
  amountInPaise?: number; // in integer paise
  timestamp?: string;
  senderName?: string;
  description?: string;
}

export interface ReconciliationBatchDTO {
  batchId: string;
  merchantId: string;
  totalEntries: number;
  matchedCount: number;
  unmatchedCount: number;
  matchedAmountInPaise: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

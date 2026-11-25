import {
  SumioPayConfig,
  CreateOrderParams,
  OrderResponse,
  OrderStatusResponse,
  CreateRefundParams,
  RefundResponse,
} from './types';
import {
  SumioAuthError,
  SumioValidationError,
  SumioNotFoundError,
  SumioNetworkError,
  SumioPayError,
} from './errors';
import { Webhooks } from './webhooks';

export class SumioPay {
  private readonly apiKey: string;
  private readonly apiSecret?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  public readonly webhooks = Webhooks;

  constructor(config: SumioPayConfig) {
    if (!config.apiKey) {
      throw new SumioAuthError('SumioPay requires a valid apiKey');
    }
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = (config.baseUrl || 'https://pay.sumiotech.com').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries !== undefined ? config.maxRetries : 2;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(this.apiSecret ? { 'x-api-secret': this.apiSecret } : {}),
      ...(options.headers || {}),
    };

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data: any = await response.json().catch(() => ({}));

        if (response.ok && data.success !== false) {
          return (data.data || data) as T;
        }

        const msg = data.message || data.error?.message || `HTTP ${response.status} Error`;

        if (response.status === 401) {
          throw new SumioAuthError(msg);
        }
        if (response.status === 400 || response.status === 422) {
          throw new SumioValidationError(msg, data.error);
        }
        if (response.status === 404) {
          throw new SumioNotFoundError(msg);
        }

        throw new SumioPayError(msg, data.error?.code || 'API_ERROR', response.status, data);
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError' || err instanceof SumioAuthError || err instanceof SumioValidationError) {
          throw err;
        }
        attempt++;
        if (attempt <= this.maxRetries) {
          // Exponential backoff
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 200));
        }
      }
    }

    throw new SumioNetworkError(lastError?.message || 'Failed after multiple retry attempts');
  }

  /**
   * Create a new dynamically verifiable payment order
   */
  public async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const customHeaders: Record<string, string> = {};
    if (params.idempotencyKey) {
      customHeaders['Idempotency-Key'] = params.idempotencyKey;
    }

    return this.request<OrderResponse>('/api/v1/payments/orders', {
      method: 'POST',
      body: params,
      headers: customHeaders,
    });
  }

  /**
   * Fetch complete order details
   */
  public async getOrder(orderId: string): Promise<OrderResponse> {
    return this.request<OrderResponse>(`/api/v1/payments/orders/${encodeURIComponent(orderId)}`);
  }

  /**
   * Lightweight status polling endpoint
   */
  public async getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
    return this.request<OrderStatusResponse>(`/api/v1/payments/orders/${encodeURIComponent(orderId)}/status`);
  }

  /**
   * Cancel an active pending payment order
   */
  public async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/payments/orders/${encodeURIComponent(orderId)}/cancel`,
      { method: 'POST' }
    );
  }

  /**
   * Create a refund for a fulfilled payment order
   */
  public async createRefund(params: CreateRefundParams): Promise<RefundResponse> {
    const customHeaders: Record<string, string> = {};
    if (params.idempotencyKey) {
      customHeaders['Idempotency-Key'] = params.idempotencyKey;
    }

    return this.request<RefundResponse>('/api/v1/payments/refunds', {
      method: 'POST',
      body: params,
      headers: customHeaders,
    });
  }
}

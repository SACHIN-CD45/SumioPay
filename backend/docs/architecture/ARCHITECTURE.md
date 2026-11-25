# SUMIOPAY — Enterprise FinTech SaaS Architecture Blueprint

## 1. System Vision & Domain Model
SUMIOPAY is an enterprise-grade payment orchestration and dynamic UPI auto-verification infrastructure designed for modern SaaS, ecommerce platforms, diagnostic networks, and multi-tenant platforms.

### Core Domain Hierarchy:
```
Organization (Legal Business Entity)
  └── Merchant Account (Financial Entity)
        ├── Projects (Logical Application Environments: SumioLab, SumioBilling, etc.)
        │     ├── API Keys (Hashed, Scoped, Revocable)
        │     ├── Webhook Endpoints (HMAC-SHA256, Retry Policies)
        │     └── Payment Orders (Integer Minor Units / Paise)
        ├── Team Members (RBAC: Owner, Admin, Finance, Developer, Analyst)
        ├── Android Listeners (Device Telemetry, Signal Correlation)
        └── Reconciliation Batches (Bank Passbook & Provider Statement Matching)
```

---

## 2. Financial Integrity & Integer Minor Units
To prevent floating-point rounding errors common in IEEE 754 arithmetic:
- **All monetary calculations are performed in Integer Paise** (Minor Units).
- Example: ₹499.42 is strictly stored and calculated as `49942` paise.
- All database schemas use integer `min: 0` constraints.

---

## 3. Provider-Agnostic Payment Orchestration Engine
The core payment system abstracts providers through an immutable interface:
```typescript
interface IPaymentProvider {
  createPayment(order: PaymentOrderDocument, config: ProviderConfig): Promise<PaymentInitiationResult>;
  getPaymentStatus(orderId: string, config: ProviderConfig): Promise<PaymentStatusResult>;
  verifyWebhook(payload: any, headers: Record<string, string>, config: ProviderConfig): Promise<WebhookVerificationResult>;
  initiateRefund(refund: RefundDocument, config: ProviderConfig): Promise<RefundResult>;
  getRefundStatus(refundId: string, config: ProviderConfig): Promise<RefundStatusResult>;
  reconcileTransactions(batch: ReconciliationBatchDocument, config: ProviderConfig): Promise<ReconciliationResult>;
  getProviderHealth(config: ProviderConfig): Promise<ProviderHealthResult>;
}
```

### Supported Concrete Adapters:
1. `UpiDirectAdapter`: Native dynamic UPI QR & Intent generator with per-merchant collision-free paise differential reservation.
2. `StandardGatewayAdapter`: Production contract for authorized payment gateway / bank collection APIs (Cashfree, Razorpay, Bank Direct).

---

## 4. Payment State Machine & Immutable Event Trail
Every payment order enforces strict state transitions. Arbitrary state jumping is blocked at schema and controller layers:

```
[CREATED] ──> [PENDING] ──┬──> [PROCESSING] ──> [PAID] ──┬──> [PARTIALLY_REFUNDED]
                          │                       │        └──> [REFUNDED]
                          │                       └──> [DISPUTED]
                          ├──> [EXPIRED]
                          ├──> [CANCELLED]
                          └──> [FAILED]
```

Every state transition produces an immutable `PaymentEvent` containing:
- `orderId`: Unique order reference
- `previousState`: Status before transition
- `newState`: Status after transition
- `trigger`: Webhook, Android Signal, Reconciliation, or Manual
- `actorId`: System, User, or API Key ID
- `metadata`: Raw payload, bank UTR, error code
- `timestamp`: UTC ISO timestamp

---

## 5. Security & Anti-Fraud Architecture
1. **Device Token Authorization**: Only physically paired Android listener phones holding high-entropy secrets (`dev_live_...`) can push notification telemetry.
2. **Duplicate UTR Lock**: The database enforces uniqueness on `(merchantId, utrNumber)` for all settled orders. Replay attacks are rejected with HTTP 409.
3. **Paise Differential Anti-Tamper**: If an incoming payment does not match the exact assigned paise, it is queued into `UnmappedPayment` for manual review, preventing unauthorized plan unlocks.
4. **HMAC-SHA256 Webhook Signatures**: Outgoing webhooks are signed using `crypto.createHmac('sha256', secret)`.

---

## 6. Centralized Webhook Delivery Engine
- **Idempotent Delivery**: Consumer receives the same `x-sumiopay-event-id` across retries.
- **Exponential Backoff**: Immediate, 30s, 2m, 15m, 1h, then Dead-Letter Queue (DLQ).
- **Delivery Logs**: Full audit trail of HTTP status codes, execution latency, and response bodies.

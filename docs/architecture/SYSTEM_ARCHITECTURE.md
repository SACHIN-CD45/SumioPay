# SUMIOPAY — Enterprise FinTech SaaS System Architecture

## Executive Summary
SUMIOPAY is an enterprise-grade multi-tenant Payment Orchestration, Dynamic UPI Verification, and Financial Reconciliation SaaS platform. It bridges merchant applications, banking rails, payment aggregators, and Android device telemetry into a unified, secure, and auditable financial infrastructure.

---

## 1. Five Core Product Modules

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                SUMIOPAY PLATFORM                                  │
├─────────────────────┬─────────────────────┬─────────────────────┬─────────────────┤
│  1. Super Admin     │ 2. Merchant Portal  │ 3. Developer Portal │ 4. Reconcile    │
│  - Platform Control │ - Orders & Links    │ - API Key Mgt       │ - Auto Match    │
│  - KYC Approvals    │ - Multi-Project     │ - Signed Webhooks   │ - Bank Imports  │
│  - Risk Engine      │ - Refunds & Disputes│ - SDK & Code Gen    │ - Delayed Queue │
│  - Global Metrics   │ - Team RBAC         │ - Sandbox Simulator │ - Audit Reports │
├─────────────────────┴─────────────────────┴─────────────────────┴─────────────────┤
│                         5. Android Device Connector                               │
│                         - Native Kotlin Telemetry Service                         │
│                         - Encrypted Local Queue & Pairing                         │
│                         - Heartbeat Monitoring & Diagnostics                      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Module 1: Super Admin Console
- **Platform Management**: Central monitoring of all merchant organizations, projects, and active payment providers.
- **KYC & Onboarding Workflows**: Merchant identity verification (GSTIN, PAN, Bank Proof, Director Identity) with multi-state approval/rejection.
- **Risk Management & Fraud Detection**: Real-time alerts on velocity anomalies, duplicate UTR replay attempts, high dispute rates, and unmapped payment volumes.
- **Global Financial Analytics**: Platform-wide Gross Merchandise Volume (GMV), transaction conversion rates, provider health status, and revenue metrics.
- **Privileged Action Audit Logs**: Immutable recording of every administrative intervention (account suspensions, fee changes, provider configuration modifications).

### Module 2: Merchant Dashboard
- **Payment Collection**: Dynamic UPI QR generation, instant UPI intent URLs (PhonePe, Google Pay, Paytm, CRED), and shareable Payment Links.
- **Transactions & Orders Ledger**: Real-time filtering, search by UTR / Customer ID / Date, and deep order details inspection.
- **Multi-Project Workspaces**: Logical environment isolation (e.g. `SumioLab`, `SumioBilling`, `SumioRetail`) under a single legal merchant account.
- **Refunds & Disputes**: Governed refund initiation with audit justification, partial refund tracking, and dispute management workflows.
- **Team RBAC**: Role-based access control (`OWNER`, `ADMIN`, `FINANCE`, `DEVELOPER`, `ANALYST`) with tenant isolation.
- **SaaS Billing & Invoices**: Self-serve subscription management (Starter, Growth, Business, Enterprise) with automated entitlements.

### Module 3: Developer Portal
- **API Key Management**: High-entropy hashed keys (`sp_live_...`, `sp_test_...`) with fine-grained permission scopes (`orders:create`, `orders:read`, `refunds:create`, `reconciliation:read`).
- **Webhook Infrastructure**: HMAC-SHA256 signature verification, customizable event subscriptions, delivery retry logs, and manual redrive.
- **Interactive Sandbox & Simulator**: Realistic test payment simulator allowing developers to test end-to-end integration without real money.
- **Multi-Language SDKs**: TypeScript / Node.js SDK, Python, PHP, and React Checkout Component.

### Module 4: Reconciliation Engine
- **Multi-Rule Matching Engine**:
  1. *Rule 1 (Direct Reference)*: Matches exact bank UTR / provider transaction ID.
  2. *Rule 2 (Paise-Precision Time-Window)*: Matches exact assigned paise + amount within configurable time window (+/- 15 mins).
- **Unmapped / Delayed Payments Queue**: Captures customer payments arriving after order expiry or with amount mismatches for manual review.
- **Bank Statement Processing**: Ingestion of MT940, CSV, and Excel bank passbook dumps.
- **Financial Audit Reports**: Daily, monthly, and custom financial reconciliation summaries with variance analysis.

### Module 5: Android Device Connector
- **Companion App**: Native Android Kotlin app running an official `NotificationListenerService`.
- **Zero-Credential Security**: Does NOT request or store UPI PINs, banking passwords, or payment credentials.
- **Signal Correlation**: Treats notifications as supplementary, unverified signals that trigger backend reconciliation with bank feeds/aggregators.
- **Hardware Telemetry**: Reports battery level, charging status, network latency, and connection health.

---

## 2. Multi-Tenant Domain Hierarchy & Data Isolation

```
Organization (Legal Business Entity)
  └── Merchant (Financial Merchant Account)
        ├── Projects (Isolated Environments: SumioLab, SumioBilling)
        │     ├── API Keys (Project Scoped or Organization Scoped)
        │     ├── Webhook Endpoints (Dedicated URLs and Secrets)
        │     └── Payment Orders (Integer Minor Units / Paise)
        ├── Team Members (RBAC with tenant boundaries)
        ├── Android Devices (Paired Phone Hardware Tokens)
        ├── Provider Accounts (Credentials for Cashfree, Razorpay, Bank Direct)
        └── Reconciliation Batches (Bank Statement Logs)
```

### Strict Isolation Rules:
1. Every database query in merchant context MUST include `{ merchantId: req.merchant._id }`.
2. Cross-merchant queries are strictly rejected with HTTP 403 Forbidden.
3. Database indices are created as compound indices prefixing `merchantId`.

---

## 3. Financial Precision & Integer Minor Units

To prevent IEEE 754 floating-point rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`):
- All amounts are computed, stored, and verified in **Integer Minor Units (Paise)**.
- Base unit: ₹1.00 = 100 paise. ₹499.42 = `49942` paise.
- MongoDB schemas enforce `{ type: Number, min: 0, set: (v) => Math.round(v) }`.
- Frontend display components format paise into localized currency strings only at render time.

---

## 4. Payment Order Finite State Machine

```
                 ┌──────────────┐
                 │   CREATED    │
                 └──────┬───────┘
                        │ (order generation)
                        ▼
                 ┌──────────────┐
                 │   PENDING    │◀──────────────┐
                 └──┬───┬───┬───┘               │
                    │   │   │ (expired / unverified)
       ┌────────────┘   │   └───────────┐       │
       │ (processing)   │ (cancelled)   │       │
       ▼                ▼               ▼       │
┌──────────────┐ ┌─────────────┐ ┌─────────────┐│
│  PROCESSING  │ │  CANCELLED  │ │   EXPIRED   ││
└──────┬───────┘ └─────────────┘ └──────┬──────┘│
       │ (matched)                      │ (late payment)
       ▼                                ▼       │
┌──────────────┐                 ┌─────────────┐│
│     PAID     │                 │UNDER_REVIEW ││
└──┬────┬────┬─┘                 └──────┬──────┘│
   │    │    │ (dispute)                │       │
   │    │    └──────────┐               │       │
   │    │               ▼               │       │
   │    │        ┌─────────────┐        │       │
   │    │        │  DISPUTED   │        │       │
   │    │        └──────┬──────┘        │       │
   │    │ (partial)     │ (settled)     │       │
   │    ▼               └───────────────┼───────┘
   │ ┌────────────────────┐             │
   │ │ PARTIALLY_REFUNDED │             │
   │ └──────────┬─────────┘             │
   │ (full)     │ (remaining)           │
   ▼            ▼                       ▼
┌──────────────────────┐         ┌─────────────┐
│       REFUNDED       │         │   FAILED    │
└──────────────────────┘         └─────────────┘
```

Every transition writes an immutable document to the `PaymentEvent` collection containing `orderId`, `merchantId`, `previousState`, `newState`, `trigger`, `actorId`, `utrNumber`, and `timestamp`.

---

## 5. Webhook Delivery & Cryptographic Signature Protocol

Outgoing webhooks deliver signed JSON payloads with the following headers:
- `x-sumiopay-event-id`: Unique UUID for idempotency.
- `x-sumiopay-timestamp`: Unix timestamp (in seconds) to prevent replay attacks (> 300s rejected).
- `x-sumiopay-signature`: HMAC-SHA256 signature generated over `${timestamp}.${rawBody}` using the project webhook secret.

### Consumer Verification Algorithm:
```typescript
const computedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
  throw new Error('Invalid webhook signature');
}
```

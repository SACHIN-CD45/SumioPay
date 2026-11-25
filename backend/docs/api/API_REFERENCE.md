# SUMIOPAY — Developer API & Integration Reference (v1)

Base URL: `https://pay.sumiotech.com/api/v1` (or `http://localhost:8090/api/v1` in local dev)

---

## 1. Authentication & Security Headers

Every request to the SUMIOPAY Developer API must supply authentication credentials via HTTP headers:

| Header | Type | Description |
|---|---|---|
| `x-api-key` | string | Your merchant or project scoped API key (`sp_live_...` or `sp_test_...`) |
| `x-api-secret` | string | (Optional) API Secret key for privileged operations |
| `Idempotency-Key` | string | (Recommended) UUIDv4 to prevent duplicate billing on network retries |
| `Content-Type` | string | Must be `application/json` |

---

## 2. Integer Minor Units Rule (Paise)
To eliminate floating-point precision loss:
- Always submit amounts in **Integer Paise** via `amountInPaise`.
- Example: For ₹499.00, pass `amountInPaise: 49900`.
- For ₹12,500.50, pass `amountInPaise: 1250050`.

---

## 3. Core REST Endpoints

### 3.1 Create Payment Order
`POST /payments/orders`

#### Request Body:
```json
{
  "amountInPaise": 49900,
  "appName": "SUMIOLAB",
  "customerUserId": "usr_9481",
  "customerPhone": "9876543210",
  "customerEmail": "customer@example.com",
  "callbackWebhookUrl": "https://api.yourdomain.com/webhooks/sumiopay",
  "metadata": {
    "plan": "Diagnostic Standard Package",
    "patientId": "PT-202"
  }
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20261125-E4B29A",
    "amountInPaise": 49900,
    "exactAmountInPaise": 49942,
    "currency": "INR",
    "upiId": "sumiotech@okhdfcbank",
    "merchantName": "SumioTech Solutions",
    "upiIntentUrl": "upi://pay?pa=sumiotech@okhdfcbank&pn=SumioTech&am=499.42&cu=INR&tn=ORD-20261125-E4B29A",
    "status": "PENDING",
    "expiresAt": "2026-11-25T11:45:00.000Z"
  }
}
```

---

### 3.2 Poll Order Status
`GET /payments/orders/:id/status`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20261125-E4B29A",
    "status": "PAID",
    "amount": 499.42,
    "utr": "432198765432",
    "paidAt": "2026-11-25T11:32:15.000Z"
  }
}
```

---

### 3.3 Cancel Order
`POST /payments/orders/:id/cancel`

---

### 3.4 Initiate Refund
`POST /payments/orders/:id/refund`

#### Request Body:
```json
{
  "amountInPaise": 49900,
  "reason": "Customer cancellation request"
}
```

---

## 4. Webhooks & Cryptographic Signature Verification

SUMIOPAY signs all outgoing webhook notifications using HMAC-SHA256:

### Headers sent with each webhook:
- `x-sumiopay-event-id`: Unique event UUID (`evt_...`)
- `x-sumiopay-event`: Event type (e.g. `payment.succeeded`)
- `x-sumiopay-timestamp`: Unix timestamp in seconds
- `x-sumiopay-signature`: HMAC-SHA256 hex digest

### Node.js Verification Example:
```typescript
import crypto from 'crypto';

function verifyWebhook(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  // 1. Replay defense: verify timestamp is within 300 seconds
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    throw new Error('Webhook timestamp expired (replay defense)');
  }

  // 2. Compute signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  // 3. Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}
```

---

## 5. Official TypeScript SDK Usage

```typescript
import { SumioPay } from '@sumiopay/sdk';

const sumio = new SumioPay({
  apiKey: process.env.SUMIOPAY_API_KEY!,
  apiSecret: process.env.SUMIOPAY_API_SECRET,
  baseUrl: 'https://pay.sumiotech.com',
});

// 1. Create Order
const order = await sumio.createOrder({
  appName: 'SUMIOLAB',
  userId: 'usr_101',
  planName: 'Cloud Sync Plan',
  amountInPaise: 49900, // ₹499.00
});

console.log('UPI Intent:', order.upiIntentString);

// 2. Poll Status
const status = await sumio.getOrderStatus(order.orderId);
console.log('Status:', status.status, 'UTR:', status.utr);
```

# @sumiopay/sdk

Official TypeScript & Node.js client library for **SumioPay Universal Payment Infrastructure**.

## Installation

```bash
npm install @sumiopay/sdk
# or
pnpm add @sumiopay/sdk
```

## Quick Start

```typescript
import { SumioPay } from '@sumiopay/sdk';

const sumio = new SumioPay({
  apiKey: process.env.SUMIOPAY_API_KEY!,
  apiSecret: process.env.SUMIOPAY_API_SECRET,
  baseUrl: 'https://pay.sumiotech.com', // or 'http://localhost:5000' in development
});

// 1. Create a payment order with integer paise
async function handleCheckout() {
  const order = await sumio.createOrder({
    appName: 'SUMIOLAB',
    userId: 'usr_98124',
    planName: 'Enterprise Plan',
    amountInPaise: 49900, // ₹499.00
    callbackWebhookUrl: 'https://api.sumiolab.com/webhooks/payment',
    idempotencyKey: 'idemp_txn_10293847',
  });

  console.log('Order created:', order.orderId);
  console.log('Exact amount to pay:', order.exactAmount); // e.g. 499.42
  console.log('UPI Intent URI:', order.upiIntentString);
}

// 2. Poll payment status
async function checkStatus(orderId: string) {
  const status = await sumio.getOrderStatus(orderId);
  console.log('Payment state:', status.status); // PENDING | PAID | EXPIRED
}

// 3. Verify incoming webhook signature in your express handler
import express from 'express';
const app = express();

app.post('/webhooks/payment', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-sumiopay-signature'] as string;
  const rawBody = req.body.toString('utf8');

  try {
    sumio.webhooks.verifySignature(rawBody, signature, process.env.SUMIOPAY_WEBHOOK_SECRET!);
    const event = sumio.webhooks.parseEvent(rawBody);

    if (event.event === 'payment.paid') {
      console.log('Payment confirmed! UTR:', event.utr);
      // Fulfill user subscription
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).send('Invalid signature');
  }
});
```

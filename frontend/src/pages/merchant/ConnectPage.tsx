import React, { useState, useEffect } from 'react';
import { api, API_BASE } from '../../lib/api';
import {
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Code2,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Check,
  Download,
  PackageCheck,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  AlertTriangle,
  Layers,
  Globe,
  Lock,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';

export const ConnectPage: React.FC = () => {
  const [merchant, setMerchant] = useState<any>(null);
  const [platform, setPlatform] = useState<
    'api-tester' | 'saas' | 'sumiolab' | 'link' | 'woocommerce' | 'html' | 'react' | 'node' | 'php' | 'python' | 'curl'
  >('saas');
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Show/Hide Secrets
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Interactive API Tester State
  const [testApiAmount, setTestApiAmount] = useState<number>(299);
  const [testApiAppName, setTestApiAppName] = useState<string>('SumioLab');
  const [testApiEmail, setTestApiEmail] = useState<string>('customer@example.com');
  const [executingApiCall, setExecutingApiCall] = useState(false);
  const [apiCallResponse, setApiCallResponse] = useState<any>(null);

  // Webhook URL Settings
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [savedWebhook, setSavedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{ success: boolean; message: string } | null>(null);

  // Key Rotation
  const [regeneratingKeys, setRegeneratingKeys] = useState(false);

  // Instant Payment Link Generator State
  const [linkAmount, setLinkAmount] = useState<number>(299);
  const [linkAppName, setLinkAppName] = useState<string>('SumioLab');
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/merchant/profile');
      if (res.data.success) {
        setMerchant(res.data.data);
        setWebhookUrlInput(res.data.data.webhookUrl || '');
      }
    } catch (err: any) {
      console.error('[ConnectPage] Failed to fetch profile', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    setSavedWebhook(false);
    try {
      const res = await api.put('/merchant/profile', {
        webhookUrl: webhookUrlInput.trim(),
      });
      if (res.data.success) {
        setSavedWebhook(true);
        setTimeout(() => setSavedWebhook(false), 2500);
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update Webhook URL');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhookPing = async () => {
    setTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const res = await api.post('/webhook/test-dispatch', {
        targetUrl: webhookUrlInput.trim() || merchant?.webhookUrl,
      });
      setTestWebhookResult({
        success: res.data.success,
        message: res.data.message || (res.data.success ? 'Webhook ping acknowledged with HTTP 200!' : 'Webhook delivery failed'),
      });
    } catch (err: any) {
      setTestWebhookResult({
        success: false,
        message: err.response?.data?.message || 'Failed to reach webhook destination',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleRegenerateKeys = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: Regenerating API keys will immediately invalidate your current Live API Key, Secret, and Webhook Secret. All existing website integrations will need the new keys. Are you sure you want to proceed?'
    );
    if (!confirmed) return;

    setRegeneratingKeys(true);
    try {
      const res = await api.post('/merchant/regenerate-api-keys');
      if (res.data.success) {
        alert('✅ New API credentials generated successfully!');
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to regenerate credentials');
    } finally {
      setRegeneratingKeys(false);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.post('/order/create', {
        baseAmount: Number(linkAmount) || 100,
        appName: linkAppName || 'STORE',
      });
      if (res.data.success) {
        const orderId = res.data.data.orderId;
        const url = `${window.location.origin}/pay/${orderId}`;
        setGeneratedOrderId(orderId);
        setGeneratedLink(url);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create payment order');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleExecuteApiTester = async () => {
    try {
      setExecutingApiCall(true);
      setApiCallResponse(null);
      const res = await api.post('/order/create', {
        baseAmount: Number(testApiAmount) || 299,
        appName: testApiAppName || 'SumioLab',
        customerEmail: testApiEmail || 'customer@example.com',
      });
      setApiCallResponse(res.data);
    } catch (err: any) {
      setApiCallResponse({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setExecutingApiCall(false);
    }
  };

  const liveApiKey = merchant?.apiKey || 'sp_live_xxxxxx';
  const liveSecret = merchant?.apiSecret || 'sp_sec_xxxxxx';
  const testApiKey = liveApiKey.startsWith('sp_live_')
    ? liveApiKey.replace('sp_live_', 'sp_test_')
    : `sp_test_${liveApiKey}`;
  const webhookSecret = merchant?.webhookSecret || 'sp_whsec_xxxxxx';

  const codeExamples = {
    saas: `// =========================================================================
// SENIOR SAAS ARCHITECTURE: SuperAdmin Price Control + Active Plan Sync
// Prevents price tampering in browser & auto-activates SaaS subscriptions
// =========================================================================

// [A] IN YOUR SAAS BACKEND (e.g. Node.js / Express / Next.js):
// Never accept "amount" from the frontend! Fetch plan price from your SaaS SuperAdmin DB.

app.post('/api/billing/subscribe', requireUserAuth, async (req, res) => {
  const { planId } = req.body; // e.g. "PRO_YEARLY" controlled in YOUR SuperAdmin panel
  const plan = await saasDb.plans.findOne({ id: planId, isActive: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  // 1. Call SumioPay server-to-server with authoritative price in Paise
  const spRes = await fetch('https://apipay.sumiotech.in/api/v1/payments/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': "${liveApiKey}",
      'x-api-secret': "${liveSecret}",
      'Idempotency-Key': \`sub_\${req.user.id}_\${plan.id}_\${Date.now()}\`,
    },
    body: JSON.stringify({
      amountInPaise: Math.round(plan.priceInInr * 100), // e.g. 99900 for ₹999
      appName: 'MY_SAAS_APP',
      customerUserId: req.user.id,
      customerEmail: req.user.email,
      callbackWebhookUrl: "${merchant?.webhookUrl || 'https://mysaas.com/api/webhooks/sumiopay'}",
      metadata: {
        saasPlanId: plan.id,
        durationDays: plan.durationDays, // e.g. 365
        saasUserId: req.user.id,
      },
    }),
  });

  const { data: order } = await spRes.json();

  // 2. Record PENDING invoice in YOUR SaaS SuperAdmin database
  await saasDb.invoices.create({
    sumiopayOrderId: order.orderId,
    userId: req.user.id,
    planId: plan.id,
    expectedAmount: plan.priceInInr,
    status: 'PENDING',
  });

  // 3. Return ONLY orderId / hostedCheckoutUrl to frontend (user cannot alter price!)
  res.json({ orderId: order.orderId, checkoutUrl: order.hostedCheckoutUrl });
});

// [B] IN YOUR SAAS FRONTEND:
// <script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>
async function startCheckout(planId) {
  const res = await fetch('/api/billing/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
  });
  const { orderId } = await res.json();

  // Open tamper-proof modal for that locked server order (or redirect to checkoutUrl)
  SumioPay.checkout({
    orderId: orderId,
    onSuccess: function(verified) {
      window.location.href = '/dashboard?upgraded=1';
    },
  });
}

// [C] IN YOUR SAAS WEBHOOK (Verify HMAC + Anti-Replay + Unlock Plan in SuperAdmin DB):
// IMPORTANT: Use express.raw({ type: 'application/json' }) so rawBody bytes match exact signature!
app.post('/api/webhooks/sumiopay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-sumiopay-signature'];
  const timestamp = req.headers['x-sumiopay-timestamp'];
  const rawBody   = req.body.toString('utf8');
  const secret    = "${webhookSecret}";

  // 1. Replay defense (reject requests older than 5 mins)
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 300) {
    return res.status(401).send('Timestamp expired');
  }

  // 2. Cryptographic HMAC-SHA256 verification over "\${timestamp}.\${rawBody}"
  const expected = crypto.createHmac('sha256', secret).update(\`\${timestamp}.\${rawBody}\`).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature || '', 'utf8'), Buffer.from(expected, 'utf8'))) {
    return res.status(401).send('Invalid HMAC signature');
  }

  const event = JSON.parse(rawBody);
  if (event.type === 'payment.succeeded') {
    const { orderId, exactAmount, utr, metadata } = event.data;
    const invoice = await saasDb.invoices.findOne({ sumiopayOrderId: orderId });

    // 3. Idempotency & Amount Integrity Guard
    if (invoice && invoice.status !== 'PAID' && exactAmount >= invoice.expectedAmount) {
      await saasDb.invoices.updateOne({ _id: invoice._id }, { $set: { status: 'PAID', utr, paidAt: new Date() } });
      await saasDb.subscriptions.upsert(invoice.userId, {
        planId: metadata.saasPlanId || invoice.planId,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + (metadata.durationDays || 30) * 86400000),
      });
    }
  }

  res.status(200).json({ received: true });
});`,

    sumiolab: `// =========================================================================
// SumioLab Official 1-Click Subscription & Upgrade Integration
// Flow: ₹299 Upgrade Button -> Dynamic UPI Modal -> Bank SMS Telemetry -> Auto-Verify
// =========================================================================

// STEP 1: In SumioLab Frontend (React / Next.js / HTML)
// Include drop-in script in your <head> or layout:
// <script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

// Attach to your "Subscribe to Pro (₹299)" button (or pass server-created orderId):
function handleSubscribeToPro() {
  SumioPay.checkout({
    apiKey: "${liveApiKey}",
    amount: 299,
    appName: "SUMIOLAB",
    planName: "SumioLab Pro Annual Tier",
    userId: currentUser.id,
    customerEmail: currentUser.email,
    customerPhone: currentUser.phone || "9875182659",
    metadata: { planId: "PRO_ANNUAL" },
    onSuccess: function(verifiedOrder) {
      console.log("Payment Confirmed in <1.2s!", verifiedOrder.orderId, verifiedOrder.utrNumber);
      alert("🎉 Welcome to SumioLab Pro! Your subscription is active.");
      window.location.reload();
    },
    onFailure: function(err) {
      console.error("Payment Cancelled/Failed:", err);
    }
  });
}

// -------------------------------------------------------------------------
// STEP 2: Android Companion Phone (Automatic & Zero Manual Work)
// Customer pays ₹299.09 via Google Pay, PhonePe, or Paytm.
// Bank credits merchant account instantly. The SumioPay Listener APK
// intercepts the SMS/Notification and posts payload to SumioPay core.
// -------------------------------------------------------------------------

// STEP 3: In SumioLab Backend (Next.js App Router / Express)
// File: /app/api/webhooks/sumiopay/route.ts

import crypto from 'crypto';

export async function POST(req) {
  const signature = req.headers.get('x-sumiopay-signature') || '';
  const timestamp = req.headers.get('x-sumiopay-timestamp') || '';
  const payloadText = await req.text();
  const secret = "${webhookSecret}";

  // Cryptographic HMAC-SHA256 verification over "\${timestamp}.\${rawBody}"
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payloadText}\`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
    return new Response('Unauthorized Webhook Signature', { status: 401 });
  }

  const event = JSON.parse(payloadText);

  if (event.type === 'payment.succeeded') {
    const { orderId, userId, exactAmount, utr, metadata } = event.data;
    
    // Automatically activate user's subscription in SumioLab DB:
    // await db.users.updateOne(
    //   { _id: userId },
    //   { $set: { isPro: true, planTier: metadata?.planId || 'PRO', proExpiresAt: new Date(Date.now() + 365*24*60*60*1000) } }
    // );

    console.log(\`✅ SumioLab Pro activated for user \${userId} (Order: \${orderId}, UTR: \${utr})\`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}`,

    link: `// =======================================================
// Hosted Direct Payment Link / URL Integration
// =======================================================
// No coding required! You can generate a direct checkout link
// and paste it anywhere:
//
// 1. Direct Website Button:
//    <a href="https://sumiopay.sumiotech.in/pay/ORD-XXXX" target="_blank">
//      Pay via Direct UPI (0% Fee)
//    </a>
//
// 2. WhatsApp or Instagram DM:
//    "Hi! Please complete your payment here: https://sumiopay.sumiotech.in/pay/ORD-XXXX"
//
// 3. Or create links dynamically from your backend:
//    POST /api/v1/payments/orders
//    Headers: { "x-api-key": "${liveApiKey}" }
//    Body:    { "baseAmount": 999, "appName": "STORE" }
//
//    Customer opens the link, scans the dynamic QR with any UPI app,
//    and payment auto-verifies in <1.2s!`,

    woocommerce: `// ==========================================
// WooCommerce & Shopify eCommerce Integration
// ==========================================
// Step 1: In your Store Admin, configure Webhook:
// Webhook URL:    ${merchant?.webhookUrl || 'https://mystore.com/api/sumiopay-webhook'}
// Webhook Secret: ${webhookSecret}
//
// Step 2: When customer proceeds to checkout, create an Order via API:
POST /api/v1/payments/orders
Headers:
  x-api-key: ${liveApiKey}
  Content-Type: application/json
Body:
  {
    "baseAmount": 1499,
    "appName": "WOOCOMMERCE",
    "customerUserId": "order_#1092",
    "customerEmail": "customer@example.com",
    "callbackWebhookUrl": "${merchant?.webhookUrl || 'https://mystore.com/api/sumiopay-webhook'}"
  }

// Response returns:
// - "exactAmount": 1499.42 (Unique paise locked for 15 minutes)
// - "upiIntentUrl": "upi://pay?pa=${merchant?.upiId || 'merchant@okhdfcbank'}&pn=Store&am=1499.42&tr=SP-ORD-xxx"
// - "qrData": QR string for desktop rendering
//
// Step 3: When customer pays via any UPI App, the companion phone auto-captures the bank notification
// and SumioPay posts a signed HMAC webhook to your store, automatically setting WooCommerce Order to "Processing/Completed"!`,

    html: `<!-- ======================================================= -->
<!-- Universal Drop-In HTML / JS Embed for ANY Website/Store -->
<!-- Works on Shopify, WooCommerce, Webflow, Custom HTML/PHP -->
<!-- ======================================================= -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<!-- Drop this button on your product or cart checkout page -->
<button 
  id="sumiopay-buy-btn"
  onclick="SumioPay.checkout({
    apiKey: '${liveApiKey}',
    amount: 999,
    appName: 'MyStore',
    userId: 'cust_84920',
    customerEmail: 'buyer@example.com',
    onSuccess: function(order) {
      console.log('Payment Auto-Verified:', order.orderId, order.utrNumber);
      // Auto-redirect customer to order confirmation page
      window.location.href = '/order-success?orderId=' + order.orderId;
    }
  })"
  style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;border:none;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
  Pay via Direct UPI (0% Fee & Instant Auto-Verify)
</button>`,

    react: `// 1. Drop into your React SaaS (SumioLab, SumioBilling, etc.)
import { UpiCheckoutModal } from './sdk/UpiCheckoutModal';

export const UpgradeButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Upgrade to Pro (₹299)</button>

      <UpiCheckoutModal
        isOpen={open}
        onClose={() => setOpen(false)}
        appName="SUMIOLAB"
        userId="user_12345"
        planName="Pro Annual Plan"
        baseAmount={299}
        customerEmail="developer@sumiolab.in"
        callbackWebhookUrl="${merchant?.webhookUrl || 'https://yourapp.com/api/webhook'}"
        apiKey="${liveApiKey}"
        onSuccess={(payment) => {
          console.log("Auto-Verified in 1.1s:", payment.orderId, payment.utr);
          // Instantly activate user subscription or fulfill order!
        }}
      />
    </>
  );
};`,

    node: `// 2. Node.js / Express Webhook Auto-Verification Listener
const express = require('express');
const crypto = require('crypto');
const app = express();

// Use express.raw so signature matches exact raw request bytes
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-sumiopay-signature'] || '';
  const timestamp = req.headers['x-sumiopay-timestamp'] || '';
  const rawBody = req.body.toString('utf8');
  const secret = "${webhookSecret}";

  // Verify HMAC-SHA256 signature over "\${timestamp}.\${rawBody}"
  const expected = crypto.createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) {
    return res.status(401).send('Invalid signature');
  }

  const { type, data } = JSON.parse(rawBody);
  if (type === 'payment.succeeded') {
    const { orderId, userId, exactAmount, utr, metadata } = data;
    // Auto-mark order as PAID and unlock plan in your SaaS DB!
    console.log(\`Verified payment ₹\${exactAmount} for user \${userId} (UTR: \${utr})\`, metadata);
  }

  res.status(200).json({ received: true });
});`,

    php: `<?php
// ==========================================
// 3. PHP / Laravel / Custom eCommerce Webhook
// ==========================================

// Verify incoming HMAC-SHA256 signature from SumioPay
$signature = $_SERVER['HTTP_X_SUMIOPAY_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP'] ?? '';
$payload   = file_get_contents('php://input');
$secret    = "${webhookSecret}";

$expectedSignature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

if (!hash_equals($signature, $expectedSignature)) {
    http_response_code(401);
    exit('Invalid HMAC Signature');
}

$event = json_decode($payload, true);

if (($event['type'] ?? '') === 'payment.succeeded') {
    $orderId = $event['data']['orderId'];
    $utr = $event['data']['utr'];
    $amount = $event['data']['exactAmount'];

    // Update your MySQL/PostgreSQL database:
    // UPDATE subscriptions SET status = 'ACTIVE', utr = '$utr' WHERE order_id = '$orderId';
}

http_response_code(200);
echo json_encode(['status' => 'acknowledged']);
?>`,

    python: `# 4. Python FastAPI / Flask Webhook Verification
import hmac, hashlib, json, time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "${webhookSecret}"

@app.post("/api/webhook")
async def verify_payment(request: Request):
    body = await request.body()
    signature = request.headers.get("x-sumiopay-signature") or ""
    timestamp = request.headers.get("x-sumiopay-timestamp") or "0"
    
    if abs(time.time() - int(timestamp)) > 300:
        raise HTTPException(status_code=401, detail="Webhook timestamp expired")

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        f"{timestamp}.{body.decode('utf-8')}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    payload = json.loads(body)
    if payload.get("type") == "payment.succeeded":
        data = payload.get("data", {})
        print(f"Verified payment {data.get('orderId')} with UTR {data.get('utr')}")
    return {"status": "success"}`,

    curl: `# 5. Create Payment Order via REST API
curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${liveApiKey}" \\
  -d '{
    "appName": "SUMIOLAB",
    "baseAmount": 299,
    "customerUserId": "usr_9981",
    "customerEmail": "user@sumiolab.in",
    "callbackWebhookUrl": "${merchant?.webhookUrl || 'https://yourapp.com/api/webhook'}"
  }'`,

    'api-tester': `// Interactive Live API Explorer
// Execute real payment creation requests directly from your browser.
// Endpoint: POST https://apipay.sumiotech.in/api/v1/payments/orders
// Authentication: x-api-key: ${liveApiKey}`,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-xs">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-blue-600" />
            Developer API &amp; Integration Hub
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-xs">
            Generate and manage API keys, configure webhooks, and integrate SumioPay into SumioLab or custom eCommerce apps.
          </p>
        </div>

        <button
          onClick={handleRegenerateKeys}
          disabled={regeneratingKeys}
          className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regeneratingKeys ? 'animate-spin' : ''}`} />
          <span>{regeneratingKeys ? 'Generating Fresh Keys...' : 'Generate / Rotate New Keys'}</span>
        </button>
      </div>

      {/* Multi-Tenant Security & Provisioning Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Enterprise Multi-Tenant Isolation Active</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                Isolated: {merchant?.businessName || 'Your Account'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              API credentials are automatically pre-provisioned on signup so you can integrate immediately. To regenerate or roll your keys at any time, click &quot;Generate / Rotate New Keys&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* API & Webhook Credentials Management Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Production &amp; Sandbox API Credentials</h2>
              <p className="text-[11px] text-slate-500">
                Authenticate REST requests and verify tamper-proof HMAC signatures from SumioPay.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Zero-Holding UPI Gateway Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live API Key */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Live API Key (Public / Client-Side)
              </label>
              <span className="text-[10px] font-mono text-slate-400">Header: x-api-key</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={liveApiKey}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(liveApiKey, 'liveKey')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copiedItem === 'liveKey' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedItem === 'liveKey' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Live Secret Key */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Live Secret Key (Server-Side Only)
              </label>
              <span className="text-[10px] font-mono text-amber-600 font-bold">Never expose in frontend</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={liveSecret}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 select-all"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                title={showSecret ? 'Hide Secret' : 'Show Secret'}
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(liveSecret, 'liveSecret')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copiedItem === 'liveSecret' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedItem === 'liveSecret' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Sandbox Test Key */}
          <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Sandbox Test Mode Key
              </label>
              <span className="text-[10px] font-bold text-amber-700 uppercase">Simulated Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={testApiKey}
                className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-mono text-amber-900 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(testApiKey, 'testKey')}
                className="px-3 py-2 rounded-xl bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copiedItem === 'testKey' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedItem === 'testKey' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Webhook HMAC Signing Secret */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Webhook HMAC-SHA256 Secret
              </label>
              <span className="text-[10px] font-mono text-slate-400">Header: x-sumiopay-signature</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                readOnly
                value={webhookSecret}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 select-all"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                title={showWebhookSecret ? 'Hide Secret' : 'Show Secret'}
              >
                {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, 'webhookSecret')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copiedItem === 'webhookSecret' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedItem === 'webhookSecret' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Endpoint URL Configuration */}
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-slate-900 text-xs">Merchant Webhook Endpoint URL</span>
            </div>
            <span className="text-[11px] text-slate-500">
              SumioPay dispatches cryptographic POST alerts to this URL upon payment confirmation.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              value={webhookUrlInput}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              placeholder="e.g. https://sumiolab.in/api/webhooks/sumiopay"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={savingWebhook}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                {savedWebhook ? <Check className="w-3.5 h-3.5" /> : <SaveIcon />}
                <span>{savingWebhook ? 'Saving...' : savedWebhook ? 'Saved!' : 'Save Endpoint'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestWebhookPing}
                disabled={testingWebhook || !webhookUrlInput}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-pulse' : ''}`} />
                <span>{testingWebhook ? 'Pinging...' : 'Send Test Ping'}</span>
              </button>
            </div>
          </div>

          {testWebhookResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                testWebhookResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {testWebhookResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium">{testWebhookResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestWebhookResult(null)}
                className="text-[11px] underline font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Webhook Delivery Center Navigation Pill */}
          <div className="pt-2 border-t border-blue-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-blue-900">
            <span>Need to inspect headers, review delivery history, or resend failed webhooks?</span>
            <a
              href="/webhooks"
              className="font-bold underline text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Open Webhooks &amp; Events Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 4 Steps Architecture Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            1
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Receiving UPI VPA</h3>
          <p className="text-[11px] text-slate-500 font-mono text-blue-600 font-bold break-all">
            {merchant?.upiId || 'Configured in Settings'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            2
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Pair Android Phone</h3>
          <p className="text-[11px] text-slate-500">
            Listener APK intercepts bank SMS &amp; push credits in &lt;1.2s.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            3
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Drop In Checkout SDK</h3>
          <p className="text-[11px] text-slate-500">
            Render dynamic UPI QR or modal checkout on any button.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            4
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Auto-Verify &amp; Invoice</h3>
          <p className="text-[11px] text-slate-500">
            HMAC webhook activates account &amp; email bill is sent automatically.
          </p>
        </div>
      </div>

      {/* Code Integration Playground */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Select Integration Framework</h2>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {[
              { id: 'saas', label: '🏢 SaaS SuperAdmin Pattern' },
              { id: 'api-tester', label: '⚡ Live API Tester' },
              { id: 'sumiolab', label: '⭐ SumioLab (Flagship)' },
              { id: 'link', label: 'Direct Payment Link (URL)' },
              { id: 'woocommerce', label: 'WooCommerce / Shopify' },
              { id: 'html', label: 'Universal HTML/JS' },
              { id: 'react', label: 'React / Next.js' },
              { id: 'node', label: 'Node.js' },
              { id: 'php', label: 'PHP / Laravel' },
              { id: 'python', label: 'Python' },
              { id: 'curl', label: 'cURL REST' },
            ].map((tech) => (
              <button
                key={tech.id}
                onClick={() => setPlatform(tech.id as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  platform === tech.id
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tech.label}
              </button>
            ))}
          </div>
        </div>

        {platform === 'api-tester' && (
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Interactive Live REST API Playground</h3>
                  <p className="text-slate-600 text-[11px]">
                    Simulate a real client order creation against <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-700">POST /api/v1/payments/orders</code>
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                Live Environment Sandbox
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Base Amount (₹)</label>
                <input
                  type="number"
                  value={testApiAmount}
                  onChange={(e) => setTestApiAmount(Number(e.target.value))}
                  placeholder="299"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">App / Service Name</label>
                <input
                  type="text"
                  value={testApiAppName}
                  onChange={(e) => setTestApiAppName(e.target.value)}
                  placeholder="SumioLab"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={testApiEmail}
                  onChange={(e) => setTestApiEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteApiTester}
              disabled={executingApiCall}
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${executingApiCall ? 'animate-bounce' : ''}`} />
              <span>{executingApiCall ? 'Executing Request...' : '⚡ Execute Live API Request'}</span>
            </button>

            {apiCallResponse && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${apiCallResponse.success ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span className="text-white font-bold">Response: {apiCallResponse.success ? '201 Created' : 'Request Error'}</span>
                  </span>
                  {apiCallResponse.data?.orderId && (
                    <a
                      href={`${window.location.origin}/pay/${apiCallResponse.data.orderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold flex items-center gap-1 transition"
                    >
                      <span>Preview Checkout Screen</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <pre className="text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(apiCallResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {platform === 'link' && (
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">Instant Hosted Payment Link Generator</h3>
            </div>
            <p className="text-slate-600 text-xs">
              Generate a shareable payment link that customers can open on any browser, mobile phone, or desktop to pay via UPI QR or UPI apps (GPay, PhonePe, Paytm).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={linkAmount}
                  onChange={(e) => setLinkAmount(Number(e.target.value))}
                  placeholder="e.g. 299"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">App / Product Name</label>
                <input
                  type="text"
                  value={linkAppName}
                  onChange={(e) => setLinkAppName(e.target.value)}
                  placeholder="e.g. SumioLab Pro"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {generatingLink ? (
                    'Generating Link...'
                  ) : (
                    <>
                      <span>Generate Payment Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedLink && (
              <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Generated Payment URL:</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">Ready to Share</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-blue-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {platform === 'woocommerce' && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-blue-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Download Official WooCommerce Plugin (.ZIP)</h3>
              </div>
              <p className="text-slate-600 text-[11px] max-w-2xl leading-relaxed">
                Zero code needed! Upload this zip to your WordPress Admin (<code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800">Plugins &gt; Add New &gt; Upload Plugin</code>). Enter your API Key and Webhook Secret below to start auto-verifying UPI payments.
              </p>
            </div>
            <a
              href="/api/public/download-woocommerce-plugin"
              download="sumiopay-woocommerce.zip"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-2 whitespace-nowrap text-xs"
            >
              <Download className="w-4 h-4" />
              Download Plugin ZIP (v2.4)
            </a>
          </div>
        )}

        <div className="relative">
          <pre className="p-5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
            <code>{codeExamples[platform]}</code>
          </pre>

          <button
            onClick={() => copyToClipboard(codeExamples[platform], 'codeSnippet')}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border border-slate-700"
          >
            {copiedItem === 'codeSnippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedItem === 'codeSnippet' ? 'Copied' : 'Copy Snippet'}
          </button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            💡 Need customized assistance? Email{' '}
            <a href="mailto:contact@sumiotech.in" className="text-blue-600 font-bold underline">
              contact@sumiotech.in
            </a>{' '}
            or call <span className="text-slate-800 font-bold">+91 9875182659</span>.
          </div>

          <button
            onClick={() => setTestModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Launch Live Interactive Payment Test
          </button>
        </div>
      </div>

      <UpiCheckoutModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        appName="SUMIOLAB"
        userId="enterprise_demo_usr"
        planName="SumioLab Pro Tier"
        baseAmount={299}
        apiUrl={API_BASE}
        apiKey={liveApiKey}
        onSuccess={(data) => {
          alert(`Test Payment Confirmed! Order: ${data.orderId}, Amount: ₹${data.amount}`);
          setTestModalOpen(false);
        }}
      />
    </div>
  );
};

// Inline helper icon for save button
const SaveIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

export default ConnectPage;

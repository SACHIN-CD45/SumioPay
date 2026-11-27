import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoHead } from '../../components/SeoHead';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  CreditCard,
  FileCode2,
  FolderGit2,
  KeyRound,
  Layers,
  Lock,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Users,
  Wallet,
  Webhook,
  Zap,
} from 'lucide-react';

type GuideSection = 'integrate' | 'merchant' | 'superadmin' | 'security';
type CodeTab = 'saas' | 'html' | 'react' | 'webhook_node' | 'webhook_php' | 'webhook_python' | 'curl';

export const IntegrationGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState<GuideSection>('integrate');
  const [codeTab, setCodeTab] = useState<CodeTab>('saas');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copySnippet = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const snippets: Record<CodeTab, { title: string; subtitle: string; code: string }> = {
    saas: {
      title: 'Recommended Production Pattern: Backend-Locked Order + Checkout SDK',
      subtitle:
        'Create the order on your server with Idempotency-Key so customers cannot alter bill amounts or coupons in browser DevTools.',
      code: `// 1. YOUR BACKEND (Node.js / Next.js / Express / Laravel): Create Authoritative Order
app.post('/api/checkout/create', requireUserSession, async (req, res) => {
  const planPriceInr = 2817.84; // Compute price + coupon discount on your server DB!

  const response = await fetch('https://apipay.sumiotech.in/api/v1/payments/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SUMIOPAY_LIVE_KEY,       // sp_live_... (or sp_test_... for sandbox)
      'x-api-secret': process.env.SUMIOPAY_API_SECRET,  // sp_sec_... (keep secret on backend only)
      'Idempotency-Key': \`ord_\${req.user.id}_\${req.body.cartId}\`,
    },
    body: JSON.stringify({
      amountInPaise: Math.round(planPriceInr * 100),
      appName: 'MY_SAAS_APP',
      customerUserId: req.user.id,
      customerEmail: req.user.email,
      customerPhone: req.user.phone,
      websiteName: 'YourBrandStore',
      brandColor: '#4F3DF5',
      callbackWebhookUrl: 'https://yourwebsite.com/api/webhooks/sumiopay',
      billDetails: {
        items: [{ label: 'Pro Cloud Plan (12 Months)', quantity: 1, amount: 3499 }],
        subtotal: 3499,
        couponCode: 'SAVE20',
        discountAmount: 681.16,
        note: 'Direct UPI settlement — 0% gateway fee.',
        returnUrl: 'https://yourwebsite.com/billing/success',
      },
    }),
  });

  const result = await response.json();
  // Return hostedCheckoutUrl OR orderId to frontend:
  res.json({
    orderId: result.data.orderId,
    hostedCheckoutUrl: result.data.hostedCheckoutUrl,
  });
});

// 2. YOUR FRONTEND: Open Hostinger/Razorpay-Style Modal or Redirect to Hosted Page
// <script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>
SumioPay.checkout({
  orderId: data.orderId, // Locked price & branding loaded safely from backend
  onSuccess: function (verifiedOrder) {
    window.location.href = '/billing/success?orderId=' + verifiedOrder.orderId;
  },
});`,
    },
    html: {
      title: 'Quick 1-Line HTML Drop-In (Shopify, WordPress, Static Sites, Webflow)',
      subtitle: 'Zero backend setup to launch the split-panel branded checkout modal.',
      code: `<!-- 1. Include SumioPay Universal Drop-In SDK v2.8 -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<!-- 2. Trigger on any Buy / Upgrade button -->
<button
  onclick="SumioPay.checkout({
    apiKey: 'sp_live_YOUR_API_KEY',
    websiteName: 'YourStore India',
    websiteLogoUrl: 'https://yourstore.com/logo.png',
    brandColor: '#4F3DF5',
    amount: 2817.84,
    appName: 'STORE',
    planName: 'Cloud Hosting Pro (1 Yr)',
    userId: 'cust_1049',
    customerEmail: 'buyer@example.com',
    billDetails: {
      items: [{ label: 'Cloud Hosting Pro (12 Mo)', quantity: 1, amount: 3499 }],
      subtotal: 3499,
      couponCode: 'HOST20',
      discountAmount: 681.16,
      note: 'To begin your subscription, ₹2,817.84 will be charged via Direct UPI.',
      returnUrl: 'https://yourstore.com/thank-you'
    },
    onSuccess: function (order) {
      alert('Payment Verified! UTR: ' + (order.utrNumber || order.utr));
      window.location.href = '/thank-you?orderId=' + order.orderId;
    }
  })"
  style="background:#4F3DF5;color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;border:none;cursor:pointer;">
  Pay ₹2,817.84 via Direct UPI (0% Fee)
</button>`,
    },
    react: {
      title: 'React / Next.js Native Modal Component (<UpiCheckoutModal />)',
      subtitle: 'Mounts SumioCheckoutCard directly inside your React app with confetti & live UTR matching.',
      code: `import React, { useState } from 'react';
import { UpiCheckoutModal } from './sdk/UpiCheckoutModal';

export const CheckoutButton = ({ user }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
        Pay ₹399 Now
      </button>

      <UpiCheckoutModal
        isOpen={open}
        onClose={() => setOpen(false)}
        apiKey={import.meta.env.VITE_SUMIOPAY_KEY}
        websiteName="YourBrand App"
        brandColor="#4F3DF5"
        appName="YOUR_APP"
        userId={user.id}
        customerEmail={user.email}
        planName="Pro Monthly License"
        baseAmount={399}
        billDetails={{
          items: [{ label: 'Pro Monthly License', quantity: 1, amount: 499 }],
          subtotal: 499,
          couponCode: 'FIRST100',
          discountAmount: 100,
        }}
        onSuccess={(verified) => {
          console.log('Settled directly to bank! UTR:', verified.utr);
        }}
      />
    </>
  );
};`,
    },
    webhook_node: {
      title: 'Node.js / Express Webhook Verification (HMAC-SHA256 + Timestamp Guard)',
      subtitle:
        'SumioPay signs `${x-sumiopay-timestamp}.${rawBody}`. Always parse with express.raw() and verify with crypto.timingSafeEqual.',
      code: `const express = require('express');
const crypto = require('crypto');
const app = express();

app.post('/api/webhooks/sumiopay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = String(req.headers['x-sumiopay-signature'] || '');
  const timestamp = String(req.headers['x-sumiopay-timestamp'] || '');
  const rawBody = req.body.toString('utf8');
  const webhookSecret = process.env.SUMIOPAY_WEBHOOK_SECRET;

  // 1. Replay Defense (max 5 min clock skew)
  const tsNum = parseInt(timestamp, 10);
  if (!tsNum || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > 300) {
    return res.status(401).send('Timestamp expired');
  }

  // 2. Cryptographic Signature Verification
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).send('Invalid HMAC signature');
  }

  const event = JSON.parse(rawBody);
  if (event.type === 'payment.succeeded') {
    const { orderId, userId, exactAmount, utrNumber, utr } = event.data;
    // 3. Idempotently check order amount in DB and grant user subscription/order
    console.log('Verified Payment:', orderId, userId, exactAmount, utrNumber || utr);
  }

  res.status(200).json({ received: true });
});`,
    },
    webhook_php: {
      title: 'PHP / Laravel / WordPress Webhook Verification',
      subtitle: 'Matches ${timestamp}.${rawPayload} via hash_hmac and constant-time hash_equals.',
      code: `<?php
$signature = $_SERVER['HTTP_X_SUMIOPAY_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP'] ?? '';
$payload = file_get_contents('php://input');
$secret = getenv('SUMIOPAY_WEBHOOK_SECRET');

if (!ctype_digit((string)$timestamp) || abs(time() - (int)$timestamp) > 300) {
    http_response_code(401);
    exit('Timestamp expired');
}

$expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
if (($event['type'] ?? '') === 'payment.succeeded') {
    $orderId = $event['data']['orderId'];
    $amount  = $event['data']['exactAmount'];
    $utr     = $event['data']['utrNumber'] ?? $event['data']['utr'];
    // Idempotently update your database ONLY if status !== 'PAID'
}

http_response_code(200);
echo json_encode(['status' => 'ok']);
?>`,
    },
    webhook_python: {
      title: 'Python FastAPI / Django Webhook Verification',
      subtitle: 'Read raw request bytes directly and validate HMAC-SHA256 before updating orders.',
      code: `import hmac, hashlib, json, os, time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.environ["SUMIOPAY_WEBHOOK_SECRET"]

@app.post("/api/webhooks/sumiopay")
async def sumiopay_webhook(request: Request):
    raw_body = (await request.body()).decode("utf-8")
    signature = request.headers.get("x-sumiopay-signature", "")
    timestamp = request.headers.get("x-sumiopay-timestamp", "0")

    if not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:
        raise HTTPException(status_code=401, detail="Expired webhook timestamp")

    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        f"{timestamp}.{raw_body}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = json.loads(raw_body)
    if event.get("type") == "payment.succeeded":
        data = event["data"]
        print("Confirmed UTR:", data.get("utrNumber") or data.get("utr"), "Amount:", data.get("exactAmount"))

    return {"received": True}`,
    },
    curl: {
      title: 'Direct v1 REST API & Hosted Link Generation (cURL)',
      subtitle: 'Returns hostedCheckoutUrl, unique paise exactAmount, QR intent string, and website branding.',
      code: `curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sp_live_YOUR_API_KEY" \\
  -H "Idempotency-Key: inv_order_9901" \\
  -d '{
    "amountInPaise": 281784,
    "appName": "MY_WEB_APP",
    "customerUserId": "usr_9901",
    "customerEmail": "buyer@example.com",
    "websiteName": "YourBrand",
    "brandColor": "#4F3DF5",
    "callbackWebhookUrl": "https://yourwebsite.com/api/webhooks/sumiopay",
    "billDetails": {
      "items": [{ "label": "Annual SaaS License", "quantity": 1, "amount": 3499 }],
      "subtotal": 3499,
      "couponCode": "SAVE20",
      "discountAmount": 681.16
    }
  }'`,
    },
  };

  const merchantModules = [
    {
      icon: Zap,
      title: '1. Dashboard & Test Simulator',
      route: '/dashboard',
      summary: 'View live GMV, conversion rate, device health, and run Test Mode checkouts.',
      details:
        'Toggle top Live/Test Mode switch or call /api/v1/payments/orders with sp_test_ key. Simulated payments test webhooks & UI without touching real bank money.',
    },
    {
      icon: Wallet,
      title: '2. Multi-UPI VPAs, Bank QR Upload & Branding',
      route: '/profile',
      summary: 'Upload PhonePe/Paytm/GPay QR images to extract UPI IDs and set checkout branding.',
      details:
        'Supports PRIMARY_ONLY, ROUND_ROBIN, and daily-limit FAILOVER routing across unlimited bank UPI handles, plus Website Name, URL, Logo, and Hex Brand Color.',
    },
    {
      icon: Smartphone,
      title: '3. Android Listener APK Setup',
      route: '/devices',
      summary: 'Download SumioPayListener APK and pair with an expiring 30-minute QR token.',
      details:
        'Requires Notification Access + Unrestricted Battery. On Android 13–16: Settings > Apps > SumioPay Listener > 3-dots > Allow Restricted Settings.',
    },
    {
      icon: Code2,
      title: '4. API Keys, Scoped Keys & Connect',
      route: '/connect',
      summary: 'Copy sp_live_, sp_test_, apiSecret, webhookSecret & interactive checkout snippets.',
      details:
        'Create project-scoped API keys under Projects/Connect and rotate keys anytime from Profile/Connect.',
    },
    {
      icon: CreditCard,
      title: '5. Orders Ledger & Unmapped Rescue',
      route: '/orders',
      summary: 'Track payer bank app, 12-digit UTR, unique paise offset, and rescue orphan credits.',
      details:
        'If a user transfers late or sends wrong paise, the listener stores it safely in Unmapped Payments so you can match & credit with 1 click or refund directly.',
    },
    {
      icon: RefreshCw,
      title: '6. Bank Statement CSV Reconciler',
      route: '/reconciliation',
      summary: 'Upload HDFC/ICICI/SBI CSV statements to batch-match settled UTRs automatically.',
      details:
        'Cross-verifies passbook CSV entries against orders in integer paise so zero orders slip through network drops.',
    },
    {
      icon: Webhook,
      title: '7. Webhooks, Exponential Retries & Telegram Pings',
      route: '/webhooks',
      summary: 'Inspect HTTP status codes, test ping, and rely on automatic exponential retries (15s to 30m).',
      details:
        'Includes SSRF protection blocking internal IPs, timestamped HMAC-SHA256 signatures, automatic retries when your server restarts, plus optional Telegram payment & offline-phone alerts under Profile.',
    },
    {
      icon: FolderGit2,
      title: '8. Multi-Project Isolation & Team RBAC',
      route: '/projects',
      summary: 'Separate apps (e.g., Store, SaaS, ERP) with per-app webhook secrets and team roles.',
      details:
        'Invite Developers/Operations/Finance team members cleanly under /team while preserving tenant isolation.',
    },
    {
      icon: Receipt,
      title: '9. Self-Service Trial & Plan Billing',
      route: '/billing',
      summary: '3-day free trial on signup, ₹399 Monthly Pro, ₹1,999 6-Month Growth, and Custom plans.',
      details:
        'Merchants pay their subscription directly through SumioPay UPI with instant automatic plan activation and downloadable Tax Receipt PDF.',
    },
    {
      icon: CheckCircle2,
      title: '10. No-Code Payment Links & 1-Line Pay Buttons',
      route: '/links',
      summary: 'Create shareable /p/:slug payment pages with coupons, customer fields, WhatsApp share & HTML button embeds.',
      details:
        'Ideal for clinics, coaching institutes, agencies & WhatsApp sellers — accepts fixed or open amounts with zero backend coding.',
    },
    {
      icon: Layers,
      title: '11. SaaS-in-a-Box Subscription & Entitlement API',
      route: '/saas-plans',
      summary: 'Let SumioPay manage trials, expiries & check APIs (/api/v1/entitlements/check) for any external SaaS.',
      details:
        'Create Monthly/Yearly plans once, collect UPI via Payment Links or Checkout API, and gate features in any MERN/PHP/Desktop app in 5 lines.',
    },
  ];

  const superAdminModules = [
    {
      step: 'Step 1 — Collector Configuration',
      route: '/superadmin/settings',
      desc: 'Go to SuperAdmin Settings → Platform Self-Billing section and enter your Collector Merchant Email (must be an active SumioPay merchant with a verified UPI VPA + paired Android Listener phone). This lets SumioPay charge subscriptions using SumioPay itself with ₹0 MDR.',
    },
    {
      step: 'Step 2 — Trial Days & Plan Pricing',
      route: '/superadmin/settings',
      desc: 'Control Free Trial duration (default 3 days), 1-Month Pro price (₹399), 6-Month Growth price (₹1,999), device limits, announcement banner, maintenance gate, and new registration toggle live.',
    },
    {
      step: 'Step 3 — Merchants & KYC Verification Badge',
      route: '/superadmin/merchants',
      desc: 'Inspect all signed-up merchants, their paired phones, multi-UPI routing handles, and live GMV. Suspend/reactivate accounts, or verify business documents under KYC (/superadmin/kyc) to award the green "SumioPay KYC Verified Business" checkout shield.',
    },
    {
      step: 'Step 4 — Subscription Bills & Custom Plan Invoices',
      route: '/superadmin/subscriptions',
      desc: 'Create either a MARK_PAID offline/manual bill (extending plan days immediately) OR click GENERATE_UPI_BILL to generate a 24-hour shareable /pay/SUB-BILL-... link. You can also edit UTR/amounts or void invoices anytime.',
    },
    {
      step: 'Step 5 — Risk, Audit Trail, Device Revocation & Reconcile',
      route: '/superadmin/risk',
      desc: 'Monitor duplicate UTR replay alerts, revoke compromised Android listener devices (/superadmin/devices), resolve orphaned cross-tenant unmapped credits (/superadmin/reconciliation), inspect webhook queues (/superadmin/webhooks), and audit every SuperAdmin action (/superadmin/audit).',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SeoHead
        title="SumioPay Developer Integration Guide — Self-Hosted UPI API, Drop-In JS, React & WooCommerce"
        description="Step-by-step developer guide to integrate SumioPay self-hosted Direct UPI gateway in Node.js, Next.js, PHP/Laravel, Python, React checkout modal, or WooCommerce with HMAC-SHA256 webhooks."
        keywords="UPI payment gateway integration Node.js, self hosted UPI API docs, WooCommerce UPI gateway plugin, HMAC SHA256 webhook verification UPI, SumioPay developer guide"
        canonicalPath="/guide"
        ogType="article"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Integrate SumioPay Direct UPI Payment Automation into Your Website or SaaS',
          description:
            'Create server-locked UPI payment orders via REST API, launch the drop-in checkout modal or hosted payment link, and verify HMAC-SHA256 payment.succeeded webhooks.',
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Configure Bank UPI & Pair Android Listener',
              text: 'Set your bank UPI VPA under Profile, install SumioPayListener APK, and pair via QR token.',
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Create Authoritative Payment Order on Backend',
              text: 'POST to /api/v1/payments/orders with x-api-key, x-api-secret, Idempotency-Key, and amountInPaise.',
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Render Checkout Modal or Hosted Payment Page',
              text: 'Load checkout.js and call SumioPay.checkout({ orderId }) or redirect buyers to hostedCheckoutUrl.',
            },
            {
              '@type': 'HowToStep',
              position: 4,
              name: 'Verify Timestamped HMAC-SHA256 Webhook',
              text: 'Validate x-sumiopay-signature over "${x-sumiopay-timestamp}.${rawBody}" with timingSafeEqual before fulfilling orders.',
            },
          ],
        }}
      />
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-sm tracking-tight text-slate-900">
                SumioPay Architecture &amp; Developer Guide
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/security')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Security &amp; Disclaimer</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?register=true')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Hero Overview */}
        <section className="rounded-3xl bg-slate-950 text-white p-7 sm:p-10 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-bold">
                <Layers className="w-3.5 h-3.5" />
                <span>End-to-End Integration, All Modules &amp; SuperAdmin Manual</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Integrate Any Website, SaaS App, or Store in Minutes
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Complete technical guide for developers integrating SumioPay into SaaS platforms, custom websites, WordPress/WooCommerce, or Next.js — plus full documentation for every Merchant and SuperAdmin governance module.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs space-y-1.5 max-w-sm shrink-0">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Non-Custodial Reminder (₹0 Held)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                SumioPay never pools or holds money. Funds settle 100% directly into your own bank UPI ID. SumioPay is a software tool — not a bank, RBI PA/PG, or NPCI entity.
              </p>
            </div>
          </div>

          {/* 5-Stage Lifecycle Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-800 text-xs">
            {[
              {
                n: '1',
                title: 'Merchant Setup',
                text: 'Add UPI VPA(s) & website branding in Profile. Pair Android Listener phone.',
              },
              {
                n: '2',
                title: 'Create Locked Order',
                text: 'Backend/SDK creates order; CSPRNG locks unique exact paise (e.g. ₹499.18).',
              },
              {
                n: '3',
                title: 'Branded Checkout',
                text: 'Customer sees Website Name + Trusted shield, coupon bill, & first-party SVG QR.',
              },
              {
                n: '4',
                title: 'Direct Bank Match',
                text: 'Money lands directly in your bank. APK catches SMS credit -> anti-replay UTR check.',
              },
              {
                n: '5',
                title: 'Signed Webhook',
                text: 'Server verifies HMAC-SHA256 (${timestamp}.${rawBody}) and activates user plan.',
              },
            ].map((s) => (
              <div key={s.n} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <span className="inline-flex w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] items-center justify-center">
                  {s.n}
                </span>
                <div className="font-bold text-white">{s.title}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'integrate' as const, label: '1. Website & Developer Integration', icon: FileCode2 },
            { id: 'merchant' as const, label: '2. All Merchant Modules', icon: QrCode },
            { id: 'superadmin' as const, label: '3. SuperAdmin Governance', icon: Users },
            { id: 'security' as const, label: '4. Production Security Checklist', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  active
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION 1: WEBSITE & DEVELOPER INTEGRATION */}
        {section === 'integrate' && (
          <div className="space-y-6">
            {/* Step-by-Step Onboarding Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-black text-slate-950">
                Before Writing Code: 4-Step Account Setup
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {[
                  {
                    t: '1. Register & OTP Verify',
                    d: 'Sign up at /login?register=true with your Business Name, email OTP, and primary UPI VPA (personal or merchant QR). Starts a 3-day free trial automatically.',
                  },
                  {
                    t: '2. Set Branding & UPIs',
                    d: 'Open /profile to set Website Name, Logo URL, Brand Color, and add multiple UPI IDs (via QR upload or manual VPA) with ROUND_ROBIN or FAILOVER routing.',
                  },
                  {
                    t: '3. Pair Android Listener',
                    d: 'Open /devices, download SumioPayListener APK on a phone receiving your bank SMS/UPI alerts, grant Notification Access, and scan the QR pairing token (valid 30 mins).',
                  },
                  {
                    t: '4. Copy Keys & Test First',
                    d: 'Open /connect to get your sp_live_ API Key (use sp_test_ in sandbox), Webhook Secret, and send a test order in Test Mode before enabling live checkouts.',
                  },
                ].map((card) => (
                  <div key={card.t} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="font-extrabold text-slate-900">{card.t}</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{card.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Multi-Language Code Showcase */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-7 text-white space-y-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Production Integration Code Library</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verified against SumioPay backend API routes (/api/v1/payments/orders, checkout.js v2.8, HMAC signer).
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'saas' as const, label: 'SaaS Backend + SDK (Best)' },
                    { id: 'html' as const, label: 'HTML / WordPress' },
                    { id: 'react' as const, label: 'React / Next.js' },
                    { id: 'webhook_node' as const, label: 'Webhook (Node)' },
                    { id: 'webhook_php' as const, label: 'Webhook (PHP)' },
                    { id: 'webhook_python' as const, label: 'Webhook (Python)' },
                    { id: 'curl' as const, label: 'REST cURL' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCodeTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        codeTab === t.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-blue-300">{snippets[codeTab].title}</h3>
                  <p className="text-xs text-slate-400">{snippets[codeTab].subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copySnippet(codeTab, snippets[codeTab].code)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 shrink-0 transition"
                >
                  {copiedKey === codeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                <code>{snippets[codeTab].code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* SECTION 2: ALL MERCHANT MODULES */}
        {section === 'merchant' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {merchantModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4 shadow-xs hover:border-blue-300 transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {mod.route}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">{mod.title}</h3>
                    <p className="text-xs font-semibold text-slate-700">{mod.summary}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{mod.details}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(mod.route)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 self-start"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 3: SUPERADMIN GOVERNANCE */}
        {section === 'superadmin' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  SuperAdmin Console Operations Manual (`/superadmin`)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  How to administer your self-hosted SumioPay SaaS on your own VPS + MongoDB server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/superadmin/login')}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold self-start transition"
              >
                Open SuperAdmin Login &rarr;
              </button>
            </div>

            <div className="space-y-4">
              {superAdminModules.map((item) => (
                <div
                  key={item.step}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-950">{item.step}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                        {item.route}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 shrink-0 transition"
                  >
                    Visit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: PRODUCTION SECURITY CHECKLIST */}
        {section === 'security' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-600" />
                  <span>Go-Live Production Security Verification Checklist</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check every item before sending real customer traffic on your VPS deployment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/security')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Read Full Security &amp; Non-Custodial Policy &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                'Set strong unique JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SUPERADMIN_EMAIL, and SUPERADMIN_PASSWORD in backend/.env (never leave sample defaults).',
                'Keep NODE_ENV=production on your VPS behind HTTPS/Nginx so HSTS, strict TLS, and X-Forwarded-For proxy rate limiting operate accurately.',
                'Always use server-side order creation (/api/v1/payments/orders with Idempotency-Key) for eCommerce or SaaS billing so buyers cannot tamper with prices or coupon discounts.',
                'Verify x-sumiopay-signature + x-sumiopay-timestamp (${timestamp}.${rawBody}) using timing-safe equality in your webhook handler, and check event.data.exactAmount >= expected.',
                'Never store customer card numbers, CVVs, net banking logins, or fake regulatory badges. Keep non-custodial disclosure visible on checkout & terms.',
                'Keep at least 1 paired Android Listener phone plugged in with Unrestricted Battery Optimization and Notification Access enabled (or multiple UPIs under FAILOVER mode).',
              ].map((tip, i) => (
                <div key={i} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-2.5 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default IntegrationGuidePage;

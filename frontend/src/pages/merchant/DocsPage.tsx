import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Code2,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Zap,
  Smartphone,
  Server,
  ArrowRight,
  Database,
  Mail,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const DocsPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: 'Step 1: Frontend Drop-in Checkout (Universal JS / HTML / Next.js)',
      description: 'Add this to any button in your SaaS product (e.g. SumioLab "Upgrade to Pro ₹299" button).',
      lang: 'javascript',
      code: `<!-- 1. Include SumioPay Drop-in SDK in your page head or layout -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<!-- 2. Attach to your Upgrade/Purchase button -->
<script>
function openSumioLabCheckout() {
  SumioPay.checkout({
    apiKey: "sp_live_YOUR_MERCHANT_KEY",      // Found on your Connect Page
    websiteName: "YourBrandStore",           // Shown on checkout alongside Trusted Business badge
    brandColor: "#4F3DF5",                   // Custom brand panel gradient color
    amount: 2817.84,                         // Final payable INR (after coupon & taxes)
    billDetails: {
      subtotal: 3499,
      couponCode: "SAVE20",
      discountAmount: 681.16,
      items: [{ label: "Pro Cloud Subscription (1 Yr)", quantity: 1, amount: 3499 }],
      note: "To begin your subscription, ₹2,817.84 will be paid now via Direct UPI.",
      returnUrl: "https://yourwebsite.com/billing/success"
    },
    appName: "SUMIOLAB",                     // Your SaaS identifier
    planName: "SumioLab Pro Annual Tier",
    userId: "usr_84920",                     // Logged-in customer ID in your app
    customerEmail: "customer@gmail.com",     // Auto-sends official invoice email
    customerPhone: "9875182659",
    onSuccess: function(verifiedOrder) {
      // Triggered in <1.2s once bank credit is confirmed!
      console.log("Payment Confirmed!", verifiedOrder.orderId, verifiedOrder.utrNumber);
      alert("Payment Successful! Your Pro plan is now active.");
      window.location.reload();
    },
    onFailure: function(err) {
      console.error("Payment Cancelled or Failed:", err);
    }
  });
}
</script>`,
    },
    {
      title: 'Step 2: React Component Integration (UpiCheckoutModal)',
      description: 'Clean React/Next.js modal component with zero external dependencies.',
      lang: 'tsx',
      code: `import React, { useState } from 'react';
import { UpiCheckoutModal } from './sdk/UpiCheckoutModal';

export const UpgradeButton = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold"
      >
        Subscribe to SumioLab Pro (₹299)
      </button>

      <UpiCheckoutModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        apiKey="sp_live_YOUR_MERCHANT_KEY"
        appName="SUMIOLAB"
        userId={user._id}
        customerEmail={user.email}
        planName="SumioLab Pro Tier"
        baseAmount={299}
        onSuccess={(order) => {
          console.log("Instant Bank Verified:", order.orderId, order.utr);
          // Show confetti or refresh UI
        }}
      />
    </>
  );
};`,
    },
    {
      title: 'Step 3: SaaS Backend Webhook Receiver (Next.js / Express / Node.js)',
      description: 'Verifies timestamp-prefixed HMAC-SHA256 signatures (${timestamp}.${rawBody}) using timing-safe comparison before activating plans.',
      lang: 'javascript',
      code: `// Route: POST /api/webhooks/sumiopay
const crypto = require('crypto');
const express = require('express');
const app = express();

// IMPORTANT: Use express.raw() so HMAC checks exact raw request bytes
app.post('/api/webhooks/sumiopay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = String(req.headers['x-sumiopay-signature'] || '');
  const timestamp = String(req.headers['x-sumiopay-timestamp'] || '');
  const rawBody = req.body.toString('utf8');
  const webhookSecret = process.env.SUMIOPAY_WEBHOOK_SECRET; // From Connect Page

  // 1. Replay Window Check (reject payloads older than 5 minutes)
  const tsNum = parseInt(timestamp, 10);
  if (!tsNum || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > 300) {
    return res.status(401).send('Webhook Timestamp Expired');
  }

  // 2. Verify HMAC-SHA256 over "\${timestamp}.\${rawBody}" in constant time
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.error("⚠️ Invalid Webhook Signature Rejected!");
    return res.status(401).send('Unauthorized Signature');
  }

  // 3. Process Verified Bank Payment (idempotent on orderId)
  const event = JSON.parse(rawBody);
  if (event.type === 'payment.succeeded') {
    const { orderId, appName, userId, exactAmount, utr, utrNumber } = event.data;
    const verifiedUtr = utrNumber || utr;

    console.log(\`✅ Verified ₹\${exactAmount} credited for user \${userId} (UTR: \${verifiedUtr})\`);

    // 4. Atomically activate user subscription in MongoDB / PostgreSQL:
    // await db.users.updateOne(
    //   { _id: userId },
    //   { $set: { isPro: true, planTier: 'PRO', lastOrderId: orderId, proActivatedAt: new Date() } }
    // );
  }

  // Acknowledge receipt to SumioPay core
  res.status(200).json({ status: 'processed' });
});`,
    },
    {
      title: 'Step 4: PHP / Laravel / Custom eCommerce Webhook Handler',
      description: 'PHP implementation for WordPress, WooCommerce, or custom PHP stores using timing-safe hash_equals.',
      lang: 'php',
      code: `<?php
// POST /api/sumiopay-webhook.php
$signature = $_SERVER['HTTP_X_SUMIOPAY_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP'] ?? '';
$payload = file_get_contents('php://input');
$webhookSecret = getenv('SUMIOPAY_WEBHOOK_SECRET');

// 1. Replay Defense (300 second window)
if (!ctype_digit((string)$timestamp) || abs(time() - (int)$timestamp) > 300) {
    http_response_code(401);
    exit('Expired Timestamp');
}

// 2. Verify cryptographic HMAC-SHA256 signature over timestamp.payload
$expectedSignature = hash_hmac('sha256', $timestamp . '.' . $payload, $webhookSecret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Invalid Signature');
}

$event = json_decode($payload, true);

if (($event['type'] ?? '') === 'payment.succeeded') {
    $orderId = $event['data']['orderId'];
    $userId = $event['data']['userId'];
    $amount = $event['data']['exactAmount'];
    $utr = $event['data']['utrNumber'] ?? $event['data']['utr'];

    // 3. Update order idempotently in database:
    // UPDATE orders SET status = 'PAID', utr = '$utr' WHERE id = '$orderId' AND status != 'PAID';
}

http_response_code(200);
echo json_encode(['status' => 'acknowledged']);
?>`,
    },
    {
      title: 'Step 5: Direct REST API Order Creation (cURL / Backend)',
      description: 'Generate dynamic payment links or QR data directly from your server.',
      lang: 'bash',
      code: `curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sp_live_YOUR_API_KEY" \\
  -d '{
    "appName": "SUMIOLAB",
    "baseAmount": 299,
    "customerUserId": "usr_9981",
    "customerEmail": "customer@example.com",
    "callbackWebhookUrl": "https://sumiolab.in/api/webhooks/sumiopay"
  }'

# Response Returns:
# - exactAmount: 299.14 (Paise-locked for collision-free auto-verification)
# - upiIntentUrl: "upi://pay?pa=sumiotech@okhdfcbank&pn=SumioTech&am=299.14&tr=ORD-xxx"
# - orderId: "ORD-20261126-9812"`,
    },
  ];

  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-7 h-7 text-blue-600" />
            Developer Architecture &amp; Integration Blueprint
          </h1>
          <p className="text-slate-500 mt-1 text-xs">
            Learn how SumioPay mathematically eliminates fake payments, captures bank UPI alerts in &lt;1.2s, and integrates into SumioLab or any SaaS with 3 lines of code.
          </p>
        </div>
        <a
          href="/guide"
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition self-start"
        >
          <span>Full Website &amp; SuperAdmin Guide</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Visual End-to-End Payment Flow */}
      <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-extrabold text-white">How the Real-Time Auto-Verification Pipeline Works</h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
            Zero Gateway Holding • 100% Direct Bank Credit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto text-xs">
              1
            </div>
            <h4 className="font-bold text-white text-xs">1-Click Checkout</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Customer clicks &quot;Subscribe ₹299&quot; on your website. SumioPay locks exact amount e.g. <strong className="text-emerald-400">₹299.14</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto text-xs">
              2
            </div>
            <h4 className="font-bold text-white text-xs">UPI App Payment</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Customer scans QR or taps &quot;Open in GPay / PhonePe / Paytm&quot; and completes UPI payment.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto text-xs">
              3
            </div>
            <h4 className="font-bold text-white text-xs">Bank Telemetry</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Bank sends credit SMS. Listener APK on your spare Android phone captures alert in <strong className="text-indigo-300">&lt;1.2s</strong>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto text-xs">
              4
            </div>
            <h4 className="font-bold text-white text-xs">HMAC Webhook</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              SumioPay verifies paise &amp; bank UTR, dispatches signed SHA-256 webhook to your SaaS backend.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center mx-auto text-xs">
              5
            </div>
            <h4 className="font-bold text-white text-xs">Plan Activation &amp; Bill</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              SaaS activates user Pro plan instantly. SumioPay emails official invoice receipt to customer.
            </p>
          </div>
        </div>
      </div>

      {/* Anti-Fraud & Fake Payment Prevention Matrix */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-sm font-black text-slate-900">Why Fake Payments &amp; Client-Side Bypasses are Impossible</h2>
            <p className="text-[11px] text-slate-500">
              SumioPay does NOT rely on customer screenshots or manual UTR typing. Here are our 4 cryptographic defenses:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-xs">Differential Paise Collision-Lock</h3>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              If multiple customers order the same ₹299 plan at the same time, each order is assigned a unique paise offset (e.g. ₹299.04, ₹299.18, ₹299.41). If someone sends ₹299.00 or an altered amount, it will <strong>never match</strong> and will remain UNPAID.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <h3 className="font-bold text-slate-900 text-xs">Hardware Bank Telemetry (No Fake Screenshots)</h3>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Customers can never self-approve payments. Every 12-digit UTR (via listener push or customer checkout UTR fallback) is strictly verified against an authentic incoming bank credit notification matching exact paise. Fake payment screenshots cannot trigger verification.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <h3 className="font-bold text-slate-900 text-xs">Tamper-Proof HMAC-SHA256 Webhooks</h3>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Even if someone inspects the frontend code or attempts to spoof a payment success callback, your backend verifies the <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">x-sumiopay-signature</code> using your private secret. Unsigned requests are rejected with HTTP 401.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                4
              </span>
              <h3 className="font-bold text-slate-900 text-xs">Anti-Replay Attack Protection</h3>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every bank UTR is indexed globally per merchant. If an attacker attempts to reuse an old bank UTR number to claim a second order, SumioPay flags it as <code className="text-red-600 font-bold">DUPLICATE_UTR_REPLAY_ATTEMPT</code> and aborts immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Code Blocks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            Complete Step-by-Step Code Examples
          </h2>
          <span className="text-xs text-slate-500">Copy &amp; paste into your application</span>
        </div>

        {codeSnippets.map((snippet, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  {snippet.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{snippet.description}</p>
              </div>

              <button
                onClick={() => copyCode(snippet.code, idx)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
              <code>{snippet.code}</code>
            </pre>
          </div>
        ))}
      </div>

      {/* Support Callout */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-900 text-sm">Need Direct Engineering Assistance?</h3>
          <p className="text-slate-600 text-xs">
            SumioTech engineers can help integrate the checkout SDK or verify webhook endpoints for your production store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="mailto:contact@sumiotech.in"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
          >
            Email: contact@sumiotech.in
          </a>
          <span className="text-xs font-bold text-slate-700 font-mono">
            +91 9875182659
          </span>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;

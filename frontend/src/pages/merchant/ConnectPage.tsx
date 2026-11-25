import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
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
} from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';

export const ConnectPage: React.FC = () => {
  const [merchant, setMerchant] = useState<any>(null);
  const [platform, setPlatform] = useState<'woocommerce' | 'html' | 'react' | 'node' | 'php' | 'python' | 'curl'>('woocommerce');
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    api.get('/merchant/profile').then((res) => {
      if (res.data.success) {
        setMerchant(res.data.data);
      }
    });
  }, []);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const codeExamples = {
    woocommerce: `// ==========================================
// WooCommerce & Shopify eCommerce Integration
// ==========================================
// Step 1: In your Store Admin, configure Webhook:
// Webhook URL:    ${merchant?.webhookUrl || 'https://mystore.com/api/sumiopay-webhook'}
// Webhook Secret: ${merchant?.webhookSecret || 'sp_whsec_YOUR_SECRET'}
//
// Step 2: When customer proceeds to checkout, create an Order via API:
POST /api/v1/payments/orders
Headers:
  x-api-key: ${merchant?.apiKey || 'sp_live_YOUR_KEY'}
  Content-Type: application/json
Body:
  {
    "baseAmount": 1499,
    "appName": "WOOCOMMERCE",
    "customerUserId": "order_#1092",
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
    apiKey: '${merchant?.apiKey || 'sp_live_YOUR_KEY'}',
    amount: 999,
    appName: 'MyStore',
    userId: 'cust_84920',
    onSuccess: function(order) {
      console.log('Payment Auto-Verified:', order.orderId, order.utr);
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
      <button onClick={() => setOpen(true)}>Upgrade to Pro</button>

      <UpiCheckoutModal
        isOpen={open}
        onClose={() => setOpen(false)}
        appName="SUMIOLAB"
        userId="user_12345"
        planName="Pro Annual Plan"
        baseAmount={499}
        callbackWebhookUrl="${merchant?.webhookUrl || 'https://yourapp.com/api/webhook'}"
        apiKey="${merchant?.apiKey || 'sp_live_YOUR_KEY'}"
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

app.post('/api/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-sumiopay-signature'];
  const secret = "${merchant?.webhookSecret || 'sp_whsec_YOUR_SECRET'}";

  // Verify HMAC-SHA256 signature
  const expected = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  if (event === 'payment.success') {
    const { orderId, appName, userId, amount, utr } = data;
    // Auto-mark order as PAID and dispatch products!
    console.log(\`Verified payment ₹\${amount} for user \${userId} (UTR: \${utr})\`);
  }

  res.status(200).send('Webhook processed');
});`,

    php: `<?php
// ==========================================
// 3. PHP / Laravel / Custom eCommerce Webhook
// ==========================================

// A. Verify incoming HMAC-SHA256 signature from SumioPay
$signature = $_SERVER['HTTP_X_SUMIOPAY_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');
$secret = "${merchant?.webhookSecret || 'sp_whsec_YOUR_SECRET'}";

$expectedSignature = hash_hmac('sha256', $payload, $secret);

if (!hash_equals($signature, $expectedSignature)) {
    http_response_code(401);
    exit('Invalid HMAC Signature');
}

$event = json_decode($payload, true);

if ($event['event'] === 'payment.success') {
    $orderId = $event['data']['orderId'];
    $utr = $event['data']['utr'];
    $amount = $event['data']['amount'];

    // Update your MySQL/PostgreSQL database:
    // UPDATE orders SET status = 'PAID', utr = '$utr' WHERE order_id = '$orderId';
    // Fulfill customer order automatically!
}

http_response_code(200);
echo json_encode(['status' => 'acknowledged']);
?>`,

    python: `# 4. Python FastAPI / Flask Webhook Verification
import hmac, hashlib, json
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "${merchant?.webhookSecret || 'sp_whsec_YOUR_SECRET'}"

@app.post("/api/webhook")
async def verify_payment(request: Request):
    body = await request.body()
    signature = request.headers.get("x-sumiopay-signature")
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature or "", expected):
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    payload = json.loads(body)
    data = payload.get("data", {})
    # Upgrade customer account in Python DB
    print(f"Verified payment {data.get('orderId')} with UTR {data.get('utr')}")
    return {"status": "success"}`,

    curl: `# 5. Create Payment Order via REST API
curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${merchant?.apiKey || 'sp_live_YOUR_KEY'}" \\
  -d '{
    "appName": "MY_ECOMMERCE_APP",
    "baseAmount": 999,
    "customerUserId": "usr_9981",
    "callbackWebhookUrl": "${merchant?.webhookUrl || 'https://yourapp.com/api/webhook'}"
  }'`,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-xs">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Enterprise Payment Connection Wizard
        </h1>
        <p className="text-slate-500 mt-1">
          Connect your SaaS products (SumioLab, SumioBilling, custom ERPs) with your receiving bank UPI account in 4 simple steps.
        </p>
      </div>

      {/* 4 Steps Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            1
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Receiving UPI VPA</h3>
          <p className="text-[11px] text-slate-500 font-mono text-blue-600 font-bold">
            {merchant?.upiId || 'Configured'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            2
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Pair Android Phone</h3>
          <p className="text-[11px] text-slate-500">
            Listener intercepts incoming bank credits in &lt;1.2s.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            3
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Drop In React SDK</h3>
          <p className="text-[11px] text-slate-500">
            Render &lt;UpiCheckoutModal /&gt; on button click.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
            4
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Verify HMAC Webhook</h3>
          <p className="text-[11px] text-slate-500">
            Instant tamper-proof plan upgrade.
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
                  platform === tech.id ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tech.label}
              </button>
            ))}
          </div>
        </div>

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
            onClick={() => copy(codeExamples[platform])}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border border-slate-700"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey ? 'Copied' : 'Copy Snippet'}
          </button>
        </div>

        <div className="pt-2 flex justify-end">
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
        planName="Enterprise Diagnostics Tier"
        baseAmount={999}
        onSuccess={(data) => {
          alert(`Test Payment Confirmed! Order: ${data.orderId}, Amount: ₹${data.amount}`);
          setTestModalOpen(false);
        }}
      />
    </div>
  );
};

export default ConnectPage;

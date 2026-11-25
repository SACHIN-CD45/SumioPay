import React, { useState } from 'react';
import { FileCode2, Copy, Check, Terminal, ExternalLink, Code2 } from 'lucide-react';

export const DocsPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: '1. Reusable React Checkout Modal (Zero Configuration)',
      lang: 'tsx',
      code: `import React, { useState } from 'react';
import { UpiCheckoutModal } from './sdk/UpiCheckoutModal';

export const PricingSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Upgrade to Pro (₹499)
      </button>

      <UpiCheckoutModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        appName="SUMIOLAB"                // 'SUMIOLAB' | 'SUMIOBILLING' | 'SUMIOBOOK' | 'ERP'
        userId="user_12345"               // Logged in user id in your app
        planName="Pro Annual Plan"
        baseAmount={499}
        callbackWebhookUrl="https://your-saas.com/api/payment/callback"
        onSuccess={(payment) => {
          console.log('Payment Verified:', payment.orderId, payment.utr);
          // Activate user plan in UI immediately
        }}
      />
    </>
  );
};`,
    },
    {
      title: '2. Backend: Create Order via REST API (cURL)',
      lang: 'bash',
      code: `curl -X POST https://apipay.sumiotech.in/api/order/create \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sp_live_YOUR_API_KEY" \\
  -d '{
    "appName": "SUMIOLAB",
    "baseAmount": 499,
    "customerUserId": "usr_99",
    "callbackWebhookUrl": "https://yourapp.com/api/webhook"
  }'`,
    },
    {
      title: '3. Backend: Verify Outgoing Webhook (Node.js & Express)',
      lang: 'javascript',
      code: `const crypto = require('crypto');
const express = require('express');
const app = express();

app.post('/api/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-sumiopay-signature'];
  const webhookSecret = process.env.SUMIOPAY_WEBHOOK_SECRET;

  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  if (event === 'payment.success') {
    const { orderId, appName, userId, amount, utr } = data;
    console.log(\`Received ₹\${amount} for user \${userId} via UTR \${utr}\`);
    // Upgrade user's subscription in your database!
  }

  res.status(200).send('Webhook processed');
});`,
    },
    {
      title: '4. Polling Order Status (Frontend or Backend)',
      lang: 'bash',
      code: `curl https://apipay.sumiotech.in/api/order/status/ORD-20261125-ABCD

# Response:
# {
#   "success": true,
#   "data": {
#     "orderId": "ORD-20261125-ABCD",
#     "status": "PAID",
#     "amount": 499.42,
#     "utr": "432109876543",
#     "paidAt": "2026-11-25T08:50:00.000Z"
#   }
# }`,
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto text-xs">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileCode2 className="w-6 h-6 text-blue-600" />
          Developer Documentation & Integration Guide
        </h1>
        <p className="text-slate-500 mt-1">
          Complete guides for integrating the SumioPay universal UPI payment service into any SaaS application.
        </p>
      </div>

      <div className="space-y-6">
        {codeSnippets.map((snippet, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                {snippet.title}
              </h2>
              <button
                onClick={() => copyCode(snippet.code, idx)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-subtle"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-900 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
              <code>{snippet.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocsPage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <span className="text-xs font-bold text-slate-900">SumioPay Legal</span>
        </div>
      </header>

      <main className="py-12 px-6 max-w-4xl mx-auto space-y-8 text-xs leading-relaxed text-slate-700">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Legal Compliance
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-slate-500 mt-1">Effective Date: November 25, 2026 &bull; Version 2.4</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Overview & Commitment</h2>
          <p>
            SumioTech ("SumioPay", "we", "our", or "us") is dedicated to protecting the privacy and security of merchants, developers, and their end users. This Privacy Policy outlines our data processing practices in full compliance with the <strong>Digital Personal Data Protection Act, 2023 (India)</strong> and international security standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Non-Custodial Financial Architecture</h2>
          <p>
            Unlike traditional payment aggregators, <strong>SumioPay is a non-custodial software service</strong>. We never hold, pool, or touch user funds. All transactions represent direct Peer-to-Merchant (P2M) or Peer-to-Peer (P2P) transfers via the Unified Payments Interface (UPI) infrastructure managed by NPCI directly into your authorized bank account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Information Collected</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Merchant Account Details:</strong> Name, business entity name, verified email, telephone number, and receiving UPI Virtual Payment Address (VPA).</li>
            <li><strong>Payment Verification Telemetry:</strong> Transaction timestamp, base amount, unique paise offset, 12-digit UPI reference (UTR), bank notification text snippet, and delivery webhook logs.</li>
            <li><strong>Device Telemetry:</strong> Paired Android listener phone model, OS version, battery percentage, charging state, and heartbeat pings for operational monitoring.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Android NotificationListener Permissions</h2>
          <p>
            The SumioPay Android APK utilizes Android's official <code>NotificationListenerService</code> API exclusively to detect incoming credit notifications from authorized banking and UPI applications (e.g., PhonePe, Google Pay, Paytm, BHIM, and scheduled SMS from licensed Indian Scheduled Commercial Banks). SumioPay strictly ignores, discards, and never transmits personal messages, chats, social notifications, OTPs, or passwords.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Data Security & Encryption</h2>
          <p>
            All API calls, webhooks, and device heartbeats operate exclusively over TLS 1.3 encryption. Webhooks are cryptographically signed using HMAC-SHA256 tokens to ensure data integrity and prevent man-in-the-middle tampering. API secrets and password hashes are irreversibly salted using bcrypt.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6. Contact Our Data Protection Officer</h2>
          <p>
            For privacy inquiries, audit reports, or data deletion requests, contact our legal desk at <span className="font-semibold text-blue-600">privacy@sumiotech.in</span> or SumioTech, Corporate Office, India.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;

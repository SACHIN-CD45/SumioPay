import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { SeoHead } from '../../components/SeoHead';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <SeoHead
        title="Privacy Policy & Zero Card Storage Disclosure — SumioPay by SumioTech"
        description="SumioPay collects zero debit/credit card numbers, CVVs, or UPI PINs and holds ₹0.00 of customer funds. Review our data minimization privacy disclosure."
        canonicalPath="/privacy"
      />
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={() => navigate('/security')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Security &amp; Legal Disclaimer &rarr;
          </button>
        </div>
      </header>

      <main className="py-12 px-6 max-w-4xl mx-auto space-y-8 text-xs leading-relaxed text-slate-700">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <ShieldCheck className="w-3 h-3" />
            Data Minimization &amp; Privacy
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Privacy Policy &amp; Data Handling Disclosure
          </h1>
          <p className="text-slate-500 mt-1">Effective Date: November 27, 2026 &bull; SumioTech</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Overview &amp; Non-Custodial Scope</h2>
          <p>
            SumioTech (&ldquo;SumioPay&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates a non-custodial payment automation software platform. <strong>We hold ₹0.00 of customer or merchant funds</strong> and never act as a bank, Payment Aggregator, or RBI/NPCI intermediary. This policy describes honestly what technical data we collect and why.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. What Data We Never Collect or Touch</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Zero debit/credit card numbers, CVVs, PINs, or net banking usernames/passwords.</li>
            <li>Zero customer UPI PINs or bank login credentials (all payments happen inside the user&apos;s own UPI app directly to the merchant bank).</li>
            <li>Zero personal chats, WhatsApp messages, banking OTPs, or non-payment SMS notifications.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Information Strictly Required for Automation</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Merchant Profile:</strong> Owner name, business/website branding, email, phone, and receiving UPI VPA(s).</li>
            <li><strong>Order &amp; Matching Telemetry:</strong> Order ID, base rupee amount, unique paise offset, 12-digit UPI reference (UTR), credit notification snippet used solely to match active orders, and webhook delivery status logs.</li>
            <li><strong>Paired Hardware Telemetry:</strong> Paired Android device model, OS version, charging state, battery percentage, and last ping heartbeat.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Android Listener Permission Transparency</h2>
          <p>
            When a merchant voluntarily pairs the SumioPay Listener Android APK, Android&apos;s `NotificationListenerService` reads incoming credit push alerts strictly from known UPI/banking apps to match exact pending paise amounts. Non-payment notifications and OTP messages are discarded locally and never transmitted to SumioPay servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Real Security Controls Applied</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Passwords are salted and irreversibly hashed using `bcryptjs`; refresh tokens are stored strictly as SHA-256 hashes with reuse-family revocation.</li>
            <li>OTPs use CSPRNG generation (`crypto.randomInt`), constant-time equality checks, and automatic lockout after 5 wrong attempts.</li>
            <li>Outbound merchant webhooks are cryptographically signed with HMAC-SHA256 and guarded against SSRF private-IP/cloud-metadata redirects.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6. Data Access, Deletion &amp; Contact</h2>
          <p>
            Merchants may request account closure, device unlinking, or personal data deletion anytime by emailing{' '}
            <a href="mailto:contact@sumiotech.in" className="font-semibold text-blue-600 underline">
              contact@sumiotech.in
            </a>{' '}
            or calling <strong>+91 9875182659</strong>.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;

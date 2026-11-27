import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoHead } from '../../components/SeoHead';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Webhook,
  Server,
  Smartphone,
  QrCode,
  Building2,
  CheckCircle2,
  Ban,
} from 'lucide-react';

export const SecurityCompliancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <SeoHead
        title="Security Architecture & Non-Custodial Legal Disclaimer (₹0 Held) — SumioPay"
        description="Verified security controls (HMAC-SHA256 webhooks, SSRF defense, dual-token JWT rotation, constant-time CSPRNG OTPs) and strict ₹0.00 non-custodial software disclosure for SumioPay by SumioTech."
        keywords="non custodial UPI gateway security, zero escrow UPI software India, HMAC SHA256 payment webhook security, SumioPay legal disclaimer"
        canonicalPath="/security"
      />
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-4 text-xs font-bold">
            <button onClick={() => navigate('/terms')} className="text-slate-600 hover:text-slate-900">
              Terms
            </button>
            <button onClick={() => navigate('/privacy')} className="text-slate-600 hover:text-slate-900">
              Privacy
            </button>
            <button onClick={() => navigate('/refund-policy')} className="text-slate-600 hover:text-slate-900">
              Refund Policy
            </button>
          </div>
        </div>
      </header>

      <main className="py-12 px-6 max-w-5xl mx-auto space-y-10 text-xs leading-relaxed text-slate-700">
        {/* Top Hero */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Non-Custodial Architecture &amp; Security Disclosure
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Security Architecture &amp; Legal Disclaimer
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            Built for SaaS founders and engineering teams who inspect real cryptography and legal clarity rather than marketing buzzwords. Last Updated: November 27, 2026.
          </p>
        </div>

        {/* Critical Zero-Custody & Non-Affiliation Disclaimer */}
        <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-950">
                Zero Fund-Holding Legal Disclaimer (We Hold ₹0.00 of Your Money)
              </h2>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                <strong>SumioPay</strong> (operated by <strong>SumioTech</strong>) is strictly a{' '}
                <strong>software automation, bank-alert parsing, and webhook orchestration SaaS tool</strong>. SumioPay{' '}
                <strong>NEVER accepts, holds, pools, escrows, clears, or settles even ₹1.00</strong> of customer or merchant funds at any stage.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                100% of every payment travels directly between the customer&apos;s UPI app and the merchant&apos;s own linked bank account UPI ID (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">pa=merchant@bank</code>). SumioPay has zero custody over funds and deducts 0% transaction fees.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 flex items-start gap-2.5 text-xs text-slate-800">
            <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Explicit Non-Affiliation &amp; No Regulatory Impersonation:</strong> SumioPay is{' '}
              <strong>NOT</strong> a bank, NBFC, Wallet / Prepaid Payment Instrument (PPI), Nodal Account Operator, or an RBI-licensed Payment Aggregator / Payment Gateway (PA/PG). SumioPay does not claim any partnership, authorization, certification, or endorsement from the{' '}
              <strong>Reserve Bank of India (RBI)</strong>, <strong>NPCI</strong>, <strong>ISO</strong>,{' '}
              <strong>PCI Security Standards Council</strong>, or any commercial bank.
            </div>
          </div>
        </section>

        {/* Real Production Security Controls */}
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Verified Technical Security Controls in Production
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every security mechanism listed below is implemented directly in SumioPay&apos;s runtime architecture — never inflated marketing claims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Lock className="w-4 h-4 text-blue-600" />
                <h3>1. CSPRNG Paise-Lock &amp; Anti-Replay UTR Defense</h3>
              </div>
              <p className="text-slate-600">
                Active 15-minute checkout sessions receive an unpredictable fractional offset (`.01` to `.99`) allocated via cryptographic randomness (`crypto.randomInt`) using integer-paise arithmetic. Every 12-digit UTR settled on a `PAID` order is strictly checked against replays (`409 Conflict`) so a single bank reference can never credit two orders.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Webhook className="w-4 h-4 text-indigo-600" />
                <h3>2. HMAC-SHA256 Signed Webhooks &amp; Timestamps</h3>
              </div>
              <p className="text-slate-600">
                Every payment callback is signed with each merchant&apos;s unique secret using HMAC-SHA256 (`x-sumiopay-signature`, `x-sumiopay-timestamp`, and unique `x-sumiopay-event-id`), allowing your backend to reject forged webhook requests cryptographically using timing-safe comparison.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Server className="w-4 h-4 text-emerald-600" />
                <h3>3. Outbound Webhook SSRF &amp; DNS-Rebinding Firewall</h3>
              </div>
              <p className="text-slate-600">
                All merchant webhook URLs are validated both on save and immediately prior to dispatch via DNS resolution. Loopback (`127.0.0.0/8`), private RFC1918 LANs (`10.x`, `172.16.x`, `192.168.x`), cloud metadata endpoints (`169.254.169.254`), `.internal` hosts, embedded URL credentials, and HTTP redirects (`maxRedirects: 0`) are strictly blocked.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <h3>4. Dual-Token JWT Rotation &amp; Constant-Time OTP Lockout</h3>
              </div>
              <p className="text-slate-600">
                Merchant sessions use short-lived 15-minute access JWTs (`iss`/`aud` validated) paired with SHA-256 hashed 7-day rotating refresh tokens featuring reuse-attack session-family revocation. Registration and password reset OTPs are generated via CSPRNG, compared with `crypto.timingSafeEqual`, and auto-invalidated after 5 wrong guesses. Password resets revoke all active sessions immediately.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <h3>5. Paired-Device Hardware Binding &amp; SMS Minimization</h3>
              </div>
              <p className="text-slate-600">
                Android Companion pairing tokens expire strictly in 30 minutes and are burned immediately on scan (`isPaired: true`). Unpaired tokens cannot push webhook signals. On-device notification parsing filters strictly for incoming bank/UPI credit alerts and ignores personal OTPs, chats, and non-payment SMS.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <QrCode className="w-4 h-4 text-cyan-600" />
                <h3>6. First-Party Vector QR, Strict Input &amp; Rate Hardening</h3>
              </div>
              <p className="text-slate-600">
                Dynamic checkout QRs render via SumioPay&apos;s own `/api/public/qr` endpoint (no third-party QR tracking leakage), public UTR probes redact raw SMS text and rate-limit per proxy-verified IP (`trust proxy`), Helmet security headers &amp; NoSQL `$`/`.` key stripping run globally, and CSV ledger exports neutralize formula injection (`=`, `+`, `-`, `@`).
              </p>
            </div>
          </div>
        </section>

        {/* Clear Legal & Operational Responsibility Matrix */}
        <section className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Shared Legal &amp; Operational Responsibility Matrix</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Clear Liability Boundary</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-6">Area</th>
                  <th className="py-3 px-6">Owner</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-6 font-bold text-slate-900">Money Settlement &amp; Custody</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-700">100% Merchant Bank</td>
                  <td className="py-3.5 px-6 text-slate-600">SumioPay never touches even ₹1; customers pay directly into the merchant&apos;s UPI VPA.</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-bold text-slate-900">Customer Refunds &amp; Disputes</td>
                  <td className="py-3.5 px-6 font-bold text-slate-800">Merchant</td>
                  <td className="py-3.5 px-6 text-slate-600">Since funds sit in merchant&apos;s bank account, merchant issues refunds directly to customers (SumioPay provides UTR logs).</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-bold text-slate-900">Business Legality, GST &amp; Bank Limits</td>
                  <td className="py-3.5 px-6 font-bold text-slate-800">Merchant</td>
                  <td className="py-3.5 px-6 text-slate-600">Merchants are solely accountable for lawful goods/services, tax compliance, and complying with their own bank account UPI limits.</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-bold text-slate-900">Webhook Security &amp; Signature Checks</td>
                  <td className="py-3.5 px-6 font-bold text-blue-700">Shared (SumioPay Signs / Merchant Verifies)</td>
                  <td className="py-3.5 px-6 text-slate-600">SumioPay signs with HMAC-SHA256; merchant backends must verify signature &amp; exact order amount before granting access.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer Legal Callout */}
        <section className="p-6 rounded-2xl bg-slate-950 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Security Disclosure &amp; Legal Inquiries</span>
            </div>
            <p className="text-xs text-slate-400">
              Operated by SumioTech • Responsible vulnerability reports &amp; legal notices:{' '}
              <a href="mailto:contact@sumiotech.in" className="text-blue-400 underline font-semibold">
                contact@sumiotech.in
              </a>{' '}
              • Helpline: +91 9875182659
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login?register=true')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition"
          >
            Create Merchant Account
          </button>
        </section>
      </main>
    </div>
  );
};

export default SecurityCompliancePage;

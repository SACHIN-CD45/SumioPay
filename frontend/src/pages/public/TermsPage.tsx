import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { SeoHead } from '../../components/SeoHead';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <SeoHead
        title="Terms of Service & Non-Custodial Software Agreement — SumioPay"
        description="Official Terms of Service defining SumioPay's B2B non-custodial Direct UPI automation software role with ₹0.00 fund custody and direct merchant bank settlement."
        canonicalPath="/terms"
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
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            User Agreement &amp; Non-Custodial Disclaimer
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Terms of Service &amp; Non-Custodial Software Agreement
          </h1>
          <p className="text-slate-500 mt-1">Last Updated: November 27, 2026</p>
        </div>

        {/* Critical Legal Disclaimer Callout */}
        <section className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 font-extrabold text-amber-950 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Critical Disclaimer: ₹0 Held by SumioPay &amp; No Regulatory Affiliation</span>
          </div>
          <p>
            <strong>1. Zero Fund Custody:</strong> SumioTech (&ldquo;SumioPay&rdquo;) NEVER collects, pools, escrows, holds, or settles even ₹1.00 of customer or merchant funds. Every payment goes 100% directly from the customer&apos;s UPI app to the merchant&apos;s own designated bank UPI ID.
          </p>
          <p>
            <strong>2. Software Utility Only (Not a Bank / PA / PG):</strong> SumioPay is a B2B SaaS notification-matching and developer webhook tool. We are NOT a commercial bank, NBFC, Payment Aggregator, Payment Gateway, nodal operator, or Prepaid Payment Instrument issuer, and we make NO claim of licensing, endorsement, or certification from the Reserve Bank of India (RBI), NPCI, ISO, or any bank.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By creating a merchant account, installing the SumioPay Listener Android utility, or embedding the SumioPay checkout SDK or APIs, you legally bind yourself and your organization to these Terms of Service and our{' '}
            <button type="button" onClick={() => navigate('/security')} className="text-blue-600 underline font-semibold">
              Security &amp; Non-Custodial Disclaimer
            </button>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Nature of Software Service &amp; Direct Settlement</h2>
          <p>
            SumioPay provides dynamic UPI QR / deep-link URI formatting, paise-level order correlation, automated bank credit alert matching, webhook signing (HMAC-SHA256), and SaaS billing analytics. SumioPay does not charge any percentage commission (MDR) on merchant volume and charges only flat SaaS software subscription fees.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Merchant Compliance, Prohibited Use &amp; Indemnity</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>
              <strong>Legal &amp; Tax Responsibility:</strong> You are 100% responsible for KYC compliance required by your own bank, GST/income tax filings, invoice obligations, and compliance with applicable Indian laws governing your business activity.
            </li>
            <li>
              <strong>Customer Refunds &amp; Disputes:</strong> Because customer money settles instantaneously into your bank account (never passing through SumioPay), all refunds, chargebacks, or customer claims are strictly between you and your customer.
            </li>
            <li>
              <strong>Webhook Verification Duty:</strong> Your backend MUST verify the cryptographic `x-sumiopay-signature` HMAC-SHA256 header and order amount before provisioning products or digital entitlements.
            </li>
            <li>
              <strong>Prohibited Activities:</strong> You strictly agree NOT to use SumioPay for illegal gambling, unauthorized betting, phishing, multi-level fraud, counterfeit goods, banned narcotics, unlicensed forex/crypto escrow, or money laundering. Violation triggers immediate permanent termination without refund.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Software License &amp; Suspension Rights</h2>
          <p>
            SumioTech grants you a limited, non-exclusive, non-transferable, revocable right to use the SumioPay console, REST APIs, and SDKs strictly under your active trial or paid SaaS subscription tier. We reserve the right to suspend accounts linked to fraud reports, SSRF abuse attempts, or repeated customer scam complaints.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability &amp; Governing Law</h2>
          <p>
            To the fullest extent permitted under the laws of India, SumioTech shall not be liable for any lost revenue, banking outages, delayed SMS/bank notifications, Android OEM background battery restrictions terminating local listener apps, or customer-merchant disputes. All legal disputes are governed exclusively by Indian law.
          </p>
          <p className="text-slate-500">
            Official Legal &amp; Support Contact: <strong>contact@sumiotech.in</strong> &bull; Helpline: <strong>+91 9875182659</strong>
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;

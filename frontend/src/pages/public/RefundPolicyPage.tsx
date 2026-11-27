import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
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
            Zero Fund Custody &amp; SaaS Billing Policy
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-slate-500 mt-1">Last Updated: November 27, 2026</p>
        </div>

        <section className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-slate-800">
          <div className="flex items-center gap-2 font-extrabold text-amber-950 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Why Customer Order Refunds Never Pass Through SumioPay</span>
          </div>
          <p>
            SumioPay holds <strong>₹0.00</strong> of customer funds. When a buyer pays on a merchant&apos;s website using SumioPay checkout, 100% of that money settles directly from the buyer&apos;s bank into the merchant&apos;s own bank account.{' '}
            <strong>SumioPay cannot debit a merchant&apos;s private bank account and never acts as an escrow intermediary.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Customer Purchases from Merchant Websites</h2>
          <p>
            If you are an end customer who purchased a service or product from an external website powered by SumioPay:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Please contact that website / merchant directly for order fulfillment or refunds, as they received 100% of your payment in their bank account.</li>
            <li>Merchants have full visibility of your 12-digit UTR, exact payment timestamp, and transaction status in their SumioPay Transactions &amp; Refunds Ledger to verify and send a direct reverse UPI refund from their bank app.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Late Transfers / Unmatched Exact Paise</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>If a buyer transfers after the 15-minute checkout timer or sends an altered paise amount, the credit alert appears safely in the merchant&apos;s <strong>Unmapped Payments Ledger</strong> with the 12-digit UTR.</li>
            <li>Customers can also verify their 12-digit UTR on checkout, or the merchant can resolve the order or return funds directly via UPI.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. SumioPay SaaS Software Subscription Plans</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Free Trial First:</strong> Every merchant receives a free trial (default 3 days) to fully test API keys, webhooks, and Android companion pairing before purchasing any paid subscription.</li>
            <li><strong>Cancellations:</strong> Paid SaaS plans (1-Month Pro, 6-Months Growth, or Custom) do not auto-debit your bank account (`cancel` anytime without further charges; access continues until the active billing period expires).</li>
            <li><strong>Duplicate / Accidental Software Billing:</strong> If you are accidentally charged twice for the same SumioPay SaaS subscription cycle, email{' '}
              <a href="mailto:contact@sumiotech.in" className="text-blue-600 underline font-semibold">contact@sumiotech.in</a>{' '}
              or call <strong>+91 9875182659</strong> within 48 hours with both UTR references for verification and reversal.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default RefundPolicyPage;

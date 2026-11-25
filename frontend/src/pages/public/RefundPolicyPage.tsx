import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

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
          <span className="text-xs font-bold text-slate-900">SumioPay Legal</span>
        </div>
      </header>

      <main className="py-12 px-6 max-w-4xl mx-auto space-y-8 text-xs leading-relaxed text-slate-700">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Financial Transparency
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Refund & Cancellation Policy
          </h1>
          <p className="text-slate-500 mt-1">Last Updated: November 25, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Direct-to-Bank Transactions</h2>
          <p>
            Because SumioPay operates on a direct Peer-to-Merchant (P2M) UPI architecture, customer funds are credited directly into the merchant's private bank account instantaneously. <strong>SumioPay does not act as an escrow intermediary and does not hold customer funds.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Customer Refund Process</h2>
          <p>
            When an end-user requests a refund for a service purchased from a merchant using SumioPay (such as SumioLab, SumioBilling, or third-party SaaS):
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>The merchant is directly responsible for approving and issuing refunds to the customer's originating UPI ID or bank account.</li>
            <li>Merchants can view the customer's 12-digit UTR, originating payment app, and transaction timestamp in their SumioPay Transactions Ledger to facilitate instant reverse UPI transfer.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Failed or Disputed Transactions</h2>
          <p>
            In rare cases where an end-user transferred funds after the 15-minute order window expired, or where the exact paise was not included:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>The payment is safely recorded under the merchant's <strong>Unmapped Payments Ledger</strong> with the raw SMS alert and UTR.</li>
            <li>The merchant can either manually link the payment to grant the customer's plan access with 1 click, or reverse the payment back to the customer's UPI VPA.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. SumioPay SaaS Subscription Refunds</h2>
          <p>
            For merchants subscribed to SumioPay paid tiers (Growth or Enterprise):
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>We offer a no-questions-asked <strong>7-day money-back guarantee</strong> on the initial monthly subscription fee.</li>
            <li>Subscriptions can be cancelled at any time from the Merchant Dashboard, with access continuing until the end of the billing cycle.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default RefundPolicyPage;

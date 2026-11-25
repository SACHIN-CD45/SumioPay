import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
            User Agreement
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-2">
            Terms of Service & Merchant Agreement
          </h1>
          <p className="text-slate-500 mt-1">Last Updated: November 25, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using SumioPay, registering a merchant account, or embedding our SDK, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our software or services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Nature of Software Service</h2>
          <p>
            SumioPay provides self-hosted and cloud orchestration tools for automated transaction matching using bank push alerts. SumioPay is a software utility and not a payment gateway, payment aggregator, banking institution, or wallet provider under the Reserve Bank of India (RBI) regulations. Funds move directly between customer and merchant bank accounts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Merchant Responsibilities</h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>You agree to comply with all applicable laws, RBI directives, and NPCI UPI usage guidelines.</li>
            <li>You are solely responsible for the legality of the goods, digital services, or SaaS subscriptions sold using SumioPay.</li>
            <li>You must maintain an active Android device with stable network connectivity to ensure real-time notification interception.</li>
            <li>You agree not to use the platform for any prohibited, illicit, gambling, counterfeit, or restricted activities.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Intellectual Property & License</h2>
          <p>
            SumioTech Private Limited grants you a non-exclusive, non-transferable, revocable license to use the SumioPay API, SDK, and Merchant Dashboard in accordance with your chosen plan tier.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by Indian law, SumioPay and SumioTech Private Limited shall not be liable for any indirect, incidental, or consequential damages resulting from bank downtime, NPCI network latency, OEM phone power management terminating services, or customer payment disputes.
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;

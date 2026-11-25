import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const tiers = [
    {
      name: 'Starter',
      price: '₹0',
      period: 'forever free',
      desc: 'Ideal for bootstrapped developers, solo SaaS founders, and early-stage tools.',
      badge: null,
      highlight: false,
      features: [
        '0% Payment Gateway Fee (Always)',
        '1 Paired Android Listener Phone',
        'Direct Bank Settlement in < 1.2s',
        'Unlimited UPI Transactions',
        'Standard Webhook Dispatch (HMAC-SHA256)',
        'React SDK & REST API Access',
        'Community & Email Support',
      ],
      cta: 'Start Free Today',
      action: () => navigate('/login?register=true'),
    },
    {
      name: 'Growth & Business',
      price: '₹1,499',
      period: 'per month',
      desc: 'Designed for scaling SaaS products, high-volume pathology labs, and POS retail.',
      badge: 'Most Popular',
      highlight: true,
      features: [
        '0% Payment Gateway Fee (Always)',
        'Up to 5 Paired Android Listener Phones',
        'Automatic Multi-Phone Load Balancing',
        'High-Priority Webhook Dispatch & Auto-Retries',
        'Unmapped Payments Dispute Ledger & 1-Click Reconcile',
        'Real-Time Battery & Phone Health Telemetry',
        'WhatsApp Payment Confirmation Bridge Integration',
        'Priority 24/7 WhatsApp & Ticket Support',
      ],
      cta: 'Get Started with Growth',
      action: () => navigate('/login?register=true'),
    },
    {
      name: 'Enterprise Custom',
      price: 'Custom',
      period: 'tailored setup',
      desc: 'For multi-location clinic chains, fintech ERPs, and organizations processing ₹25L+ / mo.',
      badge: 'High Volume',
      highlight: false,
      features: [
        '0% Transaction Fee (Direct Bank Settlement)',
        'Unlimited Android Listeners & Multi-VPA Routing',
        'Self-Hosted On-Premise / VPS White-Label Deployment',
        'Dedicated IP & 99.99% Uptime Guarantee',
        'Custom Bank Notification Regex Engine Tuning',
        'Dedicated Technical Account Manager',
        'Custom Android Listener APK with Private Branding',
        'Custom SLA & Legal Data Protection Agreement',
      ],
      cta: 'Contact Enterprise Team',
      action: () => navigate('/enterprise'),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              SP
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Sumio<span className="text-blue-600">Pay</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login?register=true')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Launch Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Transparent Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight mt-3">
            0% Transaction Fees. Forever.
          </h1>
          <p className="mt-4 text-slate-600 text-base">
            No percentages, no cut from your hard-earned revenue. Direct peer-to-merchant UPI verification into your own bank account.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-8 flex flex-col justify-between border transition relative ${
                tier.highlight
                  ? 'bg-slate-900 text-white border-blue-500 shadow-elevated'
                  : 'bg-white text-slate-900 border-slate-200/80 shadow-subtle hover:border-slate-300'
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  {tier.badge}
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <p className={`text-xs mt-1 ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tier.desc}
                </p>

                <div className="my-6">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                  <span className={`text-xs font-semibold ml-1.5 ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                    / {tier.period}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100/20 text-xs">
                  <div className={`font-bold uppercase tracking-wider text-[10px] ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                    What's Included:
                  </div>
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.highlight ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={tier.highlight ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={tier.action}
                className={`mt-8 w-full py-3 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 ${
                  tier.highlight
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <span>{tier.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-20 p-8 rounded-3xl bg-slate-50 border border-slate-200/80">
          <h2 className="text-xl font-extrabold text-slate-950 mb-4 text-center">
            SumioPay vs Traditional Payment Aggregators
          </h2>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4 text-rose-600">Razorpay / Cashfree / PayU</th>
                  <th className="py-3 px-4 text-blue-600 font-bold">SumioPay Self-Hosted UPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Per-Transaction Cut</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">2.0% + 18% GST (2.36%)</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">0% (Zero Fee Forever)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Settlement Time</td>
                  <td className="py-3 px-4 text-slate-600">T+2 or T+3 Days Delay</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">Instant (0 Seconds in Your Bank)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Chargeback Risk & Holds</td>
                  <td className="py-3 px-4 text-slate-600">Account freezes & rolling reserves</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">Zero Chargeback Frauds</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Business Setup Required</td>
                  <td className="py-3 px-4 text-slate-600">GST, Current Account, Heavy KYC</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">Works with Any UPI ID (Personal or Current)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <UpiCheckoutModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        appName="SUMIOLAB"
        userId="usr_pricing_demo"
        planName="SumioLab Pro Plan"
        baseAmount={499}
      />
    </div>
  );
};

export default PricingPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';
import { publicApi } from '../../lib/api';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const [subPlans, setSubPlans] = useState<any>(null);

  useEffect(() => {
    publicApi
      .get('/platform-config')
      .then((res) => {
        if (res.data.success && res.data.data?.subscriptionPlans) {
          setSubPlans(res.data.data.subscriptionPlans);
        }
      })
      .catch((e) => console.error('Failed to load live pricing config:', e));
  }, []);

  const trialDays = subPlans?.trialDays ?? 3;
  const monthlyPrice = subPlans?.monthlyPrice ?? 399;
  const monthlyDurationDays = subPlans?.monthlyDurationDays ?? 30;
  const monthlyDevices = subPlans?.monthlyDeviceLimit ?? 2;
  const halfYearlyPrice = subPlans?.halfYearlyPrice ?? 1999;
  const halfYearlyDurationDays = subPlans?.halfYearlyDurationDays ?? 180;
  const halfYearlyDevices = subPlans?.halfYearlyDeviceLimit ?? 5;
  const customPrice = subPlans?.customPrice ?? 0;
  const savings = Math.max(0, monthlyPrice * 6 - halfYearlyPrice);

  const isLoggedIn = Boolean(localStorage.getItem('sumiopay_token'));

  const goActivate = (plan?: string) => {
    if (isLoggedIn) {
      navigate(plan ? `/billing?plan=${plan}` : '/billing');
    } else {
      navigate('/login?register=true');
    }
  };

  const tiers = [
    {
      name: 'Free Trial',
      price: '₹0',
      period: `${trialDays} days free`,
      desc: 'Start testing live UPI verification, paise matching & webhooks on signup with zero commitment.',
      badge: `${trialDays}-Day Free Trial`,
      highlight: false,
      features: [
        '0% Payment Gateway Commission',
        `${trialDays}-Day Full Sandbox & Live Verification`,
        'Android Listener App Pairing',
        'Direct Bank Settlement in < 1.2s',
        'HMAC-SHA256 Signed Webhooks',
        'Drop-In React SDK & REST API',
      ],
      cta: `Start ${trialDays}-Day Free Trial`,
      action: () => navigate(isLoggedIn ? '/billing' : '/login?register=true'),
    },
    {
      name: '1 Month Plan',
      price: `₹${monthlyPrice.toLocaleString('en-IN')}`,
      period: `${monthlyDurationDays} days`,
      desc: 'Perfect for SaaS websites, e-commerce checkouts & solo founders accepting unlimited UPI orders.',
      badge: null,
      highlight: false,
      features: [
        '0% Payment Gateway Fee Forever',
        `Up to ${monthlyDevices} Paired Android Listener Phones`,
        'Unlimited Live UPI Transactions',
        'Hosted QR Payment Links (/pay/:orderId)',
        'Unmapped Payments Queue & 1-Click Match',
        'Automated Customer Email Receipts',
      ],
      cta: `Activate 1 Month (₹${monthlyPrice})`,
      action: () => goActivate('MONTHLY'),
    },
    {
      name: '6 Months Plan',
      price: `₹${halfYearlyPrice.toLocaleString('en-IN')}`,
      period: `${halfYearlyDurationDays} days`,
      desc: `Best value scaling plan (≈ ₹${Math.round(halfYearlyPrice / 6)}/mo effective${savings > 0 ? `, save ₹${savings}` : ''}).`,
      badge: savings > 0 ? `Most Popular • Save ₹${savings}` : 'Most Popular',
      highlight: true,
      features: [
        '0% Payment Gateway Fee Forever',
        `Up to ${halfYearlyDevices} Paired Android Listener Phones`,
        'Multi-Phone Load Balancing & Heartbeat Monitor',
        'Priority Webhook Dispatch & Auto-Retries',
        'Bank CSV Passbook Batch Reconciler',
        'Priority Support (+91 9875182659)',
      ],
      cta: `Activate 6 Months (₹${halfYearlyPrice})`,
      action: () => goActivate('HALF_YEARLY'),
    },
    {
      name: 'Custom All-Features',
      price: customPrice > 0 ? `₹${customPrice.toLocaleString('en-IN')}` : 'Custom',
      period: customPrice > 0 ? 'per year' : 'all features included',
      desc: 'All SumioPay features unlocked: unlimited listeners, white-label checkout, custom SLAs & onboarding.',
      badge: 'All Features Unlocked',
      highlight: false,
      features: [
        'ALL Platform Features Unlocked',
        'Unlimited Android Phones & Multi-UPI Routing',
        'White-Label Checkout & Branded Listener APK',
        'Role-Based Team Access & Audit Logs',
        'Refunds, Disputes & Custom Bank Regex',
        'Dedicated Engineer SLA (contact@sumiotech.in)',
      ],
      cta: 'Get Custom Plan',
      action: () => (isLoggedIn ? navigate('/billing') : navigate('/enterprise')),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-2.5">
            <img src="/sumiopay-logo.png" alt="SumioPay" className="h-9 w-auto object-contain" />
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
              onClick={() => navigate(isLoggedIn ? '/billing' : '/login?register=true')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              {isLoggedIn ? 'Open Billing' : `Start ${trialDays}-Day Trial`}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{trialDays}-Day Free Trial • Pay Flat via UPI</span>
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight mt-3">
            0% Transaction Fees. Forever.
          </h1>
          <p className="mt-4 text-slate-600 text-base">
            Simple flat pricing controlled by SumioTech — try free for {trialDays} days, then pick ₹{monthlyPrice}/month, ₹{halfYearlyPrice}/6 months, or Custom All-Features.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm whitespace-nowrap">
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
                    What&apos;s Included:
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
                  <td className="py-3 px-4 font-bold text-slate-800">Chargeback Risk &amp; Holds</td>
                  <td className="py-3 px-4 text-slate-600">Account freezes &amp; rolling reserves</td>
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
        planName="Monthly Pro Preview"
        websiteName="SumioTech Cloud"
        brandColor="#4F3DF5"
        baseAmount={monthlyPrice}
        billDetails={{
          items: [{ label: 'SumioPay Pro Monthly Plan', quantity: 1, amount: monthlyPrice + 100 }],
          subtotal: monthlyPrice + 100,
          couponCode: 'SUMIO100',
          discountAmount: 100,
          note: `To begin your subscription, ₹${monthlyPrice} will be processed securely via UPI.`,
        }}
        demoMode={true}
      />
    </div>
  );
};

export default PricingPage;

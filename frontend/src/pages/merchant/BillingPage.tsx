import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CreditCard, Check, ShieldCheck, Zap, ArrowUpRight, Sparkles } from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/subscription');
      if (res.data.success) {
        setSubscription(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleSelectPlan = async (tier: string) => {
    try {
      setUpgradingTier(tier);
      const res = await api.post('/merchant/subscription/plan', { planTier: tier });
      if (res.data.success) {
        setSubscription(res.data.data);
        alert(`Successfully switched plan to ${tier}!`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpgradingTier(null);
    }
  };

  const plans = [
    {
      tier: 'STARTER',
      name: 'Starter',
      price: '₹1,999',
      period: '/month',
      desc: 'Essential payment orchestration for growing startups.',
      features: [
        'Up to ₹5,00,000 monthly GMV',
        '1 Dedicated Android Listener Phone',
        '2 Project Environments',
        'Paise Differential UPI Auto-Match',
        'Standard Email Support',
      ],
    },
    {
      tier: 'GROWTH',
      name: 'Growth',
      price: '₹4,999',
      period: '/month',
      popular: true,
      desc: 'High velocity scaling for digital SaaS & ecommerce.',
      features: [
        'Up to ₹25,00,000 monthly GMV',
        '3 Dedicated Android Listener Phones',
        '5 Project Environments',
        'Automated Bank Passbook Reconciler',
        'Full Webhook Delivery Retries & DLQ',
        'Priority Slack & Email Support',
      ],
    },
    {
      tier: 'BUSINESS',
      name: 'Business',
      price: '₹11,999',
      period: '/month',
      desc: 'Mission critical infrastructure for hospitals & diagnostic labs.',
      features: [
        'Up to ₹1,00,00,000 monthly GMV',
        '10 Dedicated Android Listener Phones',
        'Unlimited Project Workspaces',
        'Custom Webhook Headers & HMAC Rotation',
        'Role-Based Team Access Control (RBAC)',
        '24/7 Phone & WhatsApp Escalation',
      ],
    },
    {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Self-hosted or managed dedicated cluster with tailored SLAs.',
      features: [
        'Unlimited Monthly GMV',
        'Unlimited Listener Devices & Multi-Bank Routing',
        'Direct Bank API Adapters (HDFC, ICICI, Axis)',
        'Dedicated Technical Account Manager',
        '99.99% Uptime Financial SLA',
        'Custom Security & Compliance Audits',
      ],
    },
  ];

  const currentTier = subscription?.planTier || 'STARTER';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
          <CreditCard className="w-3.5 h-3.5" />
          <span>SaaS Entitlements</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription & Billing</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your SumioPay platform plan, payment volume limits, and automated enterprise features.
        </p>
      </div>

      {/* Current Active Plan Card */}
      <div className="p-6 bg-linear-to-r from-blue-900 to-indigo-900 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] font-mono tracking-wider uppercase text-blue-200">Current Active Plan</span>
          <h2 className="text-2xl font-black mt-1 flex items-center gap-3">
            <span>{currentTier} PLAN</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
              ACTIVE
            </span>
          </h2>
          <p className="text-xs text-blue-200 mt-2">
            Renewal Period: {subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : 'Active'} — {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Next Month'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSelectPlan('GROWTH')}
            className="px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-md hover:bg-blue-50 transition"
          >
            Upgrade Tier
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = currentTier === p.tier;
          return (
            <div
              key={p.tier}
              className={`p-6 rounded-2xl border flex flex-col justify-between transition ${
                isCurrent
                  ? 'bg-blue-50/40 border-blue-400 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                  {p.popular && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Popular
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-500">{p.period}</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={isCurrent || upgradingTier === p.tier}
                  onClick={() => handleSelectPlan(p.tier)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    isCurrent
                      ? 'bg-slate-200 text-slate-500 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : upgradingTier === p.tier ? 'Switching...' : `Select ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillingPage;

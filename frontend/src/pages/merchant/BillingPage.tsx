import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api';
import { SumioCheckoutCard, CheckoutBillDetails } from '../../components/checkout/SumioCheckoutCard';
import {
  CreditCard,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  X,
  Receipt,
  Mail,
  Phone,
} from 'lucide-react';

interface CheckoutOrder {
  orderId: string;
  baseAmount: number;
  paiseOffset: number;
  exactAmount: number;
  currency?: string;
  upiId: string;
  merchantName: string;
  websiteName?: string;
  websiteLogoUrl?: string;
  brandColor?: string;
  trustedBusiness?: boolean;
  kycVerified?: boolean;
  trustLabel?: string;
  billDetails?: CheckoutBillDetails | null;
  upiIntentUrl: string;
  expiresAt: string;
  paidAt?: string;
  collectorOnlineDevices?: number;
  plan?: {
    planKey: string;
    planTier: string;
    label: string;
    durationDays: number;
  };
  planLabel?: string;
}

export const BillingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initiatingPlan, setInitiatingPlan] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active UPI Checkout Modal State
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED'>('PENDING');
  const [paidUtr, setPaidUtr] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Custom Enterprise Contact Modal
  const [customModalOpen, setCustomModalOpen] = useState<boolean>(false);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/subscription');
      if (res.data.success) {
        setSubscription(res.data.data);
      }
    } catch (err: any) {
      console.error('[Billing]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Update countdown timer while checkout modal is open
  useEffect(() => {
    if (!checkoutOrder || checkoutStatus !== 'PENDING') return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(checkoutOrder.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        setCheckoutStatus('EXPIRED');
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [checkoutOrder, checkoutStatus]);

  // Live 2s polling for subscription payment confirmation via SumioPay
  useEffect(() => {
    if (!checkoutOrder || checkoutStatus !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/merchant/subscription/checkout-status/${checkoutOrder.orderId}`);
        if (res.data.success && res.data.data) {
          const d = res.data.data;
          if (d.status === 'PAID') {
            setCheckoutStatus('PAID');
            setPaidUtr(d.utrNumber || 'Verified Bank Credit');
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            await fetchSubscription();
          } else if (d.status === 'EXPIRED') {
            setCheckoutStatus('EXPIRED');
          }
        }
      } catch {
        // Silently retry on transient poll error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [checkoutOrder, checkoutStatus, fetchSubscription]);

  const handleStartCheckout = async (planKey: 'MONTHLY' | 'HALF_YEARLY' | 'CUSTOM') => {
    setErrorBanner(null);
    if (planKey === 'CUSTOM' && !(subscription?.plans?.customPrice > 0)) {
      setCustomModalOpen(true);
      return;
    }

    try {
      setInitiatingPlan(planKey);
      const res = await api.post('/merchant/subscription/checkout', { planKey });
      if (res.data.success && res.data.data) {
        setCheckoutOrder(res.data.data);
        setCheckoutStatus('PENDING');
        setPaidUtr('');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Could not create subscription checkout order';
      setErrorBanner(msg);
    } finally {
      setInitiatingPlan(null);
    }
  };

  // Optional auto-open checkout if user came from /pricing?plan=MONTHLY or Landing Page
  useEffect(() => {
    const requestedPlan = searchParams.get('plan');
    if (
      requestedPlan &&
      subscription &&
      !checkoutOrder &&
      (requestedPlan === 'MONTHLY' || requestedPlan === 'HALF_YEARLY')
    ) {
      // Only scroll focus; let user review price & click or resume
    }
  }, [searchParams, subscription, checkoutOrder]);

  const handleResumePending = () => {
    if (!subscription?.pendingCheckoutOrder) return;
    setCheckoutOrder(subscription.pendingCheckoutOrder);
    setCheckoutStatus('PENDING');
    setPaidUtr('');
  };

  const plansConfig = subscription?.plans || {
    trialDays: 3,
    monthlyPrice: 399,
    monthlyDurationDays: 30,
    monthlyDeviceLimit: 2,
    halfYearlyPrice: 1999,
    halfYearlyDurationDays: 180,
    halfYearlyDeviceLimit: 5,
    customPrice: 0,
    customLabel: 'Custom — All Features Unlocked',
  };

  const currentTier = subscription?.planTier || 'TRIAL';
  const currentStatus = subscription?.status || 'TRIAL';
  const daysRemaining = subscription?.daysRemaining ?? plansConfig.trialDays;
  const isExpired = Boolean(subscription?.isExpired);
  const monthlySavingsOnHalfYearly = Math.max(
    0,
    plansConfig.monthlyPrice * 6 - plansConfig.halfYearlyPrice
  );

  const planDisplayName: Record<string, string> = {
    TRIAL: `${plansConfig.trialDays}-Day Free Trial`,
    MONTHLY: `1 Month Pro (₹${plansConfig.monthlyPrice}/mo)`,
    HALF_YEARLY: `6 Months Growth (₹${plansConfig.halfYearlyPrice}/6mo)`,
    CUSTOM: plansConfig.customLabel || 'Custom — All Features',
    STARTER: 'Starter Plan',
    GROWTH: 'Growth Plan',
    BUSINESS: 'Business Plan',
    ENTERPRISE: 'Enterprise Plan',
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>SumioPay SaaS Billing &amp; Subscriptions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription &amp; Plan Activation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Start with a {plansConfig.trialDays}-day free trial, then pay directly via SumioPay UPI for instant activation with 0% gateway markup.
          </p>
        </div>

        {subscription?.selfBillingReady ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              SumioPay Instant UPI Billing Active
              {subscription.collectorOnlineDevices > 0
                ? ` • ${subscription.collectorOnlineDevices} Listener Online`
                : ''}
            </span>
          </div>
        ) : (
          !loading && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Platform Collector UPI Setup Pending in SuperAdmin</span>
            </div>
          )
        )}
      </div>

      {/* Error Alert */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Payment Resume Strip */}
      {subscription?.pendingCheckoutOrder && !checkoutOrder && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have a pending UPI subscription payment for{' '}
              <strong>{subscription.pendingCheckoutOrder.planLabel}</strong> (₹
              {Number(subscription.pendingCheckoutOrder.exactAmount).toFixed(2)}).
            </span>
          </div>
          <button
            onClick={handleResumePending}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition"
          >
            Open Payment QR
          </button>
        </div>
      )}

      {/* Current Active Plan Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase text-blue-300">
            Current Workspace Entitlement
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black">
              {planDisplayName[currentTier] || `${currentTier} PLAN`}
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isExpired
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  : currentStatus === 'ACTIVE'
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                  : 'bg-sky-500/25 text-sky-200 border-sky-400/40'
              }`}
            >
              {isExpired ? 'EXPIRED' : currentStatus}
            </span>
          </div>
          <p className="text-xs text-blue-200">
            Valid Period:{' '}
            {subscription?.currentPeriodStart
              ? new Date(subscription.currentPeriodStart).toLocaleDateString('en-IN')
              : 'Today'}{' '}
            —{' '}
            {subscription?.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')
              : '—'}{' '}
            <span className="ml-1 font-mono text-white font-semibold">
              ({isExpired ? 'Expired — Activate below' : `${daysRemaining} day(s) remaining`})
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleStartCheckout('MONTHLY')}
            disabled={initiatingPlan === 'MONTHLY'}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition"
          >
            {initiatingPlan === 'MONTHLY'
              ? 'Generating QR...'
              : `Activate 1 Month (₹${plansConfig.monthlyPrice})`}
          </button>
          <button
            onClick={() => handleStartCheckout('HALF_YEARLY')}
            disabled={initiatingPlan === 'HALF_YEARLY'}
            className="px-5 py-2.5 rounded-xl bg-white text-blue-950 font-extrabold text-xs shadow-md hover:bg-blue-50 transition"
          >
            {initiatingPlan === 'HALF_YEARLY'
              ? 'Generating QR...'
              : `Activate 6 Months (₹${plansConfig.halfYearlyPrice})`}
          </button>
        </div>
      </div>

      {/* 4 Canonical Subscription Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Free Trial */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between transition ${
            currentTier === 'TRIAL'
              ? 'bg-sky-50/60 border-sky-400 shadow-sm ring-2 ring-sky-500/15'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Free Trial</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                {plansConfig.trialDays} Days Free
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">₹0</span>
              <span className="text-xs text-slate-500">/ {plansConfig.trialDays} days</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full gateway sandbox &amp; live test run included automatically on signup.
            </p>
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              {[
                `${plansConfig.trialDays}-Day Full Access Trial`,
                'Android Listener App Pairing',
                'Paise Differential Auto-Match',
                'API Keys & HMAC Webhooks',
                '0% Gateway Transaction Fee',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-slate-600">
                  <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              disabled
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-500 cursor-default"
            >
              {currentTier === 'TRIAL'
                ? isExpired
                  ? 'Trial Ended'
                  : `Active (${daysRemaining}d left)`
                : 'Included on Signup'}
            </button>
          </div>
        </div>

        {/* 2. Monthly ₹399 */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between transition ${
            currentTier === 'MONTHLY'
              ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Monthly Pro</h3>
              {currentTier === 'MONTHLY' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  Current
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">
                ₹{plansConfig.monthlyPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500">/ {plansConfig.monthlyDurationDays} days</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ideal for solo SaaS products, billing apps &amp; high-speed startups.
            </p>
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              {[
                '0% Transaction Commission Forever',
                `Up to ${plansConfig.monthlyDeviceLimit} Android Listener Phones`,
                'Unlimited UPI Orders & Auto-Verify',
                'Instant HMAC-SHA256 Webhooks',
                'Hosted Checkout Page + SDK + API',
                'Unmapped Payment Reconciler',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-slate-600">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              disabled={initiatingPlan === 'MONTHLY'}
              onClick={() => handleStartCheckout('MONTHLY')}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-xs transition flex items-center justify-center gap-1.5"
            >
              {initiatingPlan === 'MONTHLY' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating UPI Order...</span>
                </>
              ) : (
                <span>
                  {currentTier === 'MONTHLY' && currentStatus === 'ACTIVE'
                    ? `Extend +1 Month (₹${plansConfig.monthlyPrice})`
                    : `Pay ₹${plansConfig.monthlyPrice} & Activate`}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. 6 Months ₹1,999 */}
        <div
          className={`p-6 rounded-2xl border-2 flex flex-col justify-between transition relative ${
            currentTier === 'HALF_YEARLY'
              ? 'bg-indigo-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white border-blue-600 shadow-md'
          }`}
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
            Most Popular {monthlySavingsOnHalfYearly > 0 ? `• Save ₹${monthlySavingsOnHalfYearly}` : ''}
          </span>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">6 Months Growth</h3>
              {currentTier === 'HALF_YEARLY' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Current
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">
                ₹{plansConfig.halfYearlyPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500">/ {plansConfig.halfYearlyDurationDays} days</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              6 months uninterrupted SaaS billing (≈ ₹{Math.round(plansConfig.halfYearlyPrice / 6)}/mo effective).
            </p>
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              {[
                'Everything in Monthly Pro',
                `Up to ${plansConfig.halfYearlyDeviceLimit} Paired Android Phones`,
                'Multi-Device Failover & Load Balancing',
                'Priority Webhook Delivery & Retries',
                'Bank CSV Automated Passbook Match',
                'Priority Support (+91 9875182659)',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-slate-600">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              disabled={initiatingPlan === 'HALF_YEARLY'}
              onClick={() => handleStartCheckout('HALF_YEARLY')}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white shadow-sm transition flex items-center justify-center gap-1.5"
            >
              {initiatingPlan === 'HALF_YEARLY' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating UPI Order...</span>
                </>
              ) : (
                <span>
                  {currentTier === 'HALF_YEARLY' && currentStatus === 'ACTIVE'
                    ? `Extend +6 Months (₹${plansConfig.halfYearlyPrice})`
                    : `Pay ₹${plansConfig.halfYearlyPrice} & Activate`}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4. Custom All Features */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between transition ${
            currentTier === 'CUSTOM'
              ? 'bg-amber-50/50 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-slate-950 text-white border-slate-800'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base ${currentTier === 'CUSTOM' ? 'text-slate-900' : 'text-white'}`}>
                Custom Enterprise
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-3 h-3" />
                All Features
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold ${currentTier === 'CUSTOM' ? 'text-slate-900' : 'text-white'}`}>
                {plansConfig.customPrice > 0
                  ? `₹${plansConfig.customPrice.toLocaleString('en-IN')}`
                  : 'Custom'}
              </span>
              <span className={`text-xs ${currentTier === 'CUSTOM' ? 'text-slate-500' : 'text-slate-400'}`}>
                {plansConfig.customPrice > 0 ? '/ yr' : 'tailored'}
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${currentTier === 'CUSTOM' ? 'text-slate-600' : 'text-slate-400'}`}>
              Every SumioPay enterprise capability unlocked for multi-brand or high-volume teams.
            </p>
            <div
              className={`pt-4 border-t space-y-2.5 text-xs ${
                currentTier === 'CUSTOM' ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              {[
                'ALL Features Included (Zero Limits)',
                'Unlimited Android Phones & Multi-UPI Routing',
                'Unlimited Workspaces, RBAC & Audit Exports',
                'White-Label Hosted Checkout & Branded APK',
                'Refunds, Disputes & Custom Bank Regex',
                'Dedicated Engineer SLA & Onboarding',
              ].map((feat) => (
                <div
                  key={feat}
                  className={`flex items-start gap-2 ${
                    currentTier === 'CUSTOM' ? 'text-slate-700' : 'text-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              disabled={initiatingPlan === 'CUSTOM'}
              onClick={() => handleStartCheckout('CUSTOM')}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
            >
              {plansConfig.customPrice > 0
                ? `Pay ₹${plansConfig.customPrice} & Activate`
                : 'Request All-Features Custom Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice & Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Subscription Invoices &amp; UPI Payment Receipts</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {(subscription?.invoiceHistory || []).length} record(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Invoice ID</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Bank UTR</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-6 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {!subscription?.invoiceHistory?.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-sans">
                    No paid invoices yet. When you pay via SumioPay UPI above, verified invoices &amp; UTR numbers appear here automatically.
                  </td>
                </tr>
              ) : (
                [...subscription.invoiceHistory].reverse().map((inv: any, i: number) => (
                  <tr key={inv.invoiceId || i} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{inv.invoiceId}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        {inv.planTier || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{inv.orderId || '—'}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                      {inv.utrNumber || 'Direct Bank Credit'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{((inv.amountInPaise || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real SumioPay Self-Billing Branded Checkout Modal */}
      {checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl my-auto">
            <SumioCheckoutCard
              order={{
                orderId: checkoutOrder.orderId,
                appName: 'SUMIOPAY',
                baseAmount: checkoutOrder.baseAmount,
                exactAmount: checkoutOrder.exactAmount,
                merchantName: checkoutOrder.merchantName,
                websiteName: checkoutOrder.websiteName || checkoutOrder.merchantName || 'SumioTech',
                websiteLogoUrl: checkoutOrder.websiteLogoUrl,
                brandColor: checkoutOrder.brandColor || '#4F3DF5',
                trustedBusiness: checkoutOrder.trustedBusiness ?? true,
                kycVerified: checkoutOrder.kycVerified ?? true,
                trustLabel: 'SumioPay Trusted Business',
                billDetails: checkoutOrder.billDetails || null,
                upiIntentUrl: checkoutOrder.upiIntentUrl,
                status: checkoutStatus,
                utrNumber: paidUtr,
                paidAt: checkoutOrder.paidAt,
              }}
              planName={checkoutOrder.plan?.label || checkoutOrder.planLabel || 'SumioPay Subscription'}
              timeFormatted={formatTimer(secondsLeft)}
              onClose={() => setCheckoutOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Custom All-Features Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Custom All-Features Activation
              </h3>
              <button
                onClick={() => setCustomModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Need unlimited Android listener phones, white-label domain checkout, multi-VPA bank routing, or custom SLA pricing? Reach out directly to the <strong>SumioTech</strong> team to unlock your workspace immediately.
            </p>
            <div className="space-y-2 text-xs">
              <a
                href={`mailto:${subscription?.enterpriseContactEmail || 'contact@sumiotech.in'}?subject=Custom%20All-Features%20SumioPay%20Plan`}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 font-semibold text-slate-800"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span>{subscription?.enterpriseContactEmail || 'contact@sumiotech.in'}</span>
              </a>
              <a
                href={`tel:${(subscription?.supportPhone || '+91 9875182659').replace(/\s+/g, '')}`}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 font-semibold text-slate-800"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{subscription?.supportPhone || '+91 9875182659'}</span>
              </a>
            </div>
            <button
              onClick={() => setCustomModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;

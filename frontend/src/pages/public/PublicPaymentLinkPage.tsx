import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { publicApi } from '../../lib/api';
import { SeoHead } from '../../components/SeoHead';
import {
  SumioCheckoutCard,
  CheckoutOrderPayload,
} from '../../components/checkout/SumioCheckoutCard';
import {
  ShieldCheck,
  Tag,
  Loader2,
  AlertCircle,
  ArrowRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const PublicPaymentLinkPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedPricing, setAppliedPricing] = useState<{
    appliedCouponCode: string;
    discountInr: number;
    finalInr: number;
  } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active Order Checkout View
  const [activeOrder, setActiveOrder] = useState<CheckoutOrderPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(900);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await publicApi.get(`/public/pay-link/${encodeURIComponent(slug)}`);
        if (!active) return;
        if (res.data.success && res.data.data) {
          const d = res.data.data;
          setLinkInfo(d);
          if (d.amountMode === 'OPEN') {
            setCustomAmount(String(d.minAmountInr || 100));
          }
        } else {
          setError('Payment link could not be found.');
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || 'Payment link unavailable.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!activeOrder?.orderId || activeOrder.status === 'PAID' || activeOrder.status === 'EXPIRED') {
      return;
    }
    const poll = setInterval(async () => {
      try {
        const res = await publicApi.get(`/order/status/${activeOrder.orderId}`);
        if (res.data.success && res.data.data) {
          if (res.data.data.status === 'PAID') {
            setActiveOrder(res.data.data);
            clearInterval(poll);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          } else if (res.data.data.status === 'EXPIRED') {
            setActiveOrder(res.data.data);
            clearInterval(poll);
          }
        }
      } catch {}
    }, 2500);
    return () => clearInterval(poll);
  }, [activeOrder]);

  useEffect(() => {
    if (!activeOrder || timeLeft <= 0 || activeOrder.status === 'PAID') return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [activeOrder, timeLeft]);

  const baseDisplayInr =
    linkInfo?.amountMode === 'FIXED'
      ? Number(linkInfo.amountInr || 0)
      : Math.max(Number(linkInfo?.minAmountInr || 1), Number(customAmount || 0));

  const handleApplyCoupon = async () => {
    if (!slug || !couponInput.trim()) return;
    setCouponFeedback('');
    try {
      const res = await publicApi.post(`/public/pay-link/${encodeURIComponent(slug)}/apply-coupon`, {
        couponCode: couponInput.trim(),
        amountInr: baseDisplayInr,
      });
      if (res.data.success && res.data.data) {
        setAppliedPricing(res.data.data);
        setCouponFeedback(`Coupon ${res.data.data.appliedCouponCode} applied (-₹${res.data.data.discountInr})!`);
      }
    } catch (err: any) {
      setAppliedPricing(null);
      setCouponFeedback(err?.response?.data?.message || 'Invalid coupon code.');
    }
  };

  const handleProceedToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !linkInfo) return;
    setError('');
    try {
      setSubmitting(true);
      const createRes = await publicApi.post(`/public/pay-link/${encodeURIComponent(slug)}/checkout`, {
        customAmountInr: linkInfo.amountMode === 'OPEN' ? Number(customAmount) : undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        couponCode: appliedPricing?.appliedCouponCode || couponInput.trim() || '',
      });
      if (!createRes.data.success || !createRes.data.data?.orderId) {
        throw new Error(createRes.data.message || 'Unable to start checkout.');
      }

      const orderRes = await publicApi.get(`/order/status/${createRes.data.data.orderId}`);
      if (orderRes.data.success && orderRes.data.data) {
        setActiveOrder(orderRes.data.data);
        if (orderRes.data.data.expiresAt) {
          const secs = Math.max(0, Math.floor((new Date(orderRes.data.data.expiresAt).getTime() - Date.now()) / 1000));
          setTimeLeft(secs);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Payment initiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const payableAmount = appliedPricing ? appliedPricing.finalInr : baseDisplayInr;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center py-8 px-4">
      <SeoHead
        title={linkInfo ? `${linkInfo.title} — ${linkInfo.websiteName}` : 'Direct UPI Payment — SumioPay'}
        description="Direct bank-to-bank UPI payment page powered by SumioPay."
        noIndex
      />

      {loading ? (
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading Payment Page...</p>
        </div>
      ) : activeOrder ? (
        <div className="space-y-4">
          <SumioCheckoutCard
            order={activeOrder}
            planName={linkInfo?.title}
            timeFormatted={formattedTime}
            onClose={() => setActiveOrder(null)}
          />
        </div>
      ) : !linkInfo || !linkInfo.available ? (
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-black text-slate-900">Payment Link Unavailable</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {linkInfo?.unavailableReason || error || 'This payment link is no longer accepting payments.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
          >
            Go to SumioPay Home
          </button>
        </div>
      ) : (
        <div className="max-w-4xl w-full mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Business & Product Summary */}
          <div
            className="md:col-span-5 p-6 sm:p-8 text-white flex flex-col justify-between space-y-6"
            style={{
              background: `linear-gradient(155deg, ${linkInfo.brandColor || '#4F3DF5'} 0%, #1E1B4B 100%)`,
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {linkInfo.websiteLogoUrl ? (
                  <img
                    src={linkInfo.websiteLogoUrl}
                    alt={linkInfo.websiteName}
                    className="w-11 h-11 rounded-xl bg-white p-1 object-contain"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-white text-slate-900 font-black text-lg flex items-center justify-center">
                    {String(linkInfo.websiteName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-sm">{linkInfo.websiteName}</div>
                  <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>{linkInfo.kycVerified ? 'KYC Verified Business' : 'SumioPay Trusted Business'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h1 className="text-2xl font-black tracking-tight">{linkInfo.title}</h1>
                {linkInfo.description && (
                  <p className="text-xs text-white/85 mt-2 leading-relaxed">{linkInfo.description}</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-white/75 font-bold">Total Payable</span>
                <div className="text-3xl font-black font-mono">
                  ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {appliedPricing && appliedPricing.discountInr > 0 && (
                  <div className="text-[11px] text-emerald-300 font-bold">
                    Includes -₹{appliedPricing.discountInr} coupon ({appliedPricing.appliedCouponCode})
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-white/80">
              <Lock className="w-3.5 h-3.5" />
              <span>Direct Bank-to-Bank UPI • 0% Gateway Fee • Secured by SumioPay</span>
            </div>
          </div>

          {/* Right Form */}
          <form onSubmit={handleProceedToPay} className="md:col-span-7 p-6 sm:p-8 space-y-4 text-xs">
            <h2 className="text-base font-extrabold text-slate-900">Enter Payment Details</h2>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {error}
              </div>
            )}

            {linkInfo.amountMode === 'OPEN' && (
              <div>
                <label htmlFor="pub-amt" className="block font-bold text-slate-700 mb-1">
                  Enter Amount (₹ INR) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="pub-amt"
                  type="number"
                  min={linkInfo.minAmountInr || 1}
                  required
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAppliedPricing(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-base font-bold text-slate-900"
                />
              </div>
            )}

            {linkInfo.collectName && (
              <div>
                <label htmlFor="pub-name" className="block font-bold text-slate-700 mb-1">
                  Full Name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="pub-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
            )}

            {linkInfo.collectEmail && (
              <div>
                <label htmlFor="pub-email" className="block font-bold text-slate-700 mb-1">
                  Email (for Payment Receipt) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="pub-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
            )}

            {linkInfo.collectPhone && (
              <div>
                <label htmlFor="pub-phone" className="block font-bold text-slate-700 mb-1">
                  Phone / WhatsApp <span aria-hidden="true">*</span>
                </label>
                <input
                  id="pub-phone"
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
            )}

            {linkInfo.hasCoupons && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label htmlFor="pub-coupon" className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Have a Promo / Coupon Code?</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="pub-coupon"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200 font-mono uppercase text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    Apply
                  </button>
                </div>
                {couponFeedback && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      appliedPricing ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {appliedPricing && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{couponFeedback}</span>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60"
              style={{ backgroundColor: linkInfo.brandColor || '#4F3DF5' }}
            >
              <span>
                {submitting
                  ? 'Creating UPI Order...'
                  : `Pay ₹${payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via Direct UPI`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PublicPaymentLinkPage;

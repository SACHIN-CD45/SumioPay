import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  X,
  Zap,
  Tag,
  Lock,
  Loader2,
  QrCode,
  Hash,
} from 'lucide-react';

export interface BillLineItem {
  label: string;
  quantity?: number;
  amount: number;
}

export interface CheckoutBillDetails {
  items?: BillLineItem[];
  subtotal?: number;
  couponCode?: string;
  discountAmount?: number;
  taxLabel?: string;
  taxAmount?: number;
  platformFee?: number;
  note?: string;
  returnUrl?: string;
}

export interface CheckoutOrderPayload {
  orderId: string;
  appName?: string;
  baseAmount: number;
  paiseOffset?: number;
  exactAmount: number;
  upiId: string;
  merchantName?: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteLogoUrl?: string;
  brandColor?: string;
  trustedBusiness?: boolean;
  kycVerified?: boolean;
  trustLabel?: string;
  billDetails?: CheckoutBillDetails | null;
  returnUrl?: string;
  upiIntentUrl: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | string;
  utr?: string;
  utrNumber?: string;
  isTest?: boolean;
  paidAt?: string;
  metadata?: Record<string, any>;
}

interface SumioCheckoutCardProps {
  order: CheckoutOrderPayload;
  planName?: string;
  timeFormatted: string;
  isDemoMode?: boolean;
  onClose?: () => void;
  onSimulatePayment?: () => Promise<void> | void;
  simulating?: boolean;
  onSubmitUtr?: (utrNumber: string) => Promise<{
    success: boolean;
    matchedImmediately?: boolean;
    message?: string;
  }>;
}

const formatMoney = (val: number) =>
  val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const darkenHex = (hex: string) => {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#4F3DF5';
  const r = Math.max(0, parseInt(clean.slice(1, 3), 16) - 24);
  const g = Math.max(0, parseInt(clean.slice(3, 5), 16) - 24);
  const b = Math.max(0, parseInt(clean.slice(5, 7), 16) - 20);
  return `rgb(${r}, ${g}, ${b})`;
};

export const SumioCheckoutCard: React.FC<SumioCheckoutCardProps> = ({
  order,
  planName,
  timeFormatted,
  isDemoMode = false,
  onClose,
  onSimulatePayment,
  simulating = false,
  onSubmitUtr,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [activeRail, setActiveRail] = useState<'RECOMMENDED' | 'UPI_ID' | 'VERIFY_UTR'>('RECOMMENDED');
  const [vpaInput, setVpaInput] = useState('');
  const [vpaStatus, setVpaStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrFeedback, setUtrFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const brandColor =
    order.brandColor && /^#[0-9a-fA-F]{6}$/.test(order.brandColor)
      ? order.brandColor
      : '#4F3DF5';
  const brandDark = darkenHex(brandColor);

  const websiteName =
    order.websiteName ||
    order.metadata?.websiteName ||
    order.merchantName ||
    order.appName ||
    'SumioPay Merchant';

  const bill: CheckoutBillDetails | null =
    order.billDetails || order.metadata?.billDetails || null;

  const paiseOffset =
    typeof order.paiseOffset === 'number'
      ? order.paiseOffset
      : Math.max(0, Number((order.exactAmount - order.baseAmount).toFixed(2)));

  const rawDiscount = bill?.discountAmount || 0;
  const displaySubtotal =
    bill?.subtotal !== undefined
      ? bill.subtotal
      : rawDiscount > 0
      ? Math.max(
          0,
          Number(
            (
              order.baseAmount +
              rawDiscount -
              (bill?.taxAmount || 0) -
              (bill?.platformFee || 0)
            ).toFixed(2)
          )
        )
      : order.baseAmount;

  const displayReturnUrl = order.returnUrl || bill?.returnUrl || order.metadata?.returnUrl || '';
  const initialLetter = websiteName.trim().charAt(0).toUpperCase() || 'S';

  const upiValue =
    order.upiIntentUrl ||
    `upi://pay?pa=${encodeURIComponent(order.upiId)}&pn=${encodeURIComponent(websiteName)}&am=${order.exactAmount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(order.orderId)}`;
  const upiQuery = upiValue.includes('?') ? upiValue.split('?')[1] : '';

  const isMobileBrowser =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const handleCopyUpi = () => {
    if (!order.upiId) return;
    navigator.clipboard.writeText(order.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerifyVpaAndLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = vpaInput.trim();
    if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9]{2,}$/.test(cleaned)) {
      setVpaStatus({
        ok: false,
        text: 'Enter a valid UPI ID (e.g. name@okhdfcbank, phone@ybl)',
      });
      return;
    }
    if (isMobileBrowser) {
      setVpaStatus({
        ok: true,
        text: `UPI handle ${cleaned} verified. Opening UPI app to pay exact ₹${order.exactAmount.toFixed(2)}...`,
      });
      window.location.href = upiValue;
      return;
    }
    setVpaStatus({
      ok: true,
      text: `UPI ID ${cleaned} verified. Scan the QR code above using your UPI app on mobile to pay exact ₹${order.exactAmount.toFixed(2)}, or enter your 12-digit UTR after paying.`,
    });
  };

  const handleVerifyUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrInput.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrFeedback({
        ok: false,
        text: 'Please enter the exact 12-digit numeric UTR / UPI reference number.',
      });
      return;
    }

    if (isDemoMode || !onSubmitUtr) {
      setUtrFeedback({
        ok: true,
        text: 'In live checkouts, this verifies your 12-digit UTR directly against the merchant Android Listener bank feed.',
      });
      return;
    }

    setUtrSubmitting(true);
    setUtrFeedback(null);
    try {
      const result = await onSubmitUtr(cleanUtr);
      setUtrFeedback({
        ok: result.success,
        text:
          result.message ||
          (result.matchedImmediately
            ? 'Payment verified from bank feed!'
            : 'UTR recorded. Auto-confirming once bank notification arrives.'),
      });
    } catch (err: any) {
      setUtrFeedback({
        ok: false,
        text: err?.message || 'Could not verify UTR. Please double check digits.',
      });
    } finally {
      setUtrSubmitting(false);
    }
  };

  const summaryNote =
    bill?.note ||
    (planName
      ? `Paying ${websiteName} for ${planName}. Instant ₹${formatMoney(order.exactAmount)} direct UPI verification with 0% gateway surcharge.`
      : `Paying ${websiteName} directly via SumioPay Zero-MDR UPI Gateway. Order Ref: ${order.orderId}.`);

  const utrRef = order.utrNumber || order.utr;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 bg-white text-slate-900">
      {order.isTest && (
        <div className="bg-amber-400 text-slate-950 font-bold text-[11px] px-4 py-1.5 flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>SANDBOX TEST MODE — No Real Money Is Charged</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* LEFT BRANDED SUMMARY PANEL (Hostinger x Razorpay Style) */}
        <div
          className="md:col-span-5 p-6 sm:p-7 text-white flex flex-col justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(155deg, ${brandColor} 0%, ${brandDark} 100%)`,
          }}
        >
          {/* Decorative Commerce Bags & Discount Vector Graphic */}
          <svg
            viewBox="0 0 240 150"
            className="pointer-events-none select-none absolute -bottom-2 left-2 w-48 opacity-20"
            aria-hidden="true"
          >
            <rect x="22" y="42" width="68" height="84" rx="12" fill="white" />
            <path d="M40 42c0-15 32-15 32 0" stroke="white" strokeWidth="7" fill="none" />
            <circle cx="56" cy="82" r="18" fill="white" fillOpacity="0.28" />
            <text x="56" y="88" textAnchor="middle" fill="white" fontSize="18" fontWeight="900">%</text>
            <rect x="104" y="24" width="76" height="98" rx="12" fill="white" fillOpacity="0.85" />
            <path d="M124 24c0-17 36-17 36 0" stroke="white" strokeWidth="7" fill="none" />
            <rect x="176" y="72" width="44" height="52" rx="8" fill="white" fillOpacity="0.65" />
          </svg>

          <div className="space-y-5 relative z-10">
            {/* Merchant Identity & SumioPay Trusted Business Badge */}
            <div className="flex items-start gap-3.5">
              {order.websiteLogoUrl && !logoFailed ? (
                <img
                  src={order.websiteLogoUrl}
                  alt={websiteName}
                  onError={() => setLogoFailed(true)}
                  className="w-12 h-12 rounded-2xl bg-white p-1.5 object-contain shadow-md shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {initialLetter}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-lg font-extrabold tracking-tight text-white truncate">
                  {websiteName}
                </h2>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/35 border border-white/20 backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-white/95">
                    {order.kycVerified
                      ? 'SumioPay KYC Verified Business'
                      : order.trustLabel || 'SumioPay Trusted Business'}
                  </span>
                </div>
              </div>
            </div>

            {/* White Floating Price Summary Card */}
            <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Price Summary</span>
                <span className="text-[10px] font-mono text-slate-400">{order.orderId}</span>
              </div>

              <div className="text-3xl font-black tracking-tight text-slate-950 tabular-nums">
                ₹{formatMoney(order.exactAmount)}
              </div>

              {/* Optional Itemized Bill / Coupon / Tax Breakdown */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px]">
                {bill?.items && bill.items.length > 0 && (
                  <div className="space-y-1 pb-1.5 border-b border-slate-100">
                    {bill.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-600">
                        <span className="truncate pr-2">
                          {item.label}
                          {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                        </span>
                        <span className="font-mono font-semibold text-slate-800 shrink-0">
                          ₹{formatMoney(item.amount * (item.quantity || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span>{bill?.subtotal !== undefined || rawDiscount > 0 ? 'Bill Subtotal' : (planName || 'Order Amount')}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{formatMoney(displaySubtotal)}
                  </span>
                </div>

                {(bill?.couponCode || rawDiscount > 0) && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Coupon {bill?.couponCode ? `(${bill.couponCode})` : 'Applied'}
                    </span>
                    <span className="font-mono">
                      -₹{formatMoney(rawDiscount)}
                    </span>
                  </div>
                )}

                {bill?.taxAmount !== undefined && bill.taxAmount > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{bill.taxLabel || 'GST / Taxes'}</span>
                    <span className="font-mono font-semibold text-slate-800">
                      +₹{formatMoney(bill.taxAmount)}
                    </span>
                  </div>
                )}

                {bill?.platformFee !== undefined && bill.platformFee > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Convenience Fee</span>
                    <span className="font-mono font-semibold text-slate-800">
                      +₹{formatMoney(bill.platformFee)}
                    </span>
                  </div>
                )}

                {paiseOffset > 0 && (
                  <div className="flex items-center justify-between text-amber-700">
                    <span>Unique Verify Offset</span>
                    <span className="font-mono font-semibold">+₹{paiseOffset.toFixed(2)}</span>
                  </div>
                )}

                {rawDiscount > 0 && (
                  <div className="pt-1.5 mt-1 border-t border-emerald-100 flex items-center justify-between text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg">
                    <span>Total Coupon Savings</span>
                    <span className="font-mono">You save ₹{formatMoney(rawDiscount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Soft Tinted Order Summary Box */}
            <div className="rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm p-3.5 text-xs leading-relaxed text-white/95">
              {summaryNote}
            </div>
          </div>

          {/* Left Footer: Secured by SumioPay */}
          <div className="mt-6 pt-4 flex items-center justify-between text-xs text-white/90 relative z-10">
            <div className="inline-flex items-center gap-1.5 font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Secured by</span>
              <span className="font-black tracking-tight text-white">SumioPay</span>
            </div>
            <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full">
              0% UPI MDR
            </span>
          </div>
        </div>

        {/* RIGHT PAYMENT OPTIONS PANEL */}
        <div className="md:col-span-7 flex flex-col bg-white">
          {/* Top Bar */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Payment Options
            </h3>

            <div className="flex items-center gap-2.5">
              {order.status === 'PENDING' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{timeFormatted}</span>
                </div>
              )}

              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                  aria-label="Close checkout"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : displayReturnUrl ? (
                <a
                  href={displayReturnUrl}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                  title={`Return to ${websiteName}`}
                >
                  <X className="w-4 h-4" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Inner Body */}
          {order.status === 'PAID' ? (
            <div className="p-7 sm:p-10 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider mb-1">
                  Instant Bank Verified
                </span>
                <h4 className="text-xl font-black text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{formatMoney(order.exactAmount)} received directly by {websiteName}.
                </p>
              </div>

              <div className="w-full max-w-sm rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs font-mono space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-bold text-slate-900">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank UTR:</span>
                  <span className="font-bold text-emerald-700">{utrRef || 'Confirmed'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settled Time:</span>
                  <span className="font-bold text-slate-900">
                    {order.paidAt ? new Date(order.paidAt).toLocaleTimeString('en-IN') : 'Just now'}
                  </span>
                </div>
              </div>

              {displayReturnUrl ? (
                <a
                  href={displayReturnUrl}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  Continue to {websiteName}
                </a>
              ) : onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  Done / Continue
                </button>
              ) : null}
            </div>
          ) : order.status === 'EXPIRED' ? (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <h4 className="text-lg font-extrabold text-slate-900">Payment Session Expired</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                The 15-minute unique paise reservation for order {order.orderId} has timed out. Please return to {websiteName} and start a fresh payment.
              </p>
              {displayReturnUrl ? (
                <a
                  href={displayReturnUrl}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Return to {websiteName}
                </a>
              ) : onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Close Window
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
              {/* Method Sidebar Rail */}
              <div className="sm:col-span-4 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/60 p-3 flex sm:flex-col gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveRail('RECOMMENDED')}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold whitespace-nowrap transition ${
                    activeRail === 'RECOMMENDED'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>Recommended</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRail('UPI_ID')}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold whitespace-nowrap transition ${
                    activeRail === 'UPI_ID'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>UPI Apps</span>
                  </span>
                  <span className="hidden lg:inline-flex text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold">
                    0% FEE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRail('VERIFY_UTR')}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold whitespace-nowrap transition ${
                    activeRail === 'VERIFY_UTR'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span>Verify UTR</span>
                  </span>
                </button>
              </div>

              {/* Active Payment View */}
              <div className="sm:col-span-8 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* UPI QR Box in Recommended, or Direct App Launcher Tiles in UPI Apps */}
                  {activeRail === 'RECOMMENDED' && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-800">UPI QR</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pay exact ₹{formatMoney(order.exactAmount)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>{timeFormatted}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                          <QRCodeSVG value={upiValue} size={148} level="M" />
                        </div>

                        <div className="text-center sm:text-left space-y-2.5">
                          <p className="text-xs font-medium text-slate-600">
                            Scan the QR using any UPI App
                          </p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                            {[
                              { name: 'GPay', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                              { name: 'PhonePe', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                              { name: 'Paytm', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
                              { name: 'BHIM', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
                              { name: 'CRED', bg: 'bg-slate-900 text-white border-slate-800' },
                            ].map((app) => (
                              <span
                                key={app.name}
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${app.bg}`}
                              >
                                {app.name}
                              </span>
                            ))}
                          </div>

                          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <a
                              href={upiValue}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>Open UPI App</span>
                              <ExternalLink className="w-3 h-3 opacity-75" />
                            </a>

                            <button
                              type="button"
                              onClick={handleCopyUpi}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-mono text-slate-700 transition"
                              title="Copy Destination UPI ID"
                            >
                              {copiedUpi ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-500" />
                              )}
                              <span>{copiedUpi ? 'Copied!' : order.upiId}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRail === 'UPI_ID' && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-800">
                          1-Tap UPI App Launch (Mobile)
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          0% UPI Fee
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Google Pay', href: upiQuery ? `tez://upi/pay?${upiQuery}` : upiValue, badge: 'GPay' },
                          { label: 'PhonePe', href: upiQuery ? `phonepe://pay?${upiQuery}` : upiValue, badge: 'PhonePe' },
                          { label: 'Paytm', href: upiQuery ? `paytmmp://pay?${upiQuery}` : upiValue, badge: 'Paytm' },
                          { label: 'Any UPI App', href: upiValue, badge: 'BHIM / CRED' },
                        ].map((app) => (
                          <a
                            key={app.label}
                            href={app.href}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-xs font-bold text-slate-800 transition"
                          >
                            <span>{app.label}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                        <span>Destination VPA:</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 font-mono text-slate-800 hover:bg-slate-100"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedUpi ? 'Copied!' : order.upiId}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Box: Pay with UPI ID OR Submit 12-Digit UTR */}
                  {activeRail !== 'VERIFY_UTR' ? (
                    <form
                      onSubmit={handleVerifyVpaAndLaunch}
                      className="rounded-2xl border border-slate-200/90 p-4 space-y-2.5 bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-800">
                          Pay with UPI ID / App Link
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveRail('VERIFY_UTR')}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline"
                        >
                          Paid already? Enter UTR
                        </button>
                      </div>

                      <input
                        type="text"
                        value={vpaInput}
                        onChange={(e) => {
                          setVpaInput(e.target.value);
                          setVpaStatus(null);
                        }}
                        placeholder="example@okhdfcbank"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />

                      {vpaStatus && (
                        <p
                          className={`text-[11px] font-semibold ${
                            vpaStatus.ok ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {vpaStatus.text}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold transition shadow-sm"
                      >
                        Verify and Pay ₹{formatMoney(order.exactAmount)}
                      </button>
                    </form>
                  ) : (
                    <form
                      onSubmit={handleVerifyUtrSubmit}
                      className="rounded-2xl border border-slate-200/90 p-4 space-y-3 bg-slate-50/50"
                    >
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">
                          Already Paid ₹{formatMoney(order.exactAmount)}? Verify 12-Digit UTR
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Paste the 12-digit UPI Reference / UTR from Google Pay, PhonePe, or Paytm to match directly with {websiteName}&apos;s bank listener feed.
                        </p>
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={utrInput}
                        onChange={(e) => {
                          setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12));
                          setUtrFeedback(null);
                        }}
                        placeholder="e.g. 432198765432"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />

                      {utrFeedback && (
                        <div
                          className={`p-2.5 rounded-xl text-[11px] font-semibold ${
                            utrFeedback.ok
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {utrFeedback.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={utrSubmitting}
                        className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition"
                      >
                        {utrSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{utrSubmitting ? 'Checking Bank Feed...' : 'Verify UTR & Confirm'}</span>
                      </button>
                    </form>
                  )}

                  {/* Test / Sandbox Instant Pay Button */}
                  {(order.isTest || isDemoMode) && onSimulatePayment && (
                    <button
                      type="button"
                      onClick={onSimulatePayment}
                      disabled={simulating}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      {simulating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Simulate Instant Payment (Test Mode)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Live Polling Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-medium">Listening for instant bank confirmation...</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">UPI Auto-Match</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SumioCheckoutCard;

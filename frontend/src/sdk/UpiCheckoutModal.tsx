import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  X,
  Loader2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string; // e.g. 'SUMIOLAB' | 'SUMIOBILLING' | 'SUMIOBOOK' | 'SUMIOJEWEL'
  userId: string;
  planName: string;
  baseAmount: number;
  customerPhone?: string;
  customerEmail?: string;
  callbackWebhookUrl?: string;
  apiUrl?: string; // Default: auto-detected origin /api
  apiKey?: string;
  demoMode?: boolean;
  onSuccess?: (paymentData: {
    orderId: string;
    amount: number;
    utr?: string;
    appName: string;
  }) => void;
}

interface OrderData {
  orderId: string;
  appName: string;
  baseAmount: number;
  paiseOffset: number;
  exactAmount: number;
  currency: string;
  upiId: string;
  merchantName: string;
  upiIntentUrl: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  expiresAt: string;
  ttlSeconds: number;
}

export const UpiCheckoutModal: React.FC<UpiCheckoutModalProps> = ({
  isOpen,
  onClose,
  appName,
  userId,
  planName,
  baseAmount,
  customerPhone,
  customerEmail,
  callbackWebhookUrl,
  apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.origin}/api`
    : 'http://localhost:8090/api',
  apiKey,
  demoMode = false,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [verifiedUtr, setVerifiedUtr] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setOrder(null);
      setIsPaid(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const initOrder = async () => {
      if (demoMode) {
        const exactAmount = Number((baseAmount + 0.42).toFixed(2));
        const demoId = `ORD-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
        const upiIntentUrl = `upi://pay?pa=sumiotech@upi&pn=${encodeURIComponent('SumioTech Preview')}&am=${exactAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(demoId)}`;
        setOrder({
          orderId: demoId,
          appName,
          baseAmount,
          paiseOffset: 0.42,
          exactAmount,
          currency: 'INR',
          upiId: 'sumiotech@upi',
          merchantName: 'SumioTech Preview',
          upiIntentUrl,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          ttlSeconds: 900,
        });
        setTimeLeft(900);
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        }

        const res = await fetch(`${apiUrl}/order/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            appName,
            baseAmount,
            customerUserId: userId,
            customerPhone,
            customerEmail,
            callbackWebhookUrl,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || json.error?.message || 'Failed to generate UPI order');
        }

        if (isMounted) {
          setOrder(json.data);
          const expiresDate = new Date(json.data.expiresAt).getTime();
          const secondsDiff = Math.max(0, Math.floor((expiresDate - Date.now()) / 1000));
          setTimeLeft(secondsDiff || 900);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Payment initiation failed');
          setLoading(false);
        }
      }
    };

    initOrder();

    return () => {
      isMounted = false;
    };
  }, [isOpen, appName, baseAmount, userId, apiUrl, apiKey, demoMode]);

  // Countdown timer
  useEffect(() => {
    if (!order || isPaid || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order, isPaid, timeLeft]);

  // Polling loop (skipped in interactive preview demoMode)
  useEffect(() => {
    if (!order || isPaid || timeLeft <= 0 || demoMode) return;

    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/order/status/${order.orderId}`);
        const data = await res.json();

        if (data.success && data.data?.status === 'PAID') {
          if (!isCancelled) {
            setIsPaid(true);
            setVerifiedUtr(data.data.utr || '');

            try {
              confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
            } catch (e) {}

            if (onSuccess) {
              onSuccess({
                orderId: order.orderId,
                amount: order.exactAmount,
                utr: data.data.utr,
                appName: order.appName,
              });
            }
          }
        }
      } catch (e) {}
    };

    const pollTimer = setInterval(checkStatus, 2500);

    return () => {
      isCancelled = true;
      clearInterval(pollTimer);
    };
  }, [order, isPaid, timeLeft, apiUrl, onSuccess]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/sumiopay-icon.png" alt="SumioPay" className="w-8 h-8 rounded-xl shadow-sm object-contain" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                UPI Instant Checkout
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold border border-blue-200">
                  {appName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">{planName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Reserving unique UPI amount...</p>
              <p className="text-xs text-slate-400">Zero collision guarantee</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Payment Error</h4>
              <p className="text-xs text-slate-500 max-w-xs">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close Window
              </button>
            </div>
          ) : isPaid ? (
            <div className="flex flex-col items-center text-center py-6 gap-3 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Auto Verified
                </span>
                <h4 className="text-xl font-extrabold text-slate-900">Payment Confirmed!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{order?.exactAmount.toFixed(2)} received and credited.
                </p>
              </div>

              {verifiedUtr && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Bank UTR Reference:</span>
                  <span className="font-mono font-bold text-emerald-700">{verifiedUtr}</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Continue / Done
              </button>
            </div>
          ) : timeLeft <= 0 ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Order Expired</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                The 15-minute verification window has expired. Please create a fresh order.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              {/* Exact Amount Display */}
              <div className="text-center mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                  Exact Amount to Pay
                </div>
                <div className="text-4xl font-black text-slate-950 tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-blue-600 font-bold text-3xl">₹</span>
                  {order?.exactAmount.toFixed(2)}
                </div>
                <div className="mt-1.5 flex items-center justify-center">
                  <span className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Pay exact ₹{order?.exactAmount.toFixed(2)} with paise!
                  </span>
                </div>
              </div>

              {/* Dynamic QR Code Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200 mb-4 shadow-subtle">
                {order?.upiIntentUrl && (
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200">
                    <QRCodeSVG
                      value={order.upiIntentUrl}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                )}
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Scan with GPay, PhonePe, Paytm, or BHIM
                </div>
              </div>

              {/* Mobile Deep Link Button */}
              {order?.upiIntentUrl && (
                <a
                  href={order.upiIntentUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm mb-3"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay Directly in UPI App
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}

              {/* UPI ID Copy Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Merchant UPI VPA</div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {order?.upiId}
                  </div>
                </div>
                <button
                  onClick={() => order?.upiId && copyToClipboard(order.upiId)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-subtle"
                >
                  <Copy className="w-3 h-3 text-slate-500" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Interactive Preview Simulate Credit Button (demoMode only) */}
              {demoMode && order && (
                <button
                  type="button"
                  onClick={() => {
                    const utr = `4321${Math.floor(10000000 + Math.random() * 89999999)}`;
                    setVerifiedUtr(utr);
                    setIsPaid(true);
                    try {
                      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    } catch {}
                  }}
                  className="w-full mb-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Bank Credit (₹{order.exactAmount.toFixed(2)})</span>
                </button>
              )}

              {/* Footer Timer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-mono font-bold text-amber-700">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{timeFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span className="text-[11px] font-medium">Listening for bank SMS...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpiCheckoutModal;

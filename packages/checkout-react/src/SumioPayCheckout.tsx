import React, { useState, useEffect, useRef } from 'react';

export interface CustomerInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface SumioPayCheckoutProps {
  merchantId: string;
  projectId?: string;
  orderId: string;
  amount: number; // in Rupees, e.g. 499.00
  currency?: string;
  customer?: CustomerInfo;
  apiBaseUrl?: string; // Default: 'https://pay.sumiotech.com' or custom
  onSuccess?: (data: { orderId: string; utr?: string; amount: number }) => void;
  onPending?: (data: { orderId: string; status: string }) => void;
  onFailure?: (error: { code: string; message: string }) => void;
  onExpiry?: () => void;
  theme?: 'light' | 'dark';
}

export interface OrderStatusPayload {
  orderId: string;
  status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  utr?: string;
  paidAt?: string;
}

export const SumioPayCheckout: React.FC<SumioPayCheckoutProps> = ({
  merchantId,
  projectId,
  orderId,
  amount,
  currency = 'INR',
  customer,
  apiBaseUrl = '',
  onSuccess,
  onPending,
  onFailure,
  onExpiry,
  theme = 'light',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes default
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  const baseUrl = apiBaseUrl.replace(/\/+$/, '');

  // 1. Fetch Order Details
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/api/v1/payments/orders/${orderId}`);
        if (!res.ok) {
          throw new Error(`Failed to load order: HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.success && json.data) {
          if (!isMounted) return;
          setOrderData(json.data);
          setCurrentStatus(json.data.status);

          if (json.data.expiresAt) {
            const diff = Math.max(0, Math.floor((new Date(json.data.expiresAt).getTime() - Date.now()) / 1000));
            setSecondsRemaining(diff);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        onFailure?.({ code: 'LOAD_ERROR', message: err.message });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, baseUrl]);

  // 2. Countdown Timer
  useEffect(() => {
    if (currentStatus === 'PAID' || currentStatus === 'EXPIRED') return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCurrentStatus('EXPIRED');
          onExpiry?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentStatus, onExpiry]);

  // 3. Fast Status Polling Fallback
  useEffect(() => {
    if (currentStatus === 'PAID' || currentStatus === 'EXPIRED' || currentStatus === 'CANCELLED') {
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/v1/payments/orders/${orderId}/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const status = json.data.status;
            if (status !== currentStatus) {
              setCurrentStatus(status);
              if (status === 'PAID') {
                clearInterval(pollRef.current);
                onSuccess?.({
                  orderId,
                  utr: json.data.utr,
                  amount: json.data.amount,
                });
              } else if (status === 'EXPIRED') {
                clearInterval(pollRef.current);
                onExpiry?.();
              } else if (status === 'PENDING') {
                onPending?.({ orderId, status });
              }
            }
          }
        }
      } catch (e) {
        // network retry
      }
    }, 2500);

    return () => clearInterval(pollRef.current);
  }, [orderId, currentStatus, baseUrl, onSuccess, onExpiry, onPending]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`p-8 rounded-2xl flex flex-col items-center justify-center min-h-[360px] ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Securing checkout session...</p>
      </div>
    );
  }

  if (currentStatus === 'PAID') {
    return (
      <div className={`p-8 rounded-2xl text-center shadow-lg border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-1">Payment Successful!</h3>
        <p className="text-xs text-slate-500 mb-4">Thank you. Your transaction has been verified.</p>
        <div className={`p-4 rounded-xl text-left text-xs space-y-1 mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div className="flex justify-between">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-mono font-bold">{orderId}</span>
          </div>
          {orderData?.utrNumber && (
            <div className="flex justify-between">
              <span className="text-slate-400">Bank UTR:</span>
              <span className="font-mono font-bold">{orderData.utrNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Amount Paid:</span>
            <span className="font-bold text-emerald-600">₹{(orderData?.exactAmount || amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (currentStatus === 'EXPIRED') {
    return (
      <div className={`p-8 rounded-2xl text-center shadow-lg border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-1">Payment Window Expired</h3>
        <p className="text-xs text-slate-500 mb-4">The dynamic amount allocation for this order has timed out. Please initiate a new payment.</p>
      </div>
    );
  }

  const exactAmount = orderData?.exactAmount || amount;
  const upiIntent = orderData?.upiIntentUrl || '';

  return (
    <div className={`w-full max-w-md mx-auto p-6 rounded-2xl shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">SumioPay Direct Checkout</span>
          <h2 className="text-lg font-bold">UPI Auto-Verification</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeFormatted}
        </div>
      </div>

      {/* Amount Callout */}
      <div className="text-center py-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl mb-5 border border-blue-100 dark:border-blue-900">
        <span className="text-xs text-slate-500 dark:text-slate-400">Exact Payable Amount</span>
        <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 tracking-tight">
          ₹{exactAmount.toFixed(2)}
        </div>
        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          Pay exact paise for instantaneous automated verification
        </span>
      </div>

      {/* Quick Launch Buttons for Mobile */}
      {upiIntent && (
        <div className="mb-5 block sm:hidden">
          <a
            href={upiIntent}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
          >
            <span>Open in Any UPI App (GPay/PhonePe/Paytm)</span>
          </a>
        </div>
      )}

      {/* Payment Details Accordion / Copy */}
      <div className="space-y-2 mb-5 text-xs">
        {orderData?.upiId && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 block">UPI ID</span>
              <span className="font-mono font-bold">{orderData.upiId}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(orderData.upiId, 'upiId')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-700 border shadow-xs"
            >
              {copiedField === 'upiId' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block">Exact Amount</span>
            <span className="font-mono font-bold">₹{exactAmount.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(exactAmount.toFixed(2), 'amount')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-700 border shadow-xs"
          >
            {copiedField === 'amount' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span>Awaiting verified banking confirmation...</span>
      </div>
    </div>
  );
};

export default SumioPayCheckout;

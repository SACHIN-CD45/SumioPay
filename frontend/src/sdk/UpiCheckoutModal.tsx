import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  SumioCheckoutCard,
  CheckoutBillDetails,
  CheckoutOrderPayload,
} from '../components/checkout/SumioCheckoutCard';

export interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  userId: string;
  planName: string;
  baseAmount: number;
  customerPhone?: string;
  customerEmail?: string;
  callbackWebhookUrl?: string;
  websiteName?: string;
  websiteLogoUrl?: string;
  brandColor?: string;
  billDetails?: CheckoutBillDetails;
  returnUrl?: string;
  metadata?: Record<string, any>;
  apiUrl?: string;
  apiKey?: string;
  demoMode?: boolean;
  onSuccess?: (paymentData: {
    orderId: string;
    amount: number;
    utr?: string;
    appName: string;
  }) => void;
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
  websiteName,
  websiteLogoUrl,
  brandColor,
  billDetails,
  returnUrl,
  metadata,
  apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.origin}/api`
    : 'http://localhost:8090/api',
  apiKey,
  demoMode = false,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CheckoutOrderPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900);

  useEffect(() => {
    if (!isOpen) {
      setOrder(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const initOrder = async () => {
      if (demoMode) {
        const computedBase =
          billDetails?.subtotal !== undefined && baseAmount <= 0
            ? Math.max(
                1,
                billDetails.subtotal +
                  (billDetails.taxAmount || 0) +
                  (billDetails.platformFee || 0) -
                  (billDetails.discountAmount || 0)
              )
            : baseAmount;
        const exactAmount = Number((computedBase + 0.42).toFixed(2));
        const demoId = `ORD-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
        const resolvedSite = websiteName || 'SumioLab Demo';
        const upiIntentUrl = `upi://pay?pa=sumiotech@upi&pn=${encodeURIComponent(resolvedSite)}&am=${exactAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(demoId)}`;
        setOrder({
          orderId: demoId,
          appName,
          baseAmount: computedBase,
          paiseOffset: 0.42,
          exactAmount,
          upiId: 'sumiotech@upi',
          merchantName: resolvedSite,
          websiteName: resolvedSite,
          websiteLogoUrl,
          brandColor: brandColor || '#4F3DF5',
          trustedBusiness: true,
          trustLabel: 'SumioPay Trusted Business',
          billDetails: billDetails || null,
          returnUrl,
          upiIntentUrl,
          status: 'PENDING',
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

        const mergedBill = billDetails
          ? { ...billDetails, ...(returnUrl ? { returnUrl } : {}) }
          : returnUrl
          ? { returnUrl }
          : undefined;

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
            websiteName,
            websiteLogoUrl,
            brandColor,
            billDetails: mergedBill,
            metadata: {
              ...(metadata || {}),
              planName,
            },
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

  useEffect(() => {
    if (!order || order.status === 'PAID' || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [order, timeLeft]);

  useEffect(() => {
    if (!order || order.status === 'PAID' || timeLeft <= 0 || demoMode) return;

    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/order/status/${order.orderId}`);
        const data = await res.json();

        if (data.success && data.data?.status === 'PAID') {
          if (!isCancelled) {
            setOrder((prev) => ({ ...(prev || {}), ...data.data, status: 'PAID' }));
            try {
              confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
            } catch {}

            if (onSuccess) {
              onSuccess({
                orderId: order.orderId,
                amount: data.data.exactAmount || order.exactAmount,
                utr: data.data.utrNumber || data.data.utr,
                appName: order.appName || appName,
              });
            }
          }
        }
      } catch {}
    };

    const pollTimer = setInterval(checkStatus, 2500);
    return () => {
      isCancelled = true;
      clearInterval(pollTimer);
    };
  }, [order, timeLeft, apiUrl, onSuccess, demoMode, appName]);

  const handleSubmitUtr = async (utrNumber: string) => {
    if (!order) return { success: false, message: 'No active order' };
    try {
      const res = await fetch(`${apiUrl}/order/submit-utr/${order.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utrNumber }),
      });
      const data = await res.json();
      if (data.matchedImmediately && data.data) {
        setOrder((prev) => ({ ...(prev || {}), ...data.data, status: 'PAID' }));
        try {
          confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
        } catch {}
        if (onSuccess) {
          onSuccess({
            orderId: order.orderId,
            amount: data.data.exactAmount || order.exactAmount,
            utr: data.data.utrNumber || utrNumber,
            appName: order.appName || appName,
          });
        }
      }
      return {
        success: Boolean(data.success),
        matchedImmediately: Boolean(data.matchedImmediately),
        message: data.message,
      };
    } catch {
      return { success: false, message: 'Network error while verifying UTR' };
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl my-auto">
        {loading ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-10 shadow-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-900">
            <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-slate-800">Preparing Trusted Checkout...</p>
            <p className="text-xs text-slate-500">Allocating zero-collision UPI settlement</p>
          </div>
        ) : error || !order ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 text-center space-y-3 text-slate-900 relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Checkout Unavailable</h4>
            <p className="text-xs text-slate-500">{error || 'Unable to load payment details'}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl"
            >
              Close Window
            </button>
          </div>
        ) : (
          <SumioCheckoutCard
            order={{ ...order, status: timeLeft <= 0 && order.status === 'PENDING' ? 'EXPIRED' : order.status }}
            planName={planName}
            timeFormatted={timeFormatted}
            isDemoMode={demoMode}
            onClose={onClose}
            onSubmitUtr={handleSubmitUtr}
            onSimulatePayment={
              demoMode
                ? () => {
                    const utr = `4321${Math.floor(10000000 + Math.random() * 89999999)}`;
                    setOrder((prev) =>
                      prev ? { ...prev, status: 'PAID', utrNumber: utr, utr } : prev
                    );
                    try {
                      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    } catch {}
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
};

export default UpiCheckoutModal;

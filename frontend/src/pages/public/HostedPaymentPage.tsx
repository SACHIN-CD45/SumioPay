import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { AlertCircle, Loader2 } from 'lucide-react';
import { publicApi, api } from '../../lib/api';
import { SumioCheckoutCard, CheckoutOrderPayload } from '../../components/checkout/SumioCheckoutCard';

export const HostedPaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<CheckoutOrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(900);

  useEffect(() => {
    if (!orderId) {
      setError('Invalid payment link. Missing order identifier.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await publicApi.get(`/order/status/${orderId}`);
        if (res.data.success && res.data.data) {
          setOrder(res.data.data);
          if (res.data.data.expiresAt) {
            const remaining = Math.max(
              0,
              Math.floor((new Date(res.data.data.expiresAt).getTime() - Date.now()) / 1000)
            );
            setTimeLeft(remaining);
          }
        } else {
          setError(res.data.message || 'Payment order not found or expired.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not load payment order.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !order || order.status === 'PAID' || order.status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      try {
        const res = await publicApi.get(`/order/status/${orderId}`);
        if (res.data.success && res.data.data) {
          if (res.data.data.status === 'PAID') {
            setOrder(res.data.data);
            clearInterval(interval);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          } else if (res.data.data.status === 'EXPIRED') {
            setOrder(res.data.data);
            clearInterval(interval);
          }
        }
      } catch {
        // Polling fallback
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId, order]);

  useEffect(() => {
    if (timeLeft <= 0 || order?.status === 'PAID') return;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, order]);

  const handleSimulatePayment = async () => {
    if (!orderId) return;
    setSimulating(true);
    try {
      const res = await api.post(`/order/sandbox-simulate-payment/${orderId}`);
      if (res.data.success) {
        setOrder((prev) => ({ ...(prev || {}), ...res.data.data }));
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } else {
        alert(res.data.message || 'Simulation failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Simulator requires merchant session or valid API key.');
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmitUtr = async (utrNumber: string) => {
    if (!orderId) {
      return { success: false, message: 'Missing order identifier' };
    }
    try {
      const res = await publicApi.post(`/order/submit-utr/${orderId}`, { utrNumber });
      if (res.data?.matchedImmediately && res.data?.data) {
        setOrder((prev) => ({ ...(prev || {}), ...res.data.data, status: 'PAID' }));
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }
      return {
        success: Boolean(res.data?.success),
        matchedImmediately: Boolean(res.data?.matchedImmediately),
        message: res.data?.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Unable to verify UTR right now.',
      };
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-slate-600 text-xs font-semibold">Loading SumioPay Trusted Checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Payment Link Unavailable</h2>
          <p className="text-xs text-slate-500">{error || 'This order could not be located.'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Go to SumioPay Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200/70 flex flex-col justify-center py-8 px-3 sm:px-6">
      <SumioCheckoutCard
        order={order}
        planName={order.metadata?.planName || order.appName}
        timeFormatted={formattedTime}
        onSimulatePayment={handleSimulatePayment}
        simulating={simulating}
        onSubmitUtr={handleSubmitUtr}
      />

      <div className="text-center text-[11px] text-slate-500 mt-5">
        &copy; {new Date().getFullYear()} SumioTech &bull; Direct 0% Fee UPI Gateway
      </div>
    </div>
  );
};

export default HostedPaymentPage;

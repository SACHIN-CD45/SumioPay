import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Zap,
  Building,
} from 'lucide-react';
import { publicApi, api } from '../../lib/api';

export const HostedPaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins default

  // Fetch Order Details
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
          // Calculate remaining seconds
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

  // Polling for automated payment confirmation
  useEffect(() => {
    if (!orderId || !order || order.status === 'PAID' || order.status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      try {
        const res = await publicApi.get(`/order/status/${orderId}`);
        if (res.data.success && res.data.data) {
          if (res.data.data.status === 'PAID') {
            setOrder(res.data.data);
            clearInterval(interval);
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } else if (res.data.data.status === 'EXPIRED') {
            setOrder(res.data.data);
            clearInterval(interval);
          }
        }
      } catch (e) {
        // Polling failure silent fallback
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId, order]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || order?.status === 'PAID') return;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, order]);

  const copyUpi = () => {
    if (order?.upiId) {
      navigator.clipboard.writeText(order.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // Developer Test Mode 1-Click Payment Simulator
  const handleSimulatePayment = async () => {
    if (!orderId) return;
    setSimulating(true);
    try {
      const res = await api.post(`/order/sandbox-simulate-payment/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.data);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        alert(res.data.message || 'Simulation failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Simulator requires merchant session or valid API key.');
    } finally {
      setSimulating(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 text-xs font-semibold">Generating Secure UPI Intent...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Payment Link Unavailable</h2>
          <p className="text-xs text-slate-500">{error || 'This order could not be located.'}</p>
          <button
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
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-between py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden relative">
        {/* Test Mode Banner */}
        {order.isTest && (
          <div className="bg-amber-500 text-slate-950 font-bold text-[11px] px-4 py-1.5 text-center flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>DEVELOPER TEST MODE — No Real Money Deducted</span>
          </div>
        )}

        {/* Merchant & Order Header */}
        <div className="p-6 bg-slate-900 text-white text-center space-y-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-blue-300 font-semibold uppercase tracking-wider">
            <Building className="w-3 h-3" />
            <span>{order.merchantName || 'Verified Merchant'}</span>
          </div>

          <div className="text-3xl font-black tracking-tight font-mono text-white">
            ₹{order.exactAmount?.toFixed(2)}
          </div>

          <p className="text-xs text-slate-300">
            Order Ref: <span className="font-mono font-bold text-white">{order.orderId}</span>
          </p>

          {order.status === 'PENDING' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-[11px] text-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Expires in {formattedTime}</span>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {order.status === 'PAID' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Confirmed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  100% Direct Bank Settlement completed successfully.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank UTR Ref:</span>
                  <span className="font-bold text-slate-900">{order.utrNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-600">₹{order.exactAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid At:</span>
                  <span className="font-bold text-slate-900">
                    {order.paidAt ? new Date(order.paidAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
            </div>
          ) : order.status === 'EXPIRED' ? (
            <div className="text-center py-6 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Payment Order Expired</h3>
              <p className="text-xs text-slate-500">
                The 15-minute unique paise reservation for this order has timed out. Please initiate a new payment.
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic QR Code */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <QRCodeSVG
                    value={order.upiIntentUrl || `upi://pay?pa=${order.upiId}&am=${order.exactAmount}&tr=${order.orderId}`}
                    size={180}
                    level="M"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app
                </p>
              </div>

              {/* Mobile UPI Intent Button */}
              <a
                href={order.upiIntentUrl}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition text-center"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay ₹{order.exactAmount?.toFixed(2)} via UPI App</span>
              </a>

              {/* Merchant UPI ID Copy */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 text-[11px]">UPI VPA:</span>
                <span className="font-bold text-slate-900">{order.upiId}</span>
                <button
                  type="button"
                  onClick={copyUpi}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                  title="Copy UPI VPA"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Developer Test Simulator Button (In Test Mode) */}
              {order.isTest && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    {simulating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Simulate Instant Payment (Developer Test)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Security Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Direct Bank Settlement</span>
          </div>
          <span className="font-bold text-slate-700">Powered by SumioPay</span>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-6">
        &copy; {new Date().getFullYear()} SumioTech &bull; 0% Fee UPI Gateway
      </div>
    </div>
  );
};

export default HostedPaymentPage;

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Cpu, Zap, CheckCircle2, AlertTriangle, ArrowRight, Smartphone } from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const [bankType, setBankType] = useState('PHONEPE');
  const [amount, setAmount] = useState('499.42');
  const [utr, setUtr] = useState('432109876543');
  const [senderName, setSenderName] = useState('Simulated Customer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const bankTemplates: Record<string, { pkg: string; title: string; template: (amt: string, ref: string, name: string) => string }> = {
    PHONEPE: {
      pkg: 'com.phonepe.app',
      title: 'PhonePe',
      template: (amt, ref, name) => `Payment of Rs. ${amt} received from ${name} via UPI. UPI Ref: ${ref}.`,
    },
    PAYTM: {
      pkg: 'net.one97.paytm',
      title: 'Paytm Business',
      template: (amt, ref, name) => `Received Rs ${amt} from ${name} on Paytm QR. Ref no ${ref}`,
    },
    GPAY: {
      pkg: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay',
      template: (amt, ref, name) => `${name} paid you ₹${amt} via Google Pay. UPI transaction ID ${ref}.`,
    },
    HDFC: {
      pkg: 'com.snapwork.hdfc',
      title: 'HDFC Bank Alert',
      template: (amt, ref, name) => `Dear Customer, A/c *8912 credited with INR ${amt} on ${new Date().toLocaleDateString()} by ${name} via UPI Ref ${ref}.`,
    },
    SBI: {
      pkg: 'com.sbi.upi',
      title: 'SBI UPI',
      template: (amt, ref, name) => `Your a/c no. XX4321 is credited by Rs.${amt} on ${new Date().toLocaleDateString()} by UPI/P2A/${ref}/${name}.`,
    },
  };

  const currentTemplate = bankTemplates[bankType];
  const generatedMessage = currentTemplate.template(amount, utr, senderName);

  const handleSimulatePush = async () => {
    try {
      setLoading(true);
      setResult(null);

      const res = await api.post('/webhook/simulate-push', {
        message: generatedMessage,
        package_name: currentTemplate.pkg,
        title: currentTemplate.title,
      });

      setResult(res.data);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto text-xs">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          UPI Payment Alert Simulator
        </h1>
        <p className="text-slate-500 mt-1">
          Test your end-to-end auto-verification pipeline without spending real money. Emulates the Android NotificationListenerService push.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Select Bank / UPI App</label>
            <select
              value={bankType}
              onChange={(e) => setBankType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium shadow-subtle"
            >
              <option value="PHONEPE">PhonePe Push Notification</option>
              <option value="PAYTM">Paytm Soundbox / Push</option>
              <option value="GPAY">Google Pay for Business</option>
              <option value="HDFC">HDFC Bank SMS Alert</option>
              <option value="SBI">SBI Bank SMS Alert</option>
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Exact Amount with Paise (Must match active pending order)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 499.42"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono shadow-subtle"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Simulated 12-Digit UTR</label>
            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="432109876543"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono shadow-subtle"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Sender Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Rajesh Kumar"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 shadow-subtle"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-500 font-medium block mb-1">Preview of Intercepted Notification</label>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 text-[11px] leading-relaxed">
            {generatedMessage}
          </div>
        </div>

        <button
          onClick={handleSimulatePush}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          {loading ? 'Processing via Regex Engine...' : 'Simulate Bank Credit Notification'}
        </button>
      </div>

      {result && (
        <div
          className={`p-6 rounded-3xl border text-xs space-y-2 ${
            result.matched
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="text-sm font-bold flex items-center gap-2">
            {result.matched ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {result.matched ? 'Payment Successfully Auto-Verified!' : 'Notification Intercepted (No Order Matched)'}
          </div>
          <p className="opacity-90">{result.message}</p>
          {result.orderId && (
            <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg text-slate-800 border border-slate-200">
              Verified Order: <span className="text-emerald-700 font-bold">{result.orderId}</span> • App: {result.appName} • Amount: ₹{result.amount}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimulatorPage;

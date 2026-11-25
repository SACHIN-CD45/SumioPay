import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';

export const WebhooksPage: React.FC = () => {
  const [merchant, setMerchant] = useState<any>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/merchant/profile');
      if (res.data.success) {
        setMerchant(res.data.data);
        setWebhookUrl(res.data.data.webhookUrl || '');
      }
      const logsRes = await api.get('/webhook/logs');
      if (logsRes.data.success) {
        setLogs(logsRes.data.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveWebhook = async () => {
    try {
      setSaving(true);
      await api.put('/merchant/profile', { webhookUrl });
      alert('Webhook URL updated successfully!');
      fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to update webhook URL');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post('/webhook/test-dispatch', { targetUrl: webhookUrl });
      setTestResult(res.data);
      fetchProfile();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    alert('Copied to clipboard!');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-xs">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-blue-600" />
          API Credentials & Webhooks
        </h1>
        <p className="text-slate-500 mt-1">
          Use these credentials to integrate SumioPay with SumioLab, SumioBilling, or any custom SaaS backend.
        </p>
      </div>

      {/* API Keys Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-5">
        <h2 className="text-sm font-bold text-slate-900">Live API Authentication Keys</h2>

        <div className="space-y-4">
          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              Live API Publishable Key (Header: <span className="font-mono text-blue-600">x-api-key</span>)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={merchant?.apiKey || 'sp_live_...'}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 text-xs shadow-subtle"
              />
              <button
                onClick={() => copy(merchant?.apiKey)}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1 font-semibold shadow-subtle"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              API Secret Key (Keep private on your backend server)
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={merchant?.apiSecret || '••••••••••••••••••••••••••••••••••••'}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 text-xs shadow-subtle"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1 shadow-subtle"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => copy(merchant?.apiSecret)}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1 font-semibold shadow-subtle"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              Webhook HMAC-SHA256 Signing Secret
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={merchant?.webhookSecret || 'sp_whsec_...'}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 text-xs shadow-subtle"
              />
              <button
                onClick={() => copy(merchant?.webhookSecret)}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1 font-semibold shadow-subtle"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Endpoint Settings */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Callback Webhook Destination</h2>
        <p className="text-slate-500">
          When an order is marked PAID by the Android listener, SumioPay sends a secure signed POST request to this URL.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-domain.com/api/payment/webhook"
            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-subtle"
          />
          <button
            onClick={handleSaveWebhook}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm"
          >
            {saving ? 'Saving...' : 'Save URL'}
          </button>
          <button
            onClick={handleTestDispatch}
            disabled={testing || !webhookUrl}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-semibold rounded-xl transition flex items-center gap-2 shadow-subtle"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            {testing ? 'Sending...' : 'Send Test Ping'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              {testResult.message}
            </div>
            {testResult.destinationUrl && (
              <div className="font-mono text-[11px] opacity-80">Target: {testResult.destinationUrl}</div>
            )}
          </div>
        )}
      </div>

      {/* Webhook Delivery Audit Logs */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-subtle space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Recent Webhook Deliveries</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                <th className="py-3 px-3 font-semibold">Timestamp</th>
                <th className="py-3 px-3 font-semibold">Order ID</th>
                <th className="py-3 px-3 font-semibold">Destination URL</th>
                <th className="py-3 px-3 font-semibold">HTTP Status</th>
                <th className="py-3 px-3 font-semibold">Delivered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="py-3 px-3 text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 text-slate-900 font-bold font-mono">{log.orderId}</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-xs">{log.url}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.responseStatus >= 200 && log.responseStatus < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.responseStatus || 'FAILED'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {log.delivered ? (
                      <span className="text-emerald-700 font-semibold">YES</span>
                    ) : (
                      <span className="text-rose-600 font-semibold">NO</span>
                    )}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No webhooks dispatched yet. Click "Send Test Ping" above to test.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WebhooksPage;

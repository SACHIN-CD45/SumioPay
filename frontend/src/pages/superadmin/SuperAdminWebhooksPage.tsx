import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Webhook,
  AlertTriangle,
} from 'lucide-react';

interface WebhookLogRow {
  _id: string;
  merchantId?: {
    _id: string;
    businessName?: string;
    email?: string;
  };
  orderId: string;
  url: string;
  payload?: {
    id?: string;
    type?: string;
    created_at?: string;
    data?: Record<string, any>;
  };
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attempt: number;
  delivered: boolean;
  createdAt: string;
}

export const SuperAdminWebhooksPage: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');
  const [inspecting, setInspecting] = useState<WebhookLogRow | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/webhook-logs');
      if (res.data?.success) {
        setLogs(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load webhook delivery logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    if (deliveryFilter === 'DELIVERED' && !l.delivered) return false;
    if (deliveryFilter === 'FAILED' && l.delivered) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.url?.toLowerCase().includes(q) ||
      l.orderId?.toLowerCase().includes(q) ||
      l.merchantId?.businessName?.toLowerCase().includes(q) ||
      l.payload?.type?.toLowerCase().includes(q)
    );
  });

  const deliveredCount = logs.filter((l) => l.delivered).length;
  const failedCount = logs.filter((l) => !l.delivered).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Global Webhook Delivery Logs
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Inspect HMAC-SHA256 merchant callbacks, HTTP status codes, attempts, and error responses
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Recent Deliveries (Last 100)</p>
          <p className="text-xl font-black text-white mt-1">{logs.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Succeeded (2xx)</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{deliveredCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Failed / Rejected</p>
          <p className="text-xl font-black text-rose-400 mt-1">{failedCount}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, merchant, event, or endpoint URL..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start">
          {(['ALL', 'DELIVERED', 'FAILED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDeliveryFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                deliveryFilter === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Merchant & Order</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Endpoint URL</th>
                <th className="py-3.5 px-4">HTTP Status</th>
                <th className="py-3.5 px-4">Attempt & Time</th>
                <th className="py-3.5 px-4 text-right">Delivery & Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-sans text-slate-400 text-xs">
                    Loading webhook logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-sans text-slate-500 text-xs">
                    No webhook delivery events matched your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-800/35 transition">
                    <td className="py-3.5 px-4 font-sans">
                      <p className="font-bold text-slate-100 text-xs">
                        {l.merchantId?.businessName || 'Unknown Merchant'}
                      </p>
                      <p className="font-mono text-[11px] text-amber-300 mt-0.5">{l.orderId}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold">
                        {l.payload?.type || 'payment.succeeded'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={l.url}>
                      {l.url}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {l.responseStatus && l.responseStatus >= 200 && l.responseStatus < 300 ? (
                        <span className="text-emerald-400">HTTP {l.responseStatus}</span>
                      ) : (
                        <span className="text-rose-400" title={l.error || l.responseBody || ''}>
                          {l.responseStatus ? `HTTP ${l.responseStatus}` : l.error ? 'NETWORK_ERR' : 'FAILED'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <p>Attempt #{l.attempt || 1}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(l.createdAt).toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="inline-flex items-center gap-2">
                        {l.delivered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> DELIVERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                            <XCircle className="w-3 h-3" /> FAILED
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setInspecting(l)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Inspect payload & response"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspector Modal */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    Webhook Delivery {inspecting.orderId}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono break-all">{inspecting.url}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspecting.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                Error: {inspecting.error}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Dispatched JSON Payload
              </p>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono overflow-x-auto">
                {JSON.stringify(inspecting.payload || {}, null, 2)}
              </pre>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Receiver Response ({inspecting.responseStatus ? `HTTP ${inspecting.responseStatus}` : 'No Status'})
              </p>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {inspecting.responseBody || '— (Empty response body)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminWebhooksPage;

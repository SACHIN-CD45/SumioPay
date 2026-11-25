import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  Zap,
} from 'lucide-react';

export const SuperAdminWebhooksPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/webhook-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Webhooks]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) =>
    l.targetUrl?.toLowerCase().includes(search.toLowerCase()) ||
    l.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    l.merchantId?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-amber-400" />
            Global Webhook & Event Dispatch Hub
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Audit outgoing HMAC-SHA256 signed event dispatches across all merchant endpoints and diagnose delivery latencies.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Deliveries</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by target webhook URL or order reference..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Deliveries Logged: <span className="text-amber-400 font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Merchant Entity</th>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Event Type</th>
                <th className="py-3.5 px-4">Destination Endpoint</th>
                <th className="py-3.5 px-4">Response Code</th>
                <th className="py-3.5 px-4">Latency</th>
                <th className="py-3.5 px-5 text-right">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    No webhook delivery events recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs">{l.merchantId?.businessName || 'Merchant'}</div>
                    </td>
                    <td className="py-4 px-4 text-amber-300 font-bold">
                      {l.orderId}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                        {l.eventType || 'payment.paid'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate" title={l.targetUrl}>
                      {l.targetUrl}
                    </td>
                    <td className="py-4 px-4 font-bold">
                      {l.responseStatusCode >= 200 && l.responseStatusCode < 300 ? (
                        <span className="text-emerald-400 font-mono">{l.responseStatusCode} OK</span>
                      ) : (
                        <span className="text-rose-400 font-mono">{l.responseStatusCode || 'FAILED'}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {l.durationMs ? `${l.durationMs}ms` : '<120ms'}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      {l.isSuccess ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          DELIVERED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminWebhooksPage;

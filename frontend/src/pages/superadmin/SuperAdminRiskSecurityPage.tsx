import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Lock,
  Radio,
  Check,
} from 'lucide-react';

export const SuperAdminRiskSecurityPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/security-alerts');
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Security]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const res = await adminApi.patch(`/security-alerts/${alertId}/resolve`, {
        notes: 'Security alert inspected and confirmed resolved by SuperAdmin Governor.',
      });
      if (res.data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a._id === alertId ? { ...a, isResolved: true } : a))
        );
      }
    } catch (err) {
      alert('Failed to resolve security alert');
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = alerts.filter((a) =>
    a.eventType?.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase()) ||
    a.ipAddress?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Anti-Fraud, Risk & Security Defense
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time attack vector detection: duplicate UTR replay traps, velocity anomalies, IP brute-forcing, and JWT reuse attempts.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Defense Feeds</span>
        </button>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Active Risk Alerts:</span>
          <span className="text-rose-400 font-bold text-base">
            {alerts.filter((a) => !a.isResolved).length} UNRESOLVED
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Resolved Incidents:</span>
          <span className="text-emerald-400 font-bold text-base">
            {alerts.filter((a) => a.isResolved).length} MITIGATED
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Anti-Replay Filter:</span>
          <span className="text-amber-400 font-bold text-base">
            100% ARMED
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event type, IP address, or vector description..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Alerts Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Threat Type</th>
                <th className="py-3.5 px-4">Severity Tier</th>
                <th className="py-3.5 px-4">Origin IP Address</th>
                <th className="py-3.5 px-4">Attack Description</th>
                <th className="py-3.5 px-4">Detected Timestamp</th>
                <th className="py-3.5 px-5 text-right">Defense Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    Zero active security alerts. Platform defenses operating normally.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 text-white font-bold">
                      {a.eventType}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : a.severity === 'HIGH'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {a.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-300 max-w-md">
                      {a.description}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(a.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      {a.isResolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          RESOLVED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveAlert(a._id)}
                          disabled={resolvingId === a._id}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3" />
                          Mark Resolved
                        </button>
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

export default SuperAdminRiskSecurityPage;

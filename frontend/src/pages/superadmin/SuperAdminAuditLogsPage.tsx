import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  ClipboardList,
  Search,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Calendar,
  UserCheck,
} from 'lucide-react';

export const SuperAdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/audit-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Audit]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
    l.resourceType?.toLowerCase().includes(search.toLowerCase()) ||
    l.ipAddress?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            Privileged Master Audit Trail
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Immutable legal ledger tracking every privileged SuperAdmin operation, KYC approval, status freeze, and system override.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Ledger</span>
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
            placeholder="Search by action, actor email, resource, or IP..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Audit Records: <span className="text-amber-400 font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Actor Operator</th>
                <th className="py-3.5 px-4">Privileged Action</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Origin IP Address</th>
                <th className="py-3.5 px-4">Audit Metadata</th>
                <th className="py-3.5 px-5 text-right">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No audit log events recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs">{l.actorEmail || 'admin@sumiopay.internal'}</div>
                      <div className="text-[10px] text-amber-400/80 font-mono">{l.actorType || 'SUPERADMIN'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-bold text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-sans">
                      {l.resourceType}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {l.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate" title={JSON.stringify(l.newState || {})}>
                      {l.newState ? JSON.stringify(l.newState) : 'Privileged Operation'}
                    </td>
                    <td className="py-4 px-5 text-right text-slate-400">
                      {new Date(l.createdAt).toLocaleString('en-IN')}
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

export default SuperAdminAuditLogsPage;

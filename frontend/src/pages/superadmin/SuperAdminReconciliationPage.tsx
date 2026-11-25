import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export const SuperAdminReconciliationPage: React.FC = () => {
  const [unmapped, setUnmapped] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchUnmapped = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/unmapped-payments');
      if (res.data.success) {
        setUnmapped(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Reconciliation]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmapped();
  }, []);

  const filtered = unmapped.filter((u) =>
    u.utrNumber?.toLowerCase().includes(search.toLowerCase()) ||
    u.senderName?.toLowerCase().includes(search.toLowerCase()) ||
    u.merchantId?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            Global Reconciliation & Unmapped Ledger
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Detect incoming bank credits that arrived without a matching active session, delayed transactions, or manual banker transfers.
          </p>
        </div>

        <button
          onClick={fetchUnmapped}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Ledger</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
        <p className="leading-relaxed">
          Unmapped entries represent actual bank credits captured by merchant companion phones where either the 15-minute checkout window expired before payment, or the customer entered a custom rounded amount.
        </p>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Bank UTR, sender name, or merchant..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Unresolved Entries: <span className="text-amber-400 font-bold">{unmapped.length}</span>
        </div>
      </div>

      {/* Unmapped Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Target Merchant</th>
                <th className="py-3.5 px-4">Amount Credited</th>
                <th className="py-3.5 px-4">Captured Bank UTR</th>
                <th className="py-3.5 px-4">Sender Profile</th>
                <th className="py-3.5 px-4">Bank / App Source</th>
                <th className="py-3.5 px-4">Raw Intercepted Text</th>
                <th className="py-3.5 px-4">Captured At</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-sans">
                    All incoming payments matched with 100% deterministic precision. Zero unmapped entries!
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="text-white font-semibold text-xs">{u.merchantId?.businessName || 'Merchant'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.merchantId?.upiId}</div>
                    </td>
                    <td className="py-4 px-4 text-emerald-400 font-bold">
                      ₹{(u.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-sky-300 font-bold">
                      {u.utrNumber || 'N/A'}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-300">
                      {u.senderName || 'Anonymous Payer'}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                        {u.bankAppName || 'SMS'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate" title={u.rawMessage}>
                      {u.rawMessage || u.notes}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        {u.status}
                      </span>
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

export default SuperAdminReconciliationPage;

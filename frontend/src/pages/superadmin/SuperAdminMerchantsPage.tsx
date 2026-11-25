import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export const SuperAdminMerchantsPage: React.FC = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/merchants');
      if (res.data.success) {
        setMerchants(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Merchants]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleToggleStatus = async (merchantId: string, currentStatus: boolean) => {
    setTogglingId(merchantId);
    try {
      const res = await adminApi.patch(`/merchants/${merchantId}/toggle-status`, {
        isActive: !currentStatus,
      });
      if (res.data.success) {
        setMerchants((prev) =>
          prev.map((m) => (m._id === merchantId ? { ...m, isActive: !currentStatus } : m))
        );
      }
    } catch (err) {
      alert('Failed to update merchant status');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = merchants.filter((m) => {
    const matchesSearch =
      m.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.upiId?.toLowerCase().includes(search.toLowerCase());

    if (filterStatus === 'ACTIVE') return matchesSearch && m.isActive;
    if (filterStatus === 'SUSPENDED') return matchesSearch && !m.isActive;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            Merchant Fleet Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Govern registered merchant entities, inspect direct UPI endpoints, enforce bans, and audit cumulative GMV volume.
          </p>
        </div>

        <button
          onClick={fetchMerchants}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Fleet</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, email, or UPI VPA..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                filterStatus === st
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Merchants Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Business Entity</th>
                <th className="py-3.5 px-4">Receiving UPI VPA</th>
                <th className="py-3.5 px-4">Processed Volume</th>
                <th className="py-3.5 px-4">Transactions</th>
                <th className="py-3.5 px-4">Enrolled Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Governor Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    No matching merchant entities found in database.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs">{m.businessName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.email}</div>
                    </td>
                    <td className="py-4 px-4 text-amber-300 font-bold">
                      {m.upiId || 'Not Configured'}
                    </td>
                    <td className="py-4 px-4 text-emerald-400 font-bold">
                      ₹{((m.totalVolume || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {m.totalTransactions || 0}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <button
                        onClick={() => handleToggleStatus(m._id, m.isActive)}
                        disabled={togglingId === m._id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition border ${
                          m.isActive
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {togglingId === m._id ? 'Updating...' : m.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
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

export default SuperAdminMerchantsPage;

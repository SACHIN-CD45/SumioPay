import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  Ban,
  Smartphone,
  Wallet,
  KeyRound,
  Webhook,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface UpiAccount {
  id: string;
  label: string;
  upiId: string;
  upiName: string;
  bankName?: string;
  isActive: boolean;
  isPrimary: boolean;
  dailyLimitInr: number;
  todayVolumeInr: number;
  totalVolumeInr: number;
  totalTransactions: number;
}

interface MerchantRow {
  _id: string;
  name: string;
  email: string;
  businessName: string;
  phone?: string;
  upiId: string;
  upiName: string;
  upiAccounts?: UpiAccount[];
  upiRoutingMode?: string;
  apiKey?: string;
  webhookUrl?: string;
  planTier?: string;
  isActive: boolean;
  totalVolume?: number;
  totalTransactions?: number;
  deviceCount?: number;
  totalGmv?: number;
  paidOrders?: number;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const formatInr = (rupees?: number) =>
  `₹${(rupees ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const SuperAdminMerchantsPage: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantRow | null>(null);

  const fetchMerchants = async (targetPage = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/merchants', {
        params: {
          page: targetPage,
          limit: 20,
          search: search.trim() || undefined,
        },
      });
      const payload = res.data?.data;
      const list: MerchantRow[] = Array.isArray(payload?.merchants)
        ? payload.merchants
        : Array.isArray(payload)
        ? payload
        : [];
      setMerchants(list);
      if (payload?.pagination) {
        setPagination(payload.pagination);
      } else {
        setPagination({
          total: list.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load merchants');
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants(1);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMerchants(1);
  };

  const handleToggleStatus = async (merchant: MerchantRow) => {
    setTogglingId(merchant._id);
    try {
      const res = await adminApi.patch(`/merchants/${merchant._id}/toggle-status`);
      if (res.data?.success) {
        const nextActive = res.data.data?.isActive ?? !merchant.isActive;
        setMerchants((prev) =>
          prev.map((m) => (m._id === merchant._id ? { ...m, isActive: nextActive } : m))
        );
        if (selectedMerchant?._id === merchant._id) {
          setSelectedMerchant({ ...selectedMerchant, isActive: nextActive });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update merchant status');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = merchants.filter((m) => {
    if (statusFilter === 'ACTIVE' && !m.isActive) return false;
    if (statusFilter === 'SUSPENDED' && m.isActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.businessName?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.upiId?.toLowerCase().includes(q)
    );
  });

  const activeCount = merchants.filter((m) => m.isActive).length;
  const pageGmv = merchants.reduce((acc, m) => acc + (m.totalGmv ?? m.totalVolume ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Merchant Directory</h1>
          <p className="text-slate-400 text-xs mt-1">
            Monitor merchant onboarding, UPI router handles, paired listeners, and account access
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchMerchants(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Total Registered Merchants</p>
          <p className="text-xl font-black text-white mt-1">{pagination.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Active on Current Page</p>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {activeCount} / {merchants.length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Settled Volume (Page)</p>
          <p className="text-xl font-black text-amber-400 mt-1">{formatInr(pageGmv)}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, owner name, email, or UPI ID..."
            className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200"
          >
            Find
          </button>
        </form>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                statusFilter === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Merchants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Merchant & Contact</th>
                <th className="py-3.5 px-4">UPI & Router</th>
                <th className="py-3.5 px-4">Plan & Devices</th>
                <th className="py-3.5 px-4">GMV & Orders</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading registered merchants...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No merchants matched your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const volumeInr = m.totalGmv ?? m.totalVolume ?? 0;
                  const ordersCount = m.paidOrders ?? m.totalTransactions ?? 0;
                  const handleCount = m.upiAccounts?.length || (m.upiId ? 1 : 0);

                  return (
                    <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-100">{m.businessName}</p>
                        <p className="text-[11px] text-slate-400">
                          {m.name} • {m.email}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-mono text-slate-200 text-[11px]">{m.upiId || '—'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {handleCount} handle(s) • {m.upiRoutingMode || 'PRIMARY_ONLY'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">
                          {m.planTier || 'TRIAL'}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-slate-500" />
                          <span>{m.deviceCount ?? 0} device(s)</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-emerald-400">{formatInr(volumeInr)}</p>
                        <p className="text-[11px] text-slate-400">
                          {ordersCount.toLocaleString('en-IN')} paid order(s)
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            m.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {m.isActive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )}
                          <span>{m.isActive ? 'ACTIVE' : 'SUSPENDED'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedMerchant(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(m)}
                            disabled={togglingId === m._id}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-50 ${
                              m.isActive
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {togglingId === m._id
                              ? 'Saving...'
                              : m.isActive
                              ? 'Suspend'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} merchants)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchMerchants(pagination.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchMerchants(pagination.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  {selectedMerchant.businessName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedMerchant.name} • {selectedMerchant.email}
                  {selectedMerchant.phone ? ` • ${selectedMerchant.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-500 text-[10px]">Plan Tier</p>
                <p className="font-bold text-indigo-300 mt-0.5">
                  {selectedMerchant.planTier || 'TRIAL'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-500 text-[10px]">Settled GMV</p>
                <p className="font-bold text-emerald-400 mt-0.5">
                  {formatInr(selectedMerchant.totalGmv ?? selectedMerchant.totalVolume ?? 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-500 text-[10px]">Paid Orders</p>
                <p className="font-bold text-white mt-0.5">
                  {(selectedMerchant.paidOrders ?? selectedMerchant.totalTransactions ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-500 text-[10px]">Linked Phones</p>
                <p className="font-bold text-amber-300 mt-0.5">
                  {selectedMerchant.deviceCount ?? 0}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>API & Webhook Integration</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Merchant ID:</span>
                  <span className="font-mono text-slate-300 text-[11px]">{selectedMerchant._id}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Public API Key:</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {selectedMerchant.apiKey
                      ? `${selectedMerchant.apiKey.slice(0, 14)}••••${selectedMerchant.apiKey.slice(-4)}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Webhook className="w-3 h-3" /> Webhook URL:
                  </span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-xs">
                    {selectedMerchant.webhookUrl || 'Not configured'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300 font-bold">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Configured UPI Settlement Handles ({selectedMerchant.upiRoutingMode || 'PRIMARY_ONLY'})</span>
                </span>
              </div>

              <div className="space-y-2">
                {selectedMerchant.upiAccounts && selectedMerchant.upiAccounts.length > 0 ? (
                  selectedMerchant.upiAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-slate-200">
                          {acc.label}{' '}
                          {acc.isPrimary && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px]">
                              PRIMARY
                            </span>
                          )}
                          {!acc.isActive && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              PAUSED
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-[11px] text-amber-300 mt-0.5">
                          {acc.upiId} ({acc.upiName})
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <p>Total: {formatInr(acc.totalVolumeInr)}</p>
                        <p>
                          Cap:{' '}
                          {acc.dailyLimitInr > 0
                            ? `${formatInr(acc.todayVolumeInr)} / ${formatInr(acc.dailyLimitInr)}`
                            : 'Unlimited'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="font-mono text-amber-300">{selectedMerchant.upiId || '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedMerchant.upiName}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-500">
                Joined: {new Date(selectedMerchant.createdAt).toLocaleString('en-IN')}
              </span>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedMerchant)}
                disabled={togglingId === selectedMerchant._id}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  selectedMerchant.isActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {selectedMerchant.isActive ? 'Suspend Merchant' : 'Reactivate Merchant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMerchantsPage;

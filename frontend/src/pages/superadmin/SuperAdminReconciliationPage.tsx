import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Search,
  RefreshCw,
  GitCompareArrows,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface UnmappedRow {
  _id: string;
  merchantId?: {
    _id: string;
    businessName?: string;
    email?: string;
    upiId?: string;
  };
  amount: number;
  utrNumber?: string;
  senderName?: string;
  rawMessage: string;
  bankAppName?: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'REFUNDED';
  resolvedOrderId?: string;
  notes?: string;
  createdAt: string;
}

export const SuperAdminReconciliationPage: React.FC = () => {
  const [unmapped, setUnmapped] = useState<UnmappedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED' | 'REFUNDED'>('ALL');
  const [resolvingRow, setResolvingRow] = useState<UnmappedRow | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'RESOLVED' | 'REFUNDED'>('RESOLVED');
  const [resolvedOrderId, setResolvedOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUnmapped = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/unmapped-payments');
      if (res.data?.success) {
        setUnmapped(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load unmapped credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmapped();
  }, []);

  const openResolveModal = (row: UnmappedRow) => {
    setResolvingRow(row);
    setResolveStatus('RESOLVED');
    setResolvedOrderId(row.resolvedOrderId || '');
    setNotes(row.notes || '');
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRow) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.patch(`/unmapped-payments/${resolvingRow._id}/resolve`, {
        status: resolveStatus,
        resolvedOrderId: resolveStatus === 'RESOLVED' ? resolvedOrderId.trim() : undefined,
        notes: notes.trim(),
      });
      if (res.data?.success) {
        const updated: UnmappedRow = res.data.data?.unmapped || {
          ...resolvingRow,
          status: resolveStatus,
          resolvedOrderId: resolvedOrderId.trim(),
          notes: notes.trim(),
        };
        setUnmapped((prev) =>
          prev.map((item) =>
            item._id === resolvingRow._id
              ? { ...item, ...updated, merchantId: item.merchantId }
              : item
          )
        );
        setResolvingRow(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resolve unmapped credit');
    } finally {
      setSaving(false);
    }
  };

  const filtered = unmapped.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.utrNumber?.toLowerCase().includes(q) ||
      u.senderName?.toLowerCase().includes(q) ||
      u.rawMessage?.toLowerCase().includes(q) ||
      u.merchantId?.businessName?.toLowerCase().includes(q) ||
      u.resolvedOrderId?.toLowerCase().includes(q)
    );
  });

  const unresolvedCount = unmapped.filter((u) => u.status === 'UNRESOLVED').length;
  const unresolvedAmount = unmapped
    .filter((u) => u.status === 'UNRESOLVED')
    .reduce((acc, u) => acc + (u.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Unmapped & Orphan Bank Credits
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Reconcile incoming bank alerts that missed unique paise matching or expired prior to arrival
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUnmapped}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Unresolved Orphan Alerts</p>
          <p className="text-xl font-black text-amber-400 mt-1">{unresolvedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Unresolved Amount</p>
          <p className="text-xl font-black text-white mt-1">
            ₹{unresolvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Resolved / Refunded</p>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {unmapped.length - unresolvedCount}
          </p>
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
            placeholder="Search UTR, sender, business name, order ID, or raw SMS..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start">
          {(['ALL', 'UNRESOLVED', 'RESOLVED', 'REFUNDED'] as const).map((tab) => (
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

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Merchant</th>
                <th className="py-3.5 px-4">Amount & UTR</th>
                <th className="py-3.5 px-4">Sender & App</th>
                <th className="py-3.5 px-4">Raw Bank Notification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading unmapped credits...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No unmapped payment records match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/35 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-100">
                        {u.merchantId?.businessName || 'Unknown Merchant'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {u.merchantId?.upiId || u.merchantId?.email || '—'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-emerald-400">
                        ₹{(u.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                        UTR: {u.utrNumber || 'Not parsed'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{u.senderName || '—'}</p>
                      <p className="text-[11px] text-slate-400">{u.bankAppName || 'Android Listener'}</p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-mono text-[11px] text-slate-300 line-clamp-2" title={u.rawMessage}>
                        {u.rawMessage}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(u.createdAt).toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          u.status === 'UNRESOLVED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : u.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        }`}
                      >
                        {u.status}
                      </span>
                      {u.resolvedOrderId && (
                        <p className="font-mono text-[10px] text-slate-400 mt-1">
                          Linked: {u.resolvedOrderId}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.status === 'UNRESOLVED' ? (
                        <button
                          type="button"
                          onClick={() => openResolveModal(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
                        >
                          <GitCompareArrows className="w-3.5 h-3.5" />
                          <span>Resolve / Link</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Closed</span>
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

      {/* Resolve Unmapped Modal */}
      {resolvingRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmResolve}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-white">Reconcile Unmapped Credit</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ₹{resolvingRow.amount.toFixed(2)} • {resolvingRow.merchantId?.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolvingRow(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              {resolvingRow.rawMessage}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Resolution Status</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as 'RESOLVED' | 'REFUNDED')}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="RESOLVED">RESOLVED (Matched / Settled)</option>
                  <option value="REFUNDED">REFUNDED (Returned to Payer)</option>
                </select>
              </div>

              {resolveStatus === 'RESOLVED' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    Link & Mark Order PAID (Optional Order ID)
                  </label>
                  <input
                    type="text"
                    value={resolvedOrderId}
                    onChange={(e) => setResolvedOrderId(e.target.value)}
                    placeholder="e.g. ORD-20261126-4812 (leaves order PAID + fires webhook)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Audit Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional remark explaining match or refund UTR..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingRow(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold transition"
              >
                {saving ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReconciliationPage;

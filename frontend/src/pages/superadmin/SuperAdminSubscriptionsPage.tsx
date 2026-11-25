import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  Edit,
  X,
  Check,
  Building2,
  Calendar,
} from 'lucide-react';

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Edit Modal State
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editTier, setEditTier] = useState<string>('STARTER');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editPriceRupees, setEditPriceRupees] = useState<number>(1999);
  const [savingSub, setSavingSub] = useState<boolean>(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const [subsRes, metricsRes] = await Promise.all([
        adminApi.get('/subscriptions'),
        adminApi.get('/subscriptions/metrics'),
      ]);
      if (subsRes.data.success) setSubscriptions(subsRes.data.data);
      if (metricsRes.data.success) setSubMetrics(metricsRes.data.data);
    } catch (err) {
      console.error('[SuperAdmin Subscriptions]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenEdit = (sub: any) => {
    setEditingSub(sub);
    setEditTier(sub.tier || 'STARTER');
    setEditStatus(sub.status || 'ACTIVE');
    setEditPriceRupees((sub.pricePaise || 199900) / 100);
  };

  const handleSaveSub = async () => {
    if (!editingSub) return;
    setSavingSub(true);
    try {
      const merchantId = editingSub.merchantId?._id || editingSub.merchantId;
      const res = await adminApi.patch(`/subscriptions/${merchantId}/tier`, {
        tier: editTier,
        status: editStatus,
        pricePaise: Math.round(editPriceRupees * 100),
      });

      if (res.data.success) {
        setSubscriptions((prev) =>
          prev.map((s) =>
            (s.merchantId?._id || s.merchantId) === merchantId
              ? { ...s, tier: editTier, status: editStatus, pricePaise: Math.round(editPriceRupees * 100) }
              : s
          )
        );
        setEditingSub(null);
      }
    } catch (err) {
      alert('Failed to update merchant subscription plan');
    } finally {
      setSavingSub(false);
    }
  };

  const filtered = subscriptions.filter((s) =>
    s.merchantId?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    s.merchantId?.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.tier?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            Platform Subscriptions & MRR Controller
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Govern SaaS monetization, tier allocations (Starter, Growth, Enterprise), and recurring platform license billing.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Billing</span>
        </button>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-slate-400">Monthly Recurring Revenue (MRR)</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{((subMetrics?.mrrPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Contracted recurring SaaS revenue</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-slate-400">Total License Revenue (ARR)</span>
          <div className="text-2xl font-black text-white font-mono">
            ₹{((subMetrics?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Cumulative platform billings</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-slate-400">Active Subscriptions</span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {subMetrics?.activeSubscriptions || 0}
          </div>
          <p className="text-[11px] text-slate-500">Paying business entities</p>
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
            placeholder="Search by business name or plan tier..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Merchant Entity</th>
                <th className="py-3.5 px-4">Active Plan Tier</th>
                <th className="py-3.5 px-4">Billing Rate / Mo</th>
                <th className="py-3.5 px-4">Renewal Date</th>
                <th className="py-3.5 px-4">Subscription Status</th>
                <th className="py-3.5 px-5 text-right">Plan Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No active merchant subscriptions in database.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs">{s.merchantId?.businessName || 'Merchant'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.merchantId?.email}</div>
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold text-[10px]">
                        {s.tier || 'STARTER'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-emerald-400 font-bold">
                      ₹{((s.pricePaise || 199900) / 100).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('en-IN') : 'Auto-Renew'}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        {s.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition inline-flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Modify Tier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modify Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Modify Subscription: {editingSub.merchantId?.businessName}
              </h3>
              <button
                onClick={() => setEditingSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Plan Tier</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="STARTER">STARTER (₹1,999/mo)</option>
                  <option value="GROWTH">GROWTH (₹4,999/mo)</option>
                  <option value="ENTERPRISE">ENTERPRISE (₹9,999/mo)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Monthly Price Override (₹)</label>
                <input
                  type="number"
                  value={editPriceRupees}
                  onChange={(e) => setEditPriceRupees(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIALING">TRIALING</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSub}
                disabled={savingSub}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition shadow-sm"
              >
                {savingSub ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscriptionsPage;

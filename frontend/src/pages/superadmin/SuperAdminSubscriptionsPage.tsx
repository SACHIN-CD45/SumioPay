import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { adminApi } from '../../lib/api';
import {
  Receipt,
  RefreshCw,
  Search,
  CheckCircle2,
  Edit,
  X,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  Clock,
  Plus,
  Trash2,
  Copy,
  FileText,
} from 'lucide-react';

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Edit Tier Modal State
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editTier, setEditTier] = useState<string>('MONTHLY');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editPriceRupees, setEditPriceRupees] = useState<number>(399);
  const [editDurationDays, setEditDurationDays] = useState<number>(30);
  const [savingSub, setSavingSub] = useState<boolean>(false);

  // Create Bill / Invoice Modal State
  const [createBillOpen, setCreateBillOpen] = useState<boolean>(false);
  const [billMerchantId, setBillMerchantId] = useState<string>('');
  const [billMode, setBillMode] = useState<'MARK_PAID' | 'GENERATE_UPI_BILL'>('MARK_PAID');
  const [billTier, setBillTier] = useState<string>('MONTHLY');
  const [billAmount, setBillAmount] = useState<number>(399);
  const [billDays, setBillDays] = useState<number>(30);
  const [billUtr, setBillUtr] = useState<string>('');
  const [creatingBill, setCreatingBill] = useState<boolean>(false);
  const [generatedUpiBill, setGeneratedUpiBill] = useState<any | null>(null);

  // Manage Merchant Invoices Modal State
  const [managingInvoicesSub, setManagingInvoicesSub] = useState<any | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invAmount, setInvAmount] = useState<number>(0);
  const [invUtr, setInvUtr] = useState<string>('');
  const [invTier, setInvTier] = useState<string>('MONTHLY');
  const [invDays, setInvDays] = useState<number>(30);
  const [savingInv, setSavingInv] = useState<boolean>(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const [subsRes, metricsRes] = await Promise.all([
        adminApi.get('/subscriptions'),
        adminApi.get('/subscriptions/metrics'),
      ]);
      if (subsRes.data.success) {
        setSubscriptions(subsRes.data.data);
        if (managingInvoicesSub) {
          const refreshed = subsRes.data.data.find(
            (s: any) => s.merchantId === managingInvoicesSub.merchantId
          );
          if (refreshed) setManagingInvoicesSub(refreshed);
        }
      }
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

  const plans = subMetrics?.subscriptionPlans || {
    trialDays: 3,
    monthlyPrice: 399,
    monthlyDurationDays: 30,
    halfYearlyPrice: 1999,
    halfYearlyDurationDays: 180,
    customPrice: 0,
  };

  const applyTierDefaults = (tier: string) => {
    setEditTier(tier);
    if (tier === 'TRIAL') {
      setEditStatus('TRIAL');
      setEditPriceRupees(0);
      setEditDurationDays(plans.trialDays || 3);
    } else if (tier === 'MONTHLY') {
      setEditStatus('ACTIVE');
      setEditPriceRupees(plans.monthlyPrice || 399);
      setEditDurationDays(plans.monthlyDurationDays || 30);
    } else if (tier === 'HALF_YEARLY') {
      setEditStatus('ACTIVE');
      setEditPriceRupees(Math.round((plans.halfYearlyPrice || 1999) / 6));
      setEditDurationDays(plans.halfYearlyDurationDays || 180);
    } else {
      setEditStatus('ACTIVE');
      setEditPriceRupees(plans.customPrice || 0);
      setEditDurationDays(365);
    }
  };

  const handleOpenEdit = (sub: any) => {
    setEditingSub(sub);
    const tier = sub.planTier || 'TRIAL';
    setEditTier(tier);
    setEditStatus(sub.status || 'ACTIVE');
    setEditPriceRupees(Math.round((sub.monthlyPriceInPaise || 0) / 100));
    setEditDurationDays(
      tier === 'TRIAL'
        ? plans.trialDays || 3
        : tier === 'HALF_YEARLY'
        ? plans.halfYearlyDurationDays || 180
        : tier === 'CUSTOM'
        ? 365
        : plans.monthlyDurationDays || 30
    );
  };

  const handleSaveSub = async () => {
    if (!editingSub) return;
    setSavingSub(true);
    try {
      const merchantId = editingSub.merchantId?._id || editingSub.merchantId;
      const res = await adminApi.patch(`/subscriptions/${merchantId}/tier`, {
        planTier: editTier,
        status: editStatus,
        customPriceInPaise: Math.round(editPriceRupees * 100),
        durationDays: editDurationDays,
      });

      if (res.data.success) {
        setEditingSub(null);
        await fetchSubscriptions();
      }
    } catch (err) {
      alert('Failed to update merchant subscription plan');
    } finally {
      setSavingSub(false);
    }
  };

  const handleOpenCreateBill = (presetMerchantId?: string) => {
    setBillMerchantId(presetMerchantId || subscriptions[0]?.merchantId || '');
    setBillMode('MARK_PAID');
    setBillTier('MONTHLY');
    setBillAmount(plans.monthlyPrice || 399);
    setBillDays(plans.monthlyDurationDays || 30);
    setBillUtr('');
    setGeneratedUpiBill(null);
    setCreateBillOpen(true);
  };

  const handleBillTierChange = (tier: string) => {
    setBillTier(tier);
    if (tier === 'MONTHLY') {
      setBillAmount(plans.monthlyPrice || 399);
      setBillDays(plans.monthlyDurationDays || 30);
    } else if (tier === 'HALF_YEARLY') {
      setBillAmount(plans.halfYearlyPrice || 1999);
      setBillDays(plans.halfYearlyDurationDays || 180);
    } else if (tier === 'CUSTOM') {
      setBillAmount(plans.customPrice || 4999);
      setBillDays(365);
    }
  };

  const handleCreateBill = async () => {
    if (!billMerchantId) {
      alert('Please select a merchant');
      return;
    }
    setCreatingBill(true);
    try {
      const res = await adminApi.post(`/subscriptions/${billMerchantId}/bills`, {
        mode: billMode,
        planTier: billTier,
        amountInr: billAmount,
        durationDays: billDays,
        utrNumber: billUtr,
      });
      if (res.data.success) {
        if (billMode === 'GENERATE_UPI_BILL') {
          setGeneratedUpiBill(res.data.data);
        } else {
          setCreateBillOpen(false);
        }
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subscription bill');
    } finally {
      setCreatingBill(false);
    }
  };

  const startEditInvoice = (inv: any) => {
    setEditingInvoiceId(inv.invoiceId);
    setInvAmount(Math.round((inv.amountInPaise || 0) / 100));
    setInvUtr(inv.utrNumber || '');
    setInvTier(inv.planTier || 'MONTHLY');
    setInvDays(inv.durationDays || 30);
  };

  const saveEditInvoice = async (merchantId: string, invoiceId: string) => {
    setSavingInv(true);
    try {
      const res = await adminApi.patch(`/subscriptions/${merchantId}/bills/${invoiceId}`, {
        amountInr: invAmount,
        utrNumber: invUtr,
        planTier: invTier,
        durationDays: invDays,
      });
      if (res.data.success) {
        setEditingInvoiceId(null);
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSavingInv(false);
    }
  };

  const handleDeleteInvoice = async (merchantId: string, invoiceId: string) => {
    if (!confirm(`Void and remove invoice ${invoiceId}?`)) return;
    try {
      const res = await adminApi.delete(`/subscriptions/${merchantId}/bills/${invoiceId}`);
      if (res.data.success) {
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const filtered = subscriptions.filter((s) =>
    (s.businessName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.planTier || '').toLowerCase().includes(search.toLowerCase())
  );

  const collector = subMetrics?.collectorStatus;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            Platform Subscriptions &amp; Billing Manager
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Create bills, generate payable UPI subscription links, edit plan tiers ({plans.trialDays}d Trial, ₹{plans.monthlyPrice}/mo, ₹{plans.halfYearlyPrice}/6mo, Custom), and manage invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenCreateBill()}
            disabled={subscriptions.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bill / Invoice</span>
          </button>
          <Link
            to="/superadmin/settings"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-2 transition"
          >
            <span>Edit Prices &amp; Collector</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={fetchSubscriptions}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Dogfood Collector Status Strip */}
      {collector && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            collector.configured
              ? collector.onlineDevicesCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {collector.configured ? (
              <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              {collector.configured ? (
                <>
                  <div className="font-bold">
                    SumioPay Self-Billing Collector: {collector.businessName} ({collector.email})
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5 font-mono">
                    Receiving UPI: {collector.upiId} • Listener Devices Online:{' '}
                    <span className="font-bold">{collector.onlineDevicesCount}</span> /{' '}
                    {collector.totalDevicesCount}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold">Platform Collector Merchant Not Configured</div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {collector.reason ||
                      'Go to SuperAdmin Settings and select your SumioPay merchant account email so subscription payments go to your UPI bank account.'}
                  </div>
                </>
              )}
            </div>
          </div>
          <Link
            to="/superadmin/settings"
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white border border-white/10 font-bold text-[11px] shrink-0 text-center"
          >
            {collector.configured ? 'Manage Collector' : 'Configure Collector Now'}
          </Link>
        </div>
      )}

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <span className="text-slate-400">Monthly Recurring Revenue (MRR)</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{(subMetrics?.estimatedMRR || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">ARR: ₹{(subMetrics?.estimatedARR || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <span className="text-slate-400">Total Collected Subscription Revenue</span>
          <div className="text-2xl font-black text-white font-mono">
            ₹{(subMetrics?.totalCollectedRevenueInr || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">Sum of all paid invoices</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <span className="text-slate-400">Active Paid Plans</span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {subMetrics?.activeSubscriptions || 0}
          </div>
          <p className="text-[11px] text-slate-500">Of {subMetrics?.totalSubscribers || 0} total merchants</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <span className="text-slate-400">Free Trial Accounts ({plans.trialDays}d)</span>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {subMetrics?.trialSubscriptions || 0}
          </div>
          <p className="text-[11px] text-slate-500">Auto-enrolled on registration</p>
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
            placeholder="Search by business name, email, or plan tier..."
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
                <th className="py-3.5 px-4">Monthly Eq. / Paid</th>
                <th className="py-3.5 px-4">Expires / Renewal</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions (Create / Edit / Bills)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No matching merchant subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.merchantId} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs">{s.businessName || 'Merchant'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.email}</div>
                      {s.upiId && <div className="text-[10px] text-slate-500 font-mono">UPI: {s.upiId}</div>}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold text-[10px]">
                        {s.planTier || 'TRIAL'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-emerald-400 font-bold">
                        ₹{((s.monthlyPriceInPaise || 0) / 100).toLocaleString('en-IN')}/mo
                      </div>
                      {s.totalCollectedPaise > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Paid: ₹{(s.totalCollectedPaise / 100).toLocaleString('en-IN')}
                          {s.lastInvoiceUtr ? ` • UTR ${s.lastInvoiceUtr}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <div>
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('en-IN') : '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">{s.daysRemaining}d remaining</div>
                    </td>
                    <td className="py-4 px-4 font-sans">
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : s.status === 'TRIAL' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold text-[10px]">
                          <Clock className="w-3 h-3" />
                          TRIAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          {s.status || 'PAST_DUE'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setManagingInvoicesSub(s)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span>Bills ({s.invoicesCount || 0})</span>
                        </button>
                        <button
                          onClick={() => handleOpenCreateBill(s.merchantId)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Bill</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
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

      {/* Edit Subscription Tier Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Edit Subscription: {editingSub.businessName}
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
                  onChange={(e) => applyTierDefaults(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="TRIAL">TRIAL ({plans.trialDays} Days Free)</option>
                  <option value="MONTHLY">MONTHLY (₹{plans.monthlyPrice} / {plans.monthlyDurationDays}d)</option>
                  <option value="HALF_YEARLY">HALF_YEARLY (₹{plans.halfYearlyPrice} / {plans.halfYearlyDurationDays}d)</option>
                  <option value="CUSTOM">CUSTOM (All Features Unlocked)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Monthly Eq. Rate (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editPriceRupees}
                    onChange={(e) => setEditPriceRupees(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Validity Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={editDurationDays}
                    onChange={(e) => setEditDurationDays(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
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
                {savingSub ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Bill Modal */}
      {createBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Create Subscription Bill / Invoice
              </h3>
              <button
                onClick={() => setCreateBillOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedUpiBill ? (
              <div className="space-y-4 text-center text-xs">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                  Payable SumioPay Bill Created — ₹{Number(generatedUpiBill.exactAmount).toFixed(2)}
                </div>
                <div className="inline-block p-3 bg-white rounded-2xl">
                  <QRCodeSVG value={generatedUpiBill.upiIntentUrl} size={170} />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-1.5 font-mono text-[11px]">
                  <div className="text-slate-400">Payment Link (Share with Client):</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-amber-300 truncate">{generatedUpiBill.hostedCheckoutUrl}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedUpiBill.hostedCheckoutUrl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-white shrink-0 inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setCreateBillOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Select Merchant</label>
                  <select
                    value={billMerchantId}
                    onChange={(e) => setBillMerchantId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    {subscriptions.map((m) => (
                      <option key={m.merchantId} value={m.merchantId}>
                        {m.businessName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillMode('MARK_PAID')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      billMode === 'MARK_PAID'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Record Paid Bill</div>
                    <div className="text-[10px] opacity-80">Activate immediately + issue invoice</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillMode('GENERATE_UPI_BILL')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      billMode === 'GENERATE_UPI_BILL'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Create Payable UPI Link</div>
                    <div className="text-[10px] opacity-80">Client pays QR &amp; auto-activates</div>
                  </button>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Plan Tier</label>
                  <select
                    value={billTier}
                    onChange={(e) => handleBillTierChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="MONTHLY">MONTHLY (₹{plans.monthlyPrice} / 30d)</option>
                    <option value="HALF_YEARLY">HALF_YEARLY (₹{plans.halfYearlyPrice} / 180d)</option>
                    <option value="CUSTOM">CUSTOM (All Features)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Bill Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={billAmount}
                      onChange={(e) => setBillAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={billDays}
                      onChange={(e) => setBillDays(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {billMode === 'MARK_PAID' && (
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">
                      Bank UTR / Cash / Payment Reference
                    </label>
                    <input
                      type="text"
                      value={billUtr}
                      onChange={(e) => setBillUtr(e.target.value)}
                      placeholder="e.g. 432109876543 or CASH_PAID"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setCreateBillOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBill}
                    disabled={creatingBill}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-extrabold"
                  >
                    {creatingBill
                      ? 'Creating...'
                      : billMode === 'MARK_PAID'
                      ? 'Save Invoice & Activate'
                      : 'Generate SumioPay Bill Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage & Edit Merchant Invoices Modal */}
      {managingInvoicesSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Invoices &amp; Bills: {managingInvoicesSub.businessName}
              </h3>
              <button
                onClick={() => {
                  setManagingInvoicesSub(null);
                  setEditingInvoiceId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 text-xs">
              {!managingInvoicesSub.invoiceHistory?.length ? (
                <div className="py-10 text-center text-slate-500">
                  No invoices recorded yet for this merchant.
                </div>
              ) : (
                [...managingInvoicesSub.invoiceHistory].reverse().map((inv: any) => (
                  <div
                    key={inv.invoiceId}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    {editingInvoiceId === inv.invoiceId ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="number"
                          value={invAmount}
                          onChange={(e) => setInvAmount(Number(e.target.value))}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                          placeholder="Amount ₹"
                        />
                        <input
                          type="text"
                          value={invUtr}
                          onChange={(e) => setInvUtr(e.target.value)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                          placeholder="UTR"
                        />
                        <select
                          value={invTier}
                          onChange={(e) => setInvTier(e.target.value)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                        >
                          <option value="MONTHLY">MONTHLY</option>
                          <option value="HALF_YEARLY">HALF_YEARLY</option>
                          <option value="CUSTOM">CUSTOM</option>
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              saveEditInvoice(managingInvoicesSub.merchantId, inv.invoiceId)
                            }
                            disabled={savingInv}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingInvoiceId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white font-mono">
                            {inv.invoiceId}{' '}
                            <span className="text-emerald-400 ml-2">
                              ₹{((inv.amountInPaise || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Plan: {inv.planTier || 'ACTIVE'} • UTR: {inv.utrNumber || '—'} •{' '}
                            {inv.paidAt ? new Date(inv.paidAt).toLocaleString('en-IN') : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 inline-flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteInvoice(managingInvoicesSub.merchantId, inv.invoiceId)
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Void
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscriptionsPage;

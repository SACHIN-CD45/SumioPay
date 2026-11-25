import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  Smartphone,
  ArrowUpRight,
  Sparkles,
  Zap,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [merchant, setMerchant] = useState<any>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/dashboard-stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
      const profileRes = await api.get('/merchant/profile');
      if (profileRes.data.success) {
        setMerchant(profileRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
              Central Multi-App Gateway
            </span>
            <span className="text-xs text-slate-500">Merchant: {merchant?.businessName || 'SumioTech'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Universal UPI Auto-Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Receiving VPA: <span className="font-mono text-blue-600 font-bold">{merchant?.upiId || 'Loading...'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            Launch Test Checkout Modal
          </button>
          <button
            onClick={fetchStats}
            title="Refresh Realtime Stats"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-subtle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Lifetime Volume (GMV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats?.lifetimeVolume?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            100% direct bank settlement
          </div>
        </div>

        {/* Today's GMV */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Today's Collections</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats?.todayVolume?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.todayPaidCount || 0} successful orders today
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Verification Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.conversionRate || '100%'}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.totalPaidOrders || 0} of {stats?.totalOrders || 0} orders
          </div>
        </div>

        {/* Listener Phones Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Android Listener Status</span>
            <Smartphone className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{stats?.onlineDevicesCount || 0}</span>
            <span className="text-xs font-normal text-slate-500">/ {stats?.totalDevices || 0} Paired</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.onlineDevicesCount > 0 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active & Listening
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Needs Phone Pairing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Live Incoming Transactions Feed
          </h2>
          <a
            href="/orders"
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            View Full Ledger <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/60">
                <th className="py-3 px-3 font-semibold">Order ID</th>
                <th className="py-3 px-3 font-semibold">App / Product</th>
                <th className="py-3 px-3 font-semibold">Customer ID</th>
                <th className="py-3 px-3 font-semibold">Amount (Exact)</th>
                <th className="py-3 px-3 font-semibold">Bank UTR</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((ord: any) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.orderId}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {ord.appName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {ord.customerUserId || 'guest'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{ord.exactAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-emerald-700 font-mono text-[11px] font-bold">
                      {ord.utrNumber || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions yet. Click "Launch Test Checkout Modal" above to test!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Modal */}
      <UpiCheckoutModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        appName="SUMIOLAB"
        userId="usr_test_demo"
        planName="SumioLab Annual Pro Tier"
        baseAmount={499}
        onSuccess={(data) => {
          console.log('Payment Successful in Dashboard Test:', data);
          fetchStats();
        }}
      />
    </div>
  );
};

export default DashboardPage;

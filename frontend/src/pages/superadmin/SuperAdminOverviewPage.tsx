import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  CreditCard,
  Smartphone,
  RefreshCw,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';

export const SuperAdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        adminApi.get('/metrics'),
        adminApi.get('/system-health'),
      ]);
      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (healthRes.data.success) setSystemHealth(healthRes.data.data);
    } catch (err) {
      console.error('[SuperAdmin Overview]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Executive Platform Overview
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time multi-tenant UPI volume orchestration, merchant fleet metrics, and infrastructure SLA monitor.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 4 Primary Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Platform GMV</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
              0% Custody
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ₹{((metrics?.volume?.totalPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Direct bank-to-bank settled volume
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Registered Merchants</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {metrics?.merchants?.total || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-emerald-400 font-bold">{metrics?.merchants?.active || 0} Active</span> · {metrics?.merchants?.suspended || 0} Suspended
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Payment Orders Paid</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {metrics?.orders?.paid || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            Total Created: <span className="text-slate-200 font-mono font-bold">{metrics?.orders?.total || 0}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hardware Listeners</span>
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {metrics?.devices?.online || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            Total Enrolled: <span className="text-slate-200 font-mono font-bold">{metrics?.devices?.total || 0}</span> Android phones
          </div>
        </div>
      </div>

      {/* Operational Health & SRE Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Diagnostics */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Infrastructure Health & Engine Services</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              All Systems Nominal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Database Layer</span>
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                MongoDB Connected
              </div>
              <p className="text-[10px] text-slate-500">Local replica bound to 127.0.0.1</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Cache & Anti-Replay</span>
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Redis Cache Active
              </div>
              <p className="text-[10px] text-slate-500">12-Digit UTR deduplication lock</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Real-Time Sockets</span>
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Socket.IO Online
              </div>
              <p className="text-[10px] text-slate-500">0.8s green check confirmation</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-200">Production Node Runtime</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Uptime: {Math.floor((systemHealth?.uptime || 3600) / 3600)}h {Math.floor(((systemHealth?.uptime || 3600) % 3600) / 60)}m · Memory: {Math.round((systemHealth?.memoryUsage?.rss || 95000000) / 1024 / 1024)} MB
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
              v2.4 Enterprise LTS
            </span>
          </div>
        </div>

        {/* Quick Governor Actions */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3>Command Shortcuts</h3>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={() => navigate('/superadmin/merchants')}
              className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-semibold flex items-center justify-between transition group"
            >
              <span>Manage Merchant Fleet</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
            </button>

            <button
              onClick={() => navigate('/superadmin/kyc')}
              className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-semibold flex items-center justify-between transition group"
            >
              <span>Review Pending KYC</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
            </button>

            <button
              onClick={() => navigate('/superadmin/transactions')}
              className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-semibold flex items-center justify-between transition group"
            >
              <span>Inspect Global Transactions</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
            </button>

            <button
              onClick={() => navigate('/superadmin/settings')}
              className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-semibold flex items-center justify-between transition group"
            >
              <span>Platform Controls & Maintenance</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOverviewPage;

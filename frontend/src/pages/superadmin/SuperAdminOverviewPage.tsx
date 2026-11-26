import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import {
  IndianRupee,
  Store,
  Activity,
  Smartphone,
  ShieldAlert,
  FileCheck2,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  GitCompareArrows,
  Webhook,
  Settings,
} from 'lucide-react';

interface GlobalMetrics {
  totalMerchants: number;
  activeMerchants: number;
  totalOrders: number;
  paidOrdersCount: number;
  totalGMV: number;
  todayGMV: number;
  conversionRate: string;
  totalDevices: number;
  onlineDevicesCount: number;
  offlineDevicesCount: number;
  openRiskAlertsCount: number;
  pendingKycCount: number;
}

interface ProviderHealth {
  name: string;
  status: string;
  latencyMs: number;
}

interface SystemHealth {
  version?: string;
  uptime: number;
  mongoConnected: boolean;
  dbLatencyMs: number | null;
  memoryUsage?: { rss?: number; heapUsed?: number };
  providers: ProviderHealth[];
  timestamp: string;
}

const formatCurrency = (rupees?: number) =>
  `₹${(rupees ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatUptime = (seconds?: number) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${total % 60}s`;
};

export const SuperAdminOverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        adminApi.get('/metrics'),
        adminApi.get('/system-health'),
      ]);

      if (metricsRes.data?.success) {
        setMetrics(metricsRes.data.data);
      }
      if (healthRes.data?.success) {
        setHealth(healthRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const suspendedMerchants = metrics
    ? Math.max(0, metrics.totalMerchants - metrics.activeMerchants)
    : 0;
  const memoryMb = health?.memoryUsage?.rss
    ? Math.round(health.memoryUsage.rss / (1024 * 1024))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Platform Master Overview
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Live SumioPay telemetry across all merchant ledgers, UPI routers, and Android listeners
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Priority Attention Banner */}
      {metrics && (metrics.openRiskAlertsCount > 0 || metrics.pendingKycCount > 0) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-200">Action Required Across Platform Queues</p>
              <p className="text-amber-300/80 mt-0.5">
                {metrics.pendingKycCount} KYC submission(s) awaiting verification •{' '}
                {metrics.openRiskAlertsCount} unresolved security alert(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics.pendingKycCount > 0 && (
              <Link
                to="/superadmin/kyc"
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-extrabold hover:bg-amber-400 transition"
              >
                Review KYC ({metrics.pendingKycCount})
              </Link>
            )}
            {metrics.openRiskAlertsCount > 0 && (
              <Link
                to="/superadmin/risk"
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-extrabold hover:bg-rose-400 transition"
              >
                Inspect Risk ({metrics.openRiskAlertsCount})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Cumulative GMV (INR)</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {loading && !metrics ? '—' : formatCurrency(metrics?.totalGMV)}
          </p>
          <p className="text-[11px] text-emerald-400 font-semibold mt-1">
            Today: {formatCurrency(metrics?.todayGMV)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Merchant Ecosystem</span>
            <Store className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {loading && !metrics ? '—' : metrics?.totalMerchants ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{metrics?.activeMerchants ?? 0} active</span>
            {' • '}
            <span className={suspendedMerchants > 0 ? 'text-rose-400 font-semibold' : ''}>
              {suspendedMerchants} suspended
            </span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Settled Orders</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {loading && !metrics ? '—' : (metrics?.paidOrdersCount ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics?.totalOrders ?? 0} total • Conversion{' '}
            <span className="text-indigo-300 font-bold">{metrics?.conversionRate || '0%'}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Android Listener Fleet</span>
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {loading && !metrics ? '—' : `${metrics?.onlineDevicesCount ?? 0} / ${metrics?.totalDevices ?? 0}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{metrics?.onlineDevicesCount ?? 0} online</span>
            {' • '}
            <span>{metrics?.offlineDevicesCount ?? 0} offline (&gt;2m)</span>
          </p>
        </div>
      </div>

      {/* Infrastructure & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Live Runtime & Engine Health</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span
                className={`px-2 py-0.5 rounded-full font-bold border ${
                  health?.mongoConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {health ? (health.mongoConnected ? 'MongoDB Connected' : 'MongoDB Offline') : 'Checking...'}
              </span>
              {health?.version && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {health.version}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-500 text-[11px]">Process Uptime</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {formatUptime(health?.uptime)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-500 text-[11px]">DB Ping Latency</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {health?.dbLatencyMs !== null && health?.dbLatencyMs !== undefined
                  ? `${health.dbLatencyMs} ms`
                  : '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-500 text-[11px]">Backend Memory (RSS)</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {memoryMb !== null ? `${memoryMb} MB` : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {(health?.providers || []).map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      p.status === 'HEALTHY'
                        ? 'text-emerald-400'
                        : p.status === 'DEGRADED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-200">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">{p.latencyMs}ms</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      p.status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : p.status === 'DEGRADED'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governor Shortcuts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">Governor Quick Controls</h2>
          <p className="text-xs text-slate-400">
            Jump directly to operational modules across the SuperAdmin workspace.
          </p>

          <div className="space-y-2 pt-1">
            {[
              {
                to: '/superadmin/merchants',
                label: 'Merchant Directory',
                sub: `${metrics?.totalMerchants ?? 0} accounts`,
                icon: Store,
              },
              {
                to: '/superadmin/subscriptions',
                label: 'Billing & Invoices',
                sub: 'Plans, trials & manual bills',
                icon: CreditCard,
              },
              {
                to: '/superadmin/reconciliation',
                label: 'Unmapped Credits',
                sub: 'Match orphan UTR transfers',
                icon: GitCompareArrows,
              },
              {
                to: '/superadmin/webhooks',
                label: 'Webhook Delivery Logs',
                sub: 'Inspect HTTP callbacks',
                icon: Webhook,
              },
              {
                to: '/superadmin/kyc',
                label: 'KYC Verification Queue',
                sub: `${metrics?.pendingKycCount ?? 0} pending review`,
                icon: FileCheck2,
              },
              {
                to: '/superadmin/settings',
                label: 'Platform Settings',
                sub: 'Collector merchant & pricing',
                icon: Settings,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 transition group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOverviewPage;

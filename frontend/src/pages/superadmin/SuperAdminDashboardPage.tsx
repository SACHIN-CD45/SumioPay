import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Smartphone,
  CreditCard,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  ClipboardList,
  Check,
  X,
  Receipt,
  Edit,
  DollarSign,
  SlidersHorizontal,
  Globe,
  Server,
  AlertOctagon,
  CheckCircle,
  Save,
  Radio,
} from 'lucide-react';

export const SuperAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [kycList, setKycList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'merchants' | 'kyc' | 'security' | 'subscriptions' | 'devices' | 'orders' | 'audit' | 'settings'>('merchants');

  // KYC Rejection Modal state
  const [rejectingOrg, setRejectingOrg] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Subscription Edit Modal state
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editTier, setEditTier] = useState<string>('STARTER');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editPriceRupees, setEditPriceRupees] = useState<number>(1999);
  const [savingSub, setSavingSub] = useState<boolean>(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [mRes, merRes, devRes, ordRes, kycRes, alertRes, auditRes, subRes, subMetRes, setRes] = await Promise.all([
        adminApi.get('/metrics'),
        adminApi.get('/merchants'),
        adminApi.get('/devices'),
        adminApi.get('/orders'),
        adminApi.get('/kyc'),
        adminApi.get('/security-alerts'),
        adminApi.get('/audit-logs'),
        adminApi.get('/subscriptions'),
        adminApi.get('/subscriptions/metrics'),
        adminApi.get('/settings'),
      ]);

      if (mRes.data.success) setMetrics(mRes.data.data);
      if (merRes.data.success) setMerchants(merRes.data.data.merchants);
      if (devRes.data.success) setDevices(devRes.data.data);
      if (ordRes.data.success) setOrders(ordRes.data.data.orders);
      if (kycRes.data.success) setKycList(kycRes.data.data);
      if (alertRes.data.success) setAlerts(alertRes.data.data);
      if (auditRes.data.success) setAuditLogs(auditRes.data.data);
      if (subRes.data.success) setSubscriptions(subRes.data.data);
      if (subMetRes.data.success) setSubMetrics(subMetRes.data.data);
      if (setRes.data.success) setPlatformSettings(setRes.data.data);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('sumiopay_superadmin_token');
        navigate('/superadmin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleMerchant = async (merchantId: string, currentStatus: boolean) => {
    try {
      await adminApi.patch(`/merchants/${merchantId}/toggle-status`, {
        isActive: !currentStatus,
      });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle merchant status');
    }
  };

  const handleUpdateKyc = async (orgId: string, status: string, reason = '') => {
    try {
      await adminApi.patch(`/kyc/${orgId}`, {
        kycStatus: status,
        kycRejectionReason: reason,
      });
      setRejectingOrg(null);
      setRejectionReason('');
      fetchAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await adminApi.patch(`/security-alerts/${alertId}/resolve`);
      fetchAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEditSub = (sub: any) => {
    setEditingSub(sub);
    setEditTier(sub.planTier || 'STARTER');
    setEditStatus(sub.status || 'ACTIVE');
    setEditPriceRupees(Math.round((sub.monthlyPriceInPaise || 199900) / 100));
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    try {
      setSavingSub(true);
      await adminApi.patch(`/subscriptions/${editingSub.merchantId}/tier`, {
        planTier: editTier,
        status: editStatus,
        customPriceInPaise: editPriceRupees * 100,
      });
      setEditingSub(null);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update subscription');
    } finally {
      setSavingSub(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformSettings) return;
    try {
      setSavingSettings(true);
      const res = await adminApi.patch('/settings', platformSettings);
      if (res.data.success) {
        setPlatformSettings(res.data.data);
        alert('Global platform controls updated & live across all apps!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save platform controls');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sumiopay_superadmin_token');
    navigate('/superadmin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-xs">
      {/* Top Header */}
      <header className="h-16 border-b border-amber-200/80 bg-white px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              SumioPay Master SuperAdmin
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                Platform Governance & Risk
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchAll}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Merchant Portal
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Global Platform GMV</div>
            <div className="text-2xl font-black text-slate-900">₹{metrics?.totalGMV?.toLocaleString('en-IN') || '0.00'}</div>
            <div className="text-emerald-700 text-[10px] mt-1 font-bold">₹{metrics?.todayGMV?.toLocaleString('en-IN') || '0.00'} Today</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Active Merchants</div>
            <div className="text-2xl font-black text-slate-900">{metrics?.activeMerchants || 0} / {metrics?.totalMerchants || 0}</div>
            <div className="text-blue-700 text-[10px] mt-1 font-bold">{metrics?.pendingKycCount || 0} Pending KYC Reviews</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Risk & Fraud Alerts</div>
            <div className="text-2xl font-black text-amber-600">{metrics?.openRiskAlertsCount || 0}</div>
            <div className="text-amber-800 text-[10px] mt-1 font-bold">Requires Admin Inspection</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[11px] font-semibold mb-1">Listener Telemetry</div>
            <div className="text-2xl font-black text-slate-900">{metrics?.onlineDevicesCount || 0} Online</div>
            <div className="text-slate-400 text-[10px] mt-1 font-bold">{metrics?.totalDevices || 0} Total Linked Hardware</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'merchants' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Merchants ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'kyc' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>KYC Onboarding ({kycList.filter((k) => k.kycStatus === 'SUBMITTED').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'security' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Risk Alerts ({alerts.filter((a) => !a.isResolved).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'subscriptions' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Subscriptions & Pricing ({subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'devices' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phones & Listeners ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'orders' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Global Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Platform Controls & Settings</span>
          </button>
        </div>

        {/* Merchants Tab Content */}
        {activeTab === 'merchants' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="p-4 font-semibold">Business Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">UPI VPA</th>
                  <th className="p-4 font-semibold">Phones</th>
                  <th className="p-4 font-semibold">GMV Volume</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {merchants.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 font-bold text-slate-900">{m.businessName}</td>
                    <td className="p-4 text-slate-600">{m.email}</td>
                    <td className="p-4 font-mono text-blue-600 font-bold">{m.upiId}</td>
                    <td className="p-4">{m.deviceCount || 0}</td>
                    <td className="p-4 font-bold text-slate-900">₹{m.totalGmv?.toFixed(2) || '0.00'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {m.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleMerchant(m._id, m.isActive)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                      >
                        {m.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* KYC Workflows Tab */}
        {activeTab === 'kyc' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {kycList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No organizations submitted for KYC verification yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="p-4 font-semibold">Legal Entity</th>
                    <th className="p-4 font-semibold">PAN Number</th>
                    <th className="p-4 font-semibold">GSTIN</th>
                    <th className="p-4 font-semibold">Billing Email</th>
                    <th className="p-4 font-semibold">KYC Status</th>
                    <th className="p-4 font-semibold text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kycList.map((org) => (
                    <tr key={org._id} className="hover:bg-slate-50/60">
                      <td className="p-4 font-bold text-slate-900">{org.legalEntityName || org.name}</td>
                      <td className="p-4 font-mono">{org.panNumber || '—'}</td>
                      <td className="p-4 font-mono">{org.gstin || '—'}</td>
                      <td className="p-4 text-slate-600">{org.billingEmail}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            org.kycStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : org.kycStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {org.kycStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {org.kycStatus !== 'VERIFIED' && (
                            <button
                              onClick={() => handleUpdateKyc(org._id, 'VERIFIED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px]"
                            >
                              Approve
                            </button>
                          )}
                          {org.kycStatus !== 'REJECTED' && (
                            <button
                              onClick={() => setRejectingOrg(org)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px]"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Risk Alerts Tab */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Zero active security threats detected. Defense-in-depth secure.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="p-4 font-semibold">Severity</th>
                    <th className="p-4 font-semibold">Event Type</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold text-right">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((alt) => (
                    <tr key={alt._id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alt.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : alt.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alt.severity}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800">{alt.eventType}</td>
                      <td className="p-4 text-slate-600 max-w-md">{alt.description}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alt.isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {alt.isResolved ? 'RESOLVED' : 'ACTIVE_ALERT'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(alt.createdAt).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        {!alt.isResolved && (
                          <button
                            onClick={() => handleResolveAlert(alt._id)}
                            className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="p-4 font-semibold">Merchant</th>
                  <th className="p-4 font-semibold">Device Name</th>
                  <th className="p-4 font-semibold">Battery</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 font-bold text-slate-900">{d.merchant?.businessName || '—'}</td>
                    <td className="p-4 text-slate-600">{d.deviceName} ({d.deviceModel})</td>
                    <td className="p-4 font-bold">{d.batteryPercent}%</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{d.lastPingAt ? new Date(d.lastPingAt).toLocaleTimeString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Global Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="p-4 font-semibold">Order ID</th>
                  <th className="p-4 font-semibold">Merchant</th>
                  <th className="p-4 font-semibold">App</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">UTR</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 font-mono font-bold text-slate-900">{ord.orderId}</td>
                    <td className="p-4">{ord.merchantId?.businessName || '—'}</td>
                    <td className="p-4 font-bold text-blue-600">{ord.appName}</td>
                    <td className="p-4 font-bold text-slate-900">₹{ord.exactAmount.toFixed(2)}</td>
                    <td className="p-4 font-mono text-emerald-700 font-bold">{ord.utrNumber || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ord.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{new Date(ord.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="p-4 font-semibold">Action</th>
                  <th className="p-4 font-semibold">Actor Type</th>
                  <th className="p-4 font-semibold">Actor Email</th>
                  <th className="p-4 font-semibold">Resource</th>
                  <th className="p-4 font-semibold">IP Address</th>
                  <th className="p-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 font-mono">
                    <td className="p-4 font-bold text-blue-700">{log.action}</td>
                    <td className="p-4">{log.actorType}</td>
                    <td className="p-4 text-slate-600">{log.actorEmail}</td>
                    <td className="p-4">{log.resourceType}: {log.resourceId}</td>
                    <td className="p-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="p-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Subscriptions & Pricing Control Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Subscriptions Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[11px] font-semibold mb-1">Estimated MRR</div>
                <div className="text-2xl font-black text-emerald-600">
                  ₹{subMetrics?.estimatedMrr ? (subMetrics.estimatedMrr / 100).toLocaleString('en-IN') : '0'}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-bold">Monthly Recurring Revenue</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[11px] font-semibold mb-1">Projected ARR</div>
                <div className="text-2xl font-black text-slate-900">
                  ₹{subMetrics?.estimatedArr ? (subMetrics.estimatedArr / 100).toLocaleString('en-IN') : '0'}
                </div>
                <div className="text-emerald-700 text-[10px] mt-1 font-bold">Annualized Run-Rate</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[11px] font-semibold mb-1">Active Subscriptions</div>
                <div className="text-2xl font-black text-blue-600">
                  {subMetrics?.activeSubscribersCount || subscriptions.filter((s) => s.status === 'ACTIVE').length}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-bold">Across all merchant tenants</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[11px] font-semibold mb-1">Plan Distribution</div>
                <div className="text-xs font-bold text-slate-700 space-y-0.5 mt-1">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Starter:</span>
                    <span>{subMetrics?.tierBreakdown?.STARTER || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Growth:</span>
                    <span>{subMetrics?.tierBreakdown?.GROWTH || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Business / Ent:</span>
                    <span>{(subMetrics?.tierBreakdown?.BUSINESS || 0) + (subMetrics?.tierBreakdown?.ENTERPRISE || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscriptions Ledger Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Merchant Subscriptions & Tier Overrides</h3>
                  <p className="text-[11px] text-slate-500">
                    SuperAdmins have privileged authority to override subscription tiers, grant customized discounts, or manage merchant access levels.
                  </p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="p-4 font-semibold">Merchant Business</th>
                    <th className="p-4 font-semibold">Account Email</th>
                    <th className="p-4 font-semibold">Linked UPI VPA</th>
                    <th className="p-4 font-semibold">Current Tier</th>
                    <th className="p-4 font-semibold">Billed Price</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Period Renews</th>
                    <th className="p-4 font-semibold text-right">SuperAdmin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => {
                    const tierBadgeColors: Record<string, string> = {
                      FREE: 'bg-slate-100 text-slate-700 border-slate-200',
                      STARTER: 'bg-blue-50 text-blue-700 border-blue-200',
                      GROWTH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      PRO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      BUSINESS: 'bg-purple-50 text-purple-700 border-purple-200',
                      ENTERPRISE: 'bg-amber-50 text-amber-800 border-amber-200',
                    };

                    const statusBadgeColors: Record<string, string> = {
                      ACTIVE: 'bg-emerald-100 text-emerald-800',
                      TRIALING: 'bg-blue-100 text-blue-800',
                      PAST_DUE: 'bg-amber-100 text-amber-800',
                      CANCELED: 'bg-rose-100 text-rose-800',
                    };

                    return (
                      <tr key={sub.merchantId} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 font-bold text-slate-900">{sub.businessName}</td>
                        <td className="p-4 text-slate-600 font-mono text-[11px]">{sub.email}</td>
                        <td className="p-4 font-mono text-slate-500 text-[11px]">{sub.upiId || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierBadgeColors[sub.planTier] || 'bg-slate-100 text-slate-700'}`}>
                            {sub.planTier}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          ₹{(sub.monthlyPriceInPaise / 100).toLocaleString('en-IN')}
                          <span className="text-[10px] font-normal text-slate-400">/mo</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeColors[sub.status] || 'bg-slate-100 text-slate-700'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px]">
                          {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenEditSub(sub)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold text-[11px] transition inline-flex items-center gap-1.5 border border-slate-200"
                          >
                            <Edit className="w-3 h-3 text-amber-700" />
                            <span>Edit Tier & Price</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {subscriptions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No active merchant subscriptions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Global Platform Controls & Settings Tab */}
        {activeTab === 'settings' && platformSettings && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                  <span>Platform Master Control & Feature Flags</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Configure marketing announcements, gateway operating modes, enterprise social proof metrics, and core engine feature flags.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving...' : 'Deploy Global Configuration'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Marketing Announcement Bar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900">Marketing Announcement Bar</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={platformSettings.isAnnouncementActive}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, isAnnouncementActive: e.target.checked })
                      }
                      className="rounded accent-blue-600 w-4 h-4"
                    />
                    <span>Active on Landing Page</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Banner Announcement Text</label>
                    <input
                      type="text"
                      value={platformSettings.announcementText || ''}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, announcementText: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Action Link</label>
                    <input
                      type="text"
                      value={platformSettings.announcementLink || ''}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, announcementLink: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 text-white text-[11px] space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Live Bar Preview:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[9px] uppercase">
                        Active
                      </span>
                      <span className="truncate">{platformSettings.announcementText}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Operating Mode & Gateway Protection */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-sm text-slate-900">Platform Operating Gate</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Scheduled Maintenance Mode</div>
                      <div className="text-[10px] text-slate-500">Temporarily suspends new order generation for updates.</div>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={platformSettings.maintenanceMode}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })
                        }
                        className="rounded accent-amber-600 w-5 h-5"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Maintenance Banner Message</label>
                    <textarea
                      rows={2}
                      value={platformSettings.maintenanceMessage || ''}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, maintenanceMessage: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Allow New Merchant Registrations</div>
                      <div className="text-[10px] text-slate-500">Permit self-serve merchant account signups.</div>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={platformSettings.allowNewMerchantRegistrations}
                        onChange={(e) =>
                          setPlatformSettings({ ...platformSettings, allowNewMerchantRegistrations: e.target.checked })
                        }
                        className="rounded accent-blue-600 w-5 h-5"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 3: Enterprise Social Proof & Metrics */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900">Enterprise Social Proof & Claims</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Displayed Platform GMV</label>
                    <input
                      type="text"
                      value={platformSettings.totalPlatformGMVFormatted || '₹50+ Cr'}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, totalPlatformGMVFormatted: e.target.value })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Businesses Connected</label>
                    <input
                      type="number"
                      value={platformSettings.totalBusinessesCount || 1250}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, totalBusinessesCount: Number(e.target.value) })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">SLA Guarantee %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={platformSettings.slaGuaranteePercent || 99.98}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, slaGuaranteePercent: Number(e.target.value) })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Enterprise Contact Email</label>
                    <input
                      type="email"
                      value={platformSettings.enterpriseContactEmail || ''}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, enterpriseContactEmail: e.target.value })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Engine Feature Flags */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Engine Feature Flags</h3>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    { key: 'enableAutoReconciliation', label: 'Automated 12-Digit UTR + Minor Units Reconciler' },
                    { key: 'enableDelayedPaymentRescue', label: 'Delayed Payment Rescue Desk' },
                    { key: 'enableSandboxSimulator', label: 'In-Browser Sandbox Simulator' },
                    { key: 'enableDeviceHeartbeatAlerts', label: 'Android Listener Battery & Network Telemetry Heartbeat' },
                    { key: 'enableDynamicPaiseEngine', label: 'Intelligent Fractional Paise Collision Avoidance' },
                  ].map((flag) => (
                    <label
                      key={flag.key}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800">{flag.label}</span>
                      <input
                        type="checkbox"
                        checked={platformSettings.featureFlags?.[flag.key] ?? true}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            featureFlags: {
                              ...platformSettings.featureFlags,
                              [flag.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded accent-emerald-600 w-4 h-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Deploying Changes...' : 'Save & Publish Platform Controls'}</span>
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Subscription Tier Override Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Override Merchant Subscription</h3>
                <p className="text-xs text-slate-500">{editingSub.businessName} ({editingSub.email})</p>
              </div>
              <button
                onClick={() => setEditingSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Subscription Plan Tier</label>
                <select
                  value={editTier}
                  onChange={(e) => {
                    const newTier = e.target.value;
                    setEditTier(newTier);
                    const defaultPrices: Record<string, number> = {
                      STARTER: 1999,
                      GROWTH: 4999,
                      BUSINESS: 11999,
                      ENTERPRISE: 29999,
                    };
                    if (defaultPrices[newTier]) {
                      setEditPriceRupees(defaultPrices[newTier]);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="STARTER">STARTER — ₹1,999 / mo (1 Phone, Standard Limits)</option>
                  <option value="GROWTH">GROWTH — ₹4,999 / mo (3 Phones, High Volume)</option>
                  <option value="BUSINESS">BUSINESS — ₹11,999 / mo (10 Phones, Multi-App Router)</option>
                  <option value="ENTERPRISE">ENTERPRISE — ₹29,999 / mo (Unlimited, Dedicated SLA)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Full access)</option>
                  <option value="TRIALING">TRIALING (Complimentary grace period)</option>
                  <option value="PAST_DUE">PAST_DUE (Payment pending)</option>
                  <option value="CANCELED">CANCELED (Access restricted)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Custom Monthly Price (₹ INR)
                  <span className="text-slate-400 font-normal ml-1">Allows custom SuperAdmin override / discount</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editPriceRupees}
                    onChange={(e) => setEditPriceRupees(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Privileged Action:</strong> Modifying plan tier will immediately update merchant limits in real-time, adjust billing schedule, and log an auditable event in the master security trail.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {savingSub ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC Rejection Reason Modal */}
      {rejectingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reject KYC Verification</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify rejection reason for {rejectingOrg.legalEntityName || rejectingOrg.name}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateKyc(rejectingOrg._id, 'REJECTED', rejectionReason);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Rejection Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. GSTIN mismatch or invalid PAN proof document."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingOrg(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboardPage;

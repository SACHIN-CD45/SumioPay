import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Search,
  RefreshCw,
  Smartphone,
  BatteryCharging,
  Battery,
  Trash2,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';

interface DeviceRow {
  _id: string;
  merchant?: {
    _id: string;
    businessName?: string;
    email?: string;
    upiId?: string;
  };
  deviceName: string;
  deviceModel?: string;
  androidVersion?: string;
  batteryPercent?: number;
  isCharging?: boolean;
  status: 'ONLINE' | 'OFFLINE';
  lastPingAt?: string;
  createdAt: string;
}

export const SuperAdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/devices');
      if (res.data?.success) {
        setDevices(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load companion listener devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevokeDevice = async (device: DeviceRow) => {
    if (!window.confirm(`Force disconnect & remove listener device "${device.deviceName}"?`)) {
      return;
    }
    setRevokingId(device._id);
    setError(null);
    try {
      const res = await adminApi.delete(`/devices/${device._id}`);
      if (res.data?.success) {
        setDevices((prev) => prev.filter((d) => d._id !== device._id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to revoke device');
    } finally {
      setRevokingId(null);
    }
  };

  const filtered = devices.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.deviceName?.toLowerCase().includes(q) ||
      d.deviceModel?.toLowerCase().includes(q) ||
      d.merchant?.businessName?.toLowerCase().includes(q) ||
      d.merchant?.email?.toLowerCase().includes(q)
    );
  });

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Global Android Listener Fleet
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Monitor paired merchant companion phones, heartbeat status, battery state, and force-revoke compromised devices
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDevices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Total Paired Devices</p>
          <p className="text-xl font-black text-white mt-1">{devices.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Online (&lt; 2m Heartbeat)</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{onlineCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-400 font-semibold">Offline / Stale</p>
          <p className="text-xl font-black text-rose-400 mt-1">{devices.length - onlineCount}</p>
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
            placeholder="Search device name, model, business, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start">
          {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((tab) => (
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

      {/* Devices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Device & Model</th>
                <th className="py-3.5 px-4">Merchant Owner</th>
                <th className="py-3.5 px-4">Power & Battery</th>
                <th className="py-3.5 px-4">OS Release</th>
                <th className="py-3.5 px-4">Last Heartbeat</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading paired devices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No companion listener devices matched your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-800/35 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-100">{d.deviceName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {d.deviceModel || 'Android Device'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">
                        {d.merchant?.businessName || 'Unassigned'}
                      </p>
                      <p className="text-[11px] text-slate-400">{d.merchant?.email || '—'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                        {d.isCharging ? (
                          <BatteryCharging className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Battery className="w-4 h-4 text-slate-400" />
                        )}
                        <span>
                          {d.batteryPercent !== undefined ? `${d.batteryPercent}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      Android {d.androidVersion || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {d.lastPingAt ? new Date(d.lastPingAt).toLocaleString('en-IN') : 'Never'}
                    </td>
                    <td className="py-3.5 px-4">
                      {d.status === 'ONLINE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <Wifi className="w-3 h-3" /> ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          <WifiOff className="w-3 h-3" /> OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeDevice(d)}
                        disabled={revokingId === d._id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-[11px] font-bold transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{revokingId === d._id ? 'Revoking...' : 'Revoke'}</span>
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

export default SuperAdminDevicesPage;

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  BatteryCharging,
  Battery,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const SuperAdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/devices');
      if (res.data.success) {
        setDevices(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Devices]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filtered = devices.filter((d) =>
    d.deviceName?.toLowerCase().includes(search.toLowerCase()) ||
    d.deviceModel?.toLowerCase().includes(search.toLowerCase()) ||
    d.merchant?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-amber-400" />
            Companion Android Listener Monitor
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Global heartbeat telemetry for all merchant Android hardware running the SumioPay notification interceptor service.
          </p>
        </div>

        <button
          onClick={fetchDevices}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh Hardware Status</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Active Listeners:</span>
          <span className="text-emerald-400 font-bold text-base">
            {devices.filter((d) => d.status === 'ONLINE').length} ONLINE
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Dormant / Offline:</span>
          <span className="text-slate-500 font-bold text-base">
            {devices.filter((d) => d.status === 'OFFLINE').length} OFFLINE
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 font-sans">Total Hardware Deployed:</span>
          <span className="text-amber-400 font-bold text-base">
            {devices.length} Phones
          </span>
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
            placeholder="Search by device model, merchant, or hardware name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Devices Grid / Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Hardware Device</th>
                <th className="py-3.5 px-4">Merchant Entity</th>
                <th className="py-3.5 px-4">Battery Level</th>
                <th className="py-3.5 px-4">Android OS</th>
                <th className="py-3.5 px-4">Heartbeat Ping</th>
                <th className="py-3.5 px-5 text-right">Telemetry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No companion devices found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        {d.deviceName || 'Android Device'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{d.deviceModel || 'Generic Android'}</div>
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <div className="text-slate-200 font-medium text-xs">{d.merchant?.businessName || 'Merchant'}</div>
                      <div className="text-[10px] text-amber-400/80 font-mono">{d.merchant?.upiId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        {d.isCharging ? (
                          <BatteryCharging className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Battery className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{d.batteryPercent !== undefined ? `${d.batteryPercent}%` : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      API {d.androidVersion || '33'}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {d.lastPingAt ? new Date(d.lastPingAt).toLocaleTimeString('en-IN') : 'Never'}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      {d.status === 'ONLINE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <Wifi className="w-3 h-3" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px]">
                          <WifiOff className="w-3 h-3" />
                          OFFLINE
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
    </div>
  );
};

export default SuperAdminDevicesPage;

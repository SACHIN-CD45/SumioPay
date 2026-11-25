import React, { useState, useEffect } from 'react';
import { api, API_BASE } from '../../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Shield,
  HelpCircle,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingData, setPairingData] = useState<any>(null);
  const [pairLoading, setPairLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/device/my-devices');
      if (res.data.success) {
        setDevices(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPairing = async () => {
    try {
      setPairLoading(true);
      const res = await api.post('/device/generate-pairing-token', {
        deviceName: `Android Phone (${new Date().toLocaleDateString()})`,
      });
      if (res.data.success) {
        setPairingData(res.data.data);
        setIsPairingModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start pairing');
    } finally {
      setPairLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to unlink this listener phone?')) return;
    try {
      await api.delete(`/device/${deviceId}`);
      fetchDevices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-600" />
            Android Listener Phones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Install the SumioPay Capacitor APK on an Android device to auto-intercept bank SMS & notification alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartPairing}
            disabled={pairLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Pair New Android Device
          </button>
          <button
            onClick={fetchDevices}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-subtle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Step 1: Download & Pair Companion APK Card */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold uppercase tracking-wider border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Step 1: Download Companion Android APK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Get the SumioPay Background Listener for Your Phone
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Install this lightweight application on any Android phone (version 7.0+) that receives incoming bank credit alerts. It intercepts UPI notifications from PhonePe, GPay, Paytm, BHIM, and bank SMS in &lt;1.2 seconds with zero battery drain.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`${API_BASE}/public/download-apk`}
                download="SumioPayListener-v2.4.apk"
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Download SumioPayListener.apk (v2.4)</span>
              </a>
              <button
                onClick={handleStartPairing}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Generate Pairing QR Code</span>
              </button>
            </div>
          </div>

          {/* Direct Phone Download QR Code */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center flex flex-col items-center space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Scan with Phone to Download APK
            </span>
            <div className="p-3 bg-white rounded-xl shadow-inner inline-block">
              <QRCodeSVG
                value={`${window.location.origin}/api/public/download-apk`}
                size={140}
                level="M"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Direct Phone Camera Scan
            </span>
          </div>
        </div>

        {/* 4 Steps Visual Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px]">
              <span>1. Install APK</span>
            </div>
            <p className="text-[10px] text-slate-400">Enable &quot;Install from unknown sources&quot; in Chrome/Files.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <span>2. Notification Access</span>
            </div>
            <p className="text-[10px] text-slate-400">Toggle ON notification listener permission for SumioPay.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
              <span>3. Battery Optimization</span>
            </div>
            <p className="text-[10px] text-slate-400">Select &quot;Unrestricted / Don&apos;t Optimize&quot; so service never dies.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-[11px]">
              <span>4. Scan Pairing QR</span>
            </div>
            <p className="text-[10px] text-slate-400">Tap &quot;Pair Device&quot; on dashboard and scan with phone.</p>
          </div>
        </div>
      </div>

      {/* Connected Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{dev.deviceName}</h3>
                  <p className="text-[11px] text-slate-500">{dev.deviceModel} • Android {dev.androidVersion}</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  dev.status === 'ONLINE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dev.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {dev.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Battery & Power</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  {dev.isCharging ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Battery className="w-4 h-4 text-slate-500" />
                  )}
                  {dev.batteryPercent}% {dev.isCharging ? '(Charging)' : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Last Active Ping</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {dev.lastPingAt ? new Date(dev.lastPingAt).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-slate-400">ID: {dev.id.slice(-8)}</span>
              <button
                onClick={() => handleDeleteDevice(dev.id)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Unlink Phone
              </button>
            </div>
          </div>
        ))}

        {devices.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Listener Phone Paired Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Click the button below to generate a pairing QR code and link your Android smartphone in 10 seconds.
            </p>
            <button
              onClick={handleStartPairing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Pair Phone Now
            </button>
          </div>
        )}
      </div>

      {/* Pairing Instructions Banner */}
      <div className="p-6 rounded-3xl bg-blue-50/60 border border-blue-200/60 space-y-3">
        <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          How the Single Android APK Listener Works
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-950">
          <li>Install the lightweight <span className="font-mono text-blue-800 font-bold">SumioPayListener.apk</span> on any spare Android phone.</li>
          <li>Open the app and grant <span className="font-bold">Notification Access</span> permission.</li>
          <li>Scan the Pairing QR code or paste your Pairing Token to pair the device.</li>
          <li>That's it! When customer payments land in PhonePe, Paytm, GPay, BHIM, or Bank SMS, payments auto-verify in 1-2 seconds.</li>
        </ol>
      </div>

      {/* Pairing QR Code Modal */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <QrCode className="w-5 h-5 text-blue-600" />
              Scan QR in SumioPay APK
            </h3>
            <p className="text-xs text-slate-500">
              Open the Android Listener app on your phone and point the camera at this QR code.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-subtle">
              <QRCodeSVG
                value={pairingData?.pairingPayloadJson || pairingData?.pairingToken || ''}
                size={200}
                level="M"
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-800 break-all text-left">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Pairing Token:</span>
              {pairingData?.pairingToken}
            </div>

            <button
              onClick={() => {
                setIsPairingModalOpen(false);
                fetchDevices();
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;

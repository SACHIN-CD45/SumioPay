import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { api } from '../../lib/api';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface UpiAccount {
  id: string;
  label: string;
  upiId: string;
  upiName: string;
  bankName?: string;
  isActive: boolean;
  isPrimary: boolean;
  dailyLimitInr: number;
  todayVolumeInr: number;
  totalVolumeInr: number;
  totalTransactions: number;
}

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable Profile Form Fields
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [routingMode, setRoutingMode] = useState<'PRIMARY_ONLY' | 'ROUND_ROBIN' | 'FAILOVER'>('PRIMARY_ONLY');

  // Add New UPI / Upload Bank QR Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [newUpiName, setNewUpiName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newDailyLimit, setNewDailyLimit] = useState<number>(0);
  const [newMakePrimary, setNewMakePrimary] = useState<boolean>(true);
  const [qrDecodeStatus, setQrDecodeStatus] = useState<string | null>(null);
  const [savingNewUpi, setSavingNewUpi] = useState<boolean>(false);

  // QR Standee / Counter Preview Modal
  const [previewQrAccount, setPreviewQrAccount] = useState<UpiAccount | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/profile');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setProfile(d);
        setOwnerName(d.name || '');
        setBusinessName(d.businessName || '');
        setPhone(d.phone || '');
        setWebhookUrl(d.webhookUrl || '');
        setRoutingMode(d.upiRoutingMode || 'PRIMARY_ONLY');
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to load merchant profile',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusBanner(null);
    try {
      const res = await api.put('/merchant/profile', {
        name: ownerName,
        businessName,
        phone,
        webhookUrl,
        upiRoutingMode: routingMode,
      });
      if (res.data.success) {
        setStatusBanner({ type: 'success', text: 'Business profile saved cleanly.' });
        await fetchProfile();
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.response?.data?.message || 'Could not update profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRoutingChange = async (mode: 'PRIMARY_ONLY' | 'ROUND_ROBIN' | 'FAILOVER') => {
    setRoutingMode(mode);
    setStatusBanner(null);
    try {
      const res = await api.patch('/merchant/upi-routing', { upiRoutingMode: mode });
      if (res.data.success) {
        setStatusBanner({ type: 'success', text: `Routing mode updated to ${mode.replace('_', ' ')}` });
        await fetchProfile();
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update routing mode',
      });
    }
  };

  const decodeUploadedQrFile = (file: File) => {
    setQrDecodeStatus('Scanning uploaded QR code...');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const tryDecode = (maxDim: number) => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          return jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
        };

        const decoded = tryDecode(1200) || tryDecode(600) || tryDecode(img.width);
        if (!decoded?.data) {
          setQrDecodeStatus(
            'Could not read QR from image. Upload a clearer screenshot of your PhonePe / Paytm / GPay / Bank QR, or enter UPI ID manually.'
          );
          return;
        }

        const raw = decoded.data.trim();
        if (raw.toLowerCase().startsWith('upi://pay')) {
          try {
            const q = raw.includes('?') ? raw.split('?')[1] : '';
            const params = new URLSearchParams(q);
            const pa = (params.get('pa') || '').trim();
            const pn = (params.get('pn') || '').trim();
            if (pa) {
              setNewUpiId(pa);
              if (pn) setNewUpiName(pn);
              if (!newLabel) setNewLabel(pn ? `${pn} QR` : 'Uploaded Bank QR');
              setQrDecodeStatus(`QR decoded successfully: ${pa}${pn ? ` (${pn})` : ''}`);
              return;
            }
          } catch {}
        }

        if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(raw)) {
          setNewUpiId(raw);
          setQrDecodeStatus(`Decoded UPI ID: ${raw}`);
          return;
        }

        setQrDecodeStatus(`QR read ("${raw.slice(0, 40)}...") — does not look like a UPI payment QR.`);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewUpi(true);
    setStatusBanner(null);
    try {
      const res = await api.post('/merchant/upi-accounts', {
        label: newLabel || newBankName || 'Bank UPI',
        upiId: newUpiId,
        upiName: newUpiName || businessName,
        bankName: newBankName,
        dailyLimitInr: newDailyLimit,
        makePrimary: newMakePrimary,
      });
      if (res.data.success) {
        setAddModalOpen(false);
        setNewLabel('');
        setNewUpiId('');
        setNewUpiName('');
        setNewBankName('');
        setNewDailyLimit(0);
        setQrDecodeStatus(null);
        setStatusBanner({ type: 'success', text: res.data.message || 'UPI account added!' });
        await fetchProfile();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add UPI account');
    } finally {
      setSavingNewUpi(false);
    }
  };

  const handleActivatePrimary = async (accountId: string) => {
    try {
      const res = await api.patch(`/merchant/upi-accounts/${accountId}`, { isPrimary: true });
      if (res.data.success) {
        setStatusBanner({ type: 'success', text: res.data.message });
        await fetchProfile();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to activate UPI account');
    }
  };

  const handleToggleActive = async (acc: UpiAccount) => {
    try {
      const res = await api.patch(`/merchant/upi-accounts/${acc.id}`, { isActive: !acc.isActive });
      if (res.data.success) {
        await fetchProfile();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not toggle UPI account state');
    }
  };

  const handleDeleteUpi = async (acc: UpiAccount) => {
    if (!confirm(`Remove UPI ID ${acc.upiId} from your profile?`)) return;
    try {
      const res = await api.delete(`/merchant/upi-accounts/${acc.id}`);
      if (res.data.success) {
        setStatusBanner({ type: 'success', text: `Removed ${acc.upiId}` });
        await fetchProfile();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not remove UPI account');
    }
  };

  const upiAccounts: UpiAccount[] = profile?.upiAccounts || [];

  if (loading && !profile) {
    return (
      <div className="p-12 flex items-center justify-center text-slate-500 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        Loading Merchant Profile &amp; UPI Bank Accounts...
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs mb-2 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Merchant Identity &amp; Multi-UPI Routing</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Profile, UPI Accounts &amp; Bank QR Setup
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Add multiple bank UPI IDs, upload any PhonePe / Paytm / GPay QR photo to auto-extract VPA, and switch or auto-rotate active settlement accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setQrDecodeStatus(null);
            setNewUpiName(businessName);
            setAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add UPI ID / Upload QR</span>
        </button>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Business Profile Details Card */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Business Profile Details</h2>
              <p className="text-[11px] text-slate-500">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
              Plan: {profile?.planTier || 'TRIAL'}
            </span>
            <Link
              to="/billing"
              className="text-blue-600 hover:text-blue-700 font-bold text-[11px] underline"
            >
              Manage Plan
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Business / Brand Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Phone / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Default Webhook Callback URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yoursite.com/api/webhook"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500">
            Active Primary UPI receiving orders:{' '}
            <strong className="font-mono text-emerald-700">{profile?.upiId}</strong>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition self-end"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingProfile ? 'Saving...' : 'Save Business Profile'}</span>
          </button>
        </div>
      </form>

      {/* Multi-UPI Routing Strategy Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Multi-UPI Payment Routing Mode</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Control how customer checkout orders distribute across your active bank UPI IDs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {[
            {
              mode: 'PRIMARY_ONLY' as const,
              title: 'Primary UPI Only',
              desc: '100% of orders route directly to the one UPI ID marked Primary Active.',
            },
            {
              mode: 'FAILOVER' as const,
              title: 'Daily Cap Failover',
              desc: 'Uses Primary UPI first; auto-switches to backup UPI when daily cap is reached.',
            },
            {
              mode: 'ROUND_ROBIN' as const,
              title: 'Smart Load Rotation',
              desc: 'Alternates new orders across all Active UPI handles to spread daily bank limits.',
            },
          ].map((opt) => {
            const active = routingMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => handleRoutingChange(opt.mode)}
                className={`p-4 rounded-2xl border text-left transition ${
                  active
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/15'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${active ? 'text-blue-900' : 'text-slate-900'}`}>
                    {opt.title}
                  </span>
                  {active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved UPI Accounts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Configured UPI Bank Handles ({upiAccounts.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {upiAccounts.map((acc) => {
            const limit = acc.dailyLimitInr || 0;
            const pct = limit > 0 ? Math.min(100, Math.round((acc.todayVolumeInr / limit) * 100)) : 0;

            return (
              <div
                key={acc.id}
                className={`p-5 rounded-2xl border bg-white flex flex-col justify-between space-y-4 transition ${
                  acc.isPrimary
                    ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm'
                    : acc.isActive
                    ? 'border-slate-200'
                    : 'border-slate-200 opacity-75 bg-slate-50/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-sm">{acc.label}</h3>
                        {acc.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            PRIMARY ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{acc.bankName || 'UPI Handle'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewQrAccount(acc)}
                      title="Show / Verify Bank QR"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-xs font-bold text-slate-900 break-all">
                    {acc.upiId}
                    <div className="text-[10px] font-sans font-medium text-slate-500 mt-0.5">
                      Payee Display Name: {acc.upiName}
                    </div>
                  </div>

                  {/* Daily & Lifetime Volume Metrics */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Today&apos;s Settled Volume</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{(acc.todayVolumeInr || 0).toLocaleString('en-IN')}
                        {limit > 0 ? ` / ₹${limit.toLocaleString('en-IN')}` : ' (Unlimited)'}
                      </span>
                    </div>
                    {limit > 0 && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      Lifetime: ₹{(acc.totalVolumeInr || 0).toLocaleString('en-IN')} across{' '}
                      {acc.totalTransactions || 0} txn(s)
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {!acc.isPrimary ? (
                    <button
                      type="button"
                      onClick={() => handleActivatePrimary(acc.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                    >
                      Activate Primary
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Primary
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(acc)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${
                        acc.isActive
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {acc.isActive ? 'Enabled' : 'Paused'}
                    </button>
                    {upiAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUpi(acc)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                        title="Remove UPI Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New UPI / Upload Bank QR Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Add New UPI ID or Upload Bank QR Code
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload PhonePe / Paytm / GPay / Bank QR Photo */}
            <label className="block p-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 cursor-pointer text-center space-y-1.5 transition">
              <Upload className="w-6 h-6 text-blue-600 mx-auto" />
              <div className="text-xs font-bold text-slate-900">
                Upload Existing Bank / PhonePe / Paytm / GPay QR Photo
              </div>
              <p className="text-[11px] text-slate-500">
                SumioPay will automatically decode your UPI VPA &amp; payee name from the QR image (PNG / JPG).
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) decodeUploadedQrFile(file);
                }}
              />
            </label>

            {qrDecodeStatus && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                {qrDecodeStatus}
              </div>
            )}

            <form onSubmit={handleAddUpi} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Account Label</label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. HDFC Current / Paytm Business"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">UPI VPA ID</label>
                  <input
                    type="text"
                    required
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    placeholder="merchant@okhdfcbank"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Payee Name (shown in UPI)</label>
                  <input
                    type="text"
                    value={newUpiName}
                    onChange={(e) => setNewUpiName(e.target.value)}
                    placeholder={businessName}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Daily Cap ₹ (0 = Unlimited)</label>
                  <input
                    type="number"
                    min={0}
                    value={newDailyLimit}
                    onChange={(e) => setNewDailyLimit(Number(e.target.value))}
                    placeholder="100000"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMakePrimary}
                  onChange={(e) => setNewMakePrimary(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-emerald-900">
                  Activate immediately as Primary UPI for checkouts
                </span>
              </label>

              {newUpiId.includes('@') && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                    <QRCodeSVG
                      value={`upi://pay?pa=${newUpiId.trim()}&pn=${encodeURIComponent(newUpiName || businessName || 'Merchant')}&cu=INR`}
                      size={74}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <div className="font-bold text-slate-900">Live QR Verification Preview</div>
                    <div>Scan this preview with any UPI app to confirm your bank name shows accurately before saving.</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewUpi}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
                >
                  {savingNewUpi ? 'Saving...' : 'Save UPI Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter / Test QR Preview Modal */}
      {previewQrAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">{previewQrAccount.label}</h3>
              <button
                onClick={() => setPreviewQrAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block">
              <QRCodeSVG
                id="sumiopay-counter-qr"
                value={`upi://pay?pa=${previewQrAccount.upiId}&pn=${encodeURIComponent(previewQrAccount.upiName)}&cu=INR`}
                size={200}
                level="H"
              />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-mono font-bold text-slate-900">{previewQrAccount.upiId}</div>
              <div className="text-slate-500">{previewQrAccount.upiName}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const svgEl = document.getElementById('sumiopay-counter-qr');
                if (!svgEl) return;
                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(svgEl);
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${previewQrAccount.upiId}-sumiopay-qr.svg`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Counter QR (.svg)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

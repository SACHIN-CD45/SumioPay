import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  SlidersHorizontal,
  Save,
  Globe,
  Radio,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Receipt,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

export const SuperAdminSettingsPage: React.FC = () => {
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/settings');
      if (res.data.success) {
        setPlatformSettings(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin Settings]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformSettings) return;
    setSavingSettings(true);
    setSavedSuccess(false);

    try {
      const res = await adminApi.patch('/settings', platformSettings);
      if (res.data.success) {
        setPlatformSettings(res.data.data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      alert('Failed to save platform settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || !platformSettings) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mr-2" />
        Loading platform governance settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-amber-400" />
            Platform Controls & Master Settings
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Global operational switches, public announcement banner, emergency maintenance gate, and enterprise social proof.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={savingSettings}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          <span>{savingSettings ? 'Saving Settings...' : 'Deploy Changes'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Platform settings deployed successfully and propagated to public cache.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Marketing Announcement Banner */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Radio className="w-4 h-4 text-amber-400" />
              <h2>Public Landing Announcement Banner</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.isAnnouncementActive}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, isAnnouncementActive: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Announcement Copy</label>
              <input
                type="text"
                value={platformSettings.announcementText || ''}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, announcementText: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Target Destination URL / Route</label>
              <input
                type="text"
                value={platformSettings.announcementLink || ''}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, announcementLink: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Emergency Maintenance Mode Gate */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <h2>Emergency Maintenance Gate</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.maintenanceMode}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Maintenance Banner Message for Customers</label>
            <textarea
              rows={2}
              value={platformSettings.maintenanceMessage || ''}
              onChange={(e) =>
                setPlatformSettings({ ...platformSettings, maintenanceMessage: e.target.value })
              }
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        {/* Section 3: Enterprise Social Proof Overrides */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Globe className="w-4 h-4 text-amber-400" />
            <h2>Enterprise Social Proof & Metrics (Landing Page)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Total Platform GMV Badge</label>
              <input
                type="text"
                value={platformSettings.totalPlatformGMVFormatted || '₹50+ Cr'}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, totalPlatformGMVFormatted: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Active Businesses Count</label>
              <input
                type="number"
                value={platformSettings.totalBusinessesCount || 1250}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, totalBusinessesCount: Number(e.target.value) })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">SLA Guarantee Percentage</label>
              <input
                type="number"
                step="0.01"
                value={platformSettings.slaGuaranteePercent || 99.98}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, slaGuaranteePercent: Number(e.target.value) })
                }
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Operational Feature Flags */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2>Core Engine Feature Flags</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div>
                <span className="font-semibold text-white">Allow Public Merchant Registrations</span>
                <p className="text-[11px] text-slate-500">Enable new businesses to self-onboard from the landing page</p>
              </div>
              <input
                type="checkbox"
                checked={platformSettings.allowNewMerchantRegistrations}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, allowNewMerchantRegistrations: e.target.checked })
                }
                className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <div>
                <span className="font-semibold text-white">Strict SMS Anti-Spoofing Detection</span>
                <p className="text-[11px] text-slate-500">Reject non-commercial sender alphanumeric headers (e.g. require AX-HDFCBK)</p>
              </div>
              <input
                type="checkbox"
                checked={platformSettings.featureFlags?.enableSmsSpoofDetection ?? true}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    featureFlags: {
                      ...platformSettings.featureFlags,
                      enableSmsSpoofDetection: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* Section 5: SumioPay Self-Billing Collector (Collect SumioPay Subscriptions via SumioPay) */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/30 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h2>SumioPay Self-Billing Collector (Collect SaaS Fees via SumioPay)</h2>
            </div>
            <span
              className={`text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full border ${
                platformSettings.collectorStatus?.configured
                  ? platformSettings.collectorStatus?.onlineDevicesCount > 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {platformSettings.collectorStatus?.configured
                ? platformSettings.collectorStatus?.onlineDevicesCount > 0
                  ? `ONLINE (${platformSettings.collectorStatus.onlineDevicesCount} Device)`
                  : 'UPI Set • Phone Offline'
                : 'Setup Required'}
            </span>
          </div>

          <p className="text-slate-400 text-xs">
            Link the SumioPay merchant account you created so when users upgrade on <code className="text-emerald-300">/billing</code> (₹399 or ₹1,999),
            payments go straight to your bank UPI ID and verify automatically via your Android Listener app.
          </p>

          {platformSettings.collectorStatus?.configured ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold">Active Collector: </span>
                <span>{platformSettings.collectorStatus.businessName}</span>{' '}
                <span className="font-mono text-emerald-300">({platformSettings.collectorStatus.email})</span>
                <div className="text-[11px] font-mono text-emerald-300/90 mt-0.5">
                  Receiving UPI: {platformSettings.collectorStatus.upiId} • Paired Phones:{' '}
                  {platformSettings.collectorStatus.onlineDevicesCount} online /{' '}
                  {platformSettings.collectorStatus.totalDevicesCount} total
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs">
              <strong>Not configured yet:</strong> Choose your SumioPay merchant account below (or type its email / API key) and click <strong>Deploy Changes</strong>.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">
                Quick-Pick Your SumioPay Merchant Account
              </label>
              <select
                value={platformSettings.platformBilling?.collectorMerchantEmail || ''}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    platformBilling: {
                      ...platformSettings.platformBilling,
                      collectorMerchantEmail: e.target.value,
                    },
                  })
                }
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">-- Select Merchant Account --</option>
                {(platformSettings.availableMerchants || []).map((m: any) => (
                  <option key={m._id} value={m.email}>
                    {m.businessName} ({m.email}) — {m.upiId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">
                Collector Merchant Email
              </label>
              <input
                type="email"
                value={platformSettings.platformBilling?.collectorMerchantEmail || ''}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    platformBilling: {
                      ...platformSettings.platformBilling,
                      collectorMerchantEmail: e.target.value,
                    },
                  })
                }
                placeholder="your-account@sumiotech.in"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1.5">
                Optional Collector Live API Key (<code className="text-slate-400">sp_live_...</code>)
              </label>
              <input
                type="text"
                value={platformSettings.platformBilling?.collectorApiKey || ''}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    platformBilling: {
                      ...platformSettings.platformBilling,
                      collectorApiKey: e.target.value,
                    },
                  })
                }
                placeholder="Optional: overrides email lookup if set"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer self-end">
              <div>
                <span className="font-semibold text-white">Enable Live SumioPay Self-Checkout</span>
                <p className="text-[11px] text-slate-500">Allow merchants to pay plans directly via UPI QR</p>
              </div>
              <input
                type="checkbox"
                checked={platformSettings.platformBilling?.isEnabled ?? true}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    platformBilling: {
                      ...platformSettings.platformBilling,
                      isEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-200">Quick Setup Guide for SaaS Owner:</div>
            <p>1. Register or log in to your SumioPay merchant account and verify your bank UPI ID in <strong>Merchant Settings</strong>.</p>
            <p>2. Pair your Android phone with <strong>SumioPay Listener APK</strong> in <strong>Merchant Devices</strong> so incoming UPI credits verify in &lt;2s.</p>
            <p>3. Select that merchant account above and hit <strong>Deploy Changes</strong>. Every ₹399 / ₹1,999 upgrade now pays your UPI directly &amp; auto-activates!</p>
          </div>
        </div>

        {/* Section 6: Canonical Subscription Plans & Free Trial Control */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Receipt className="w-4 h-4 text-amber-400" />
              <h2>SaaS Subscription Plans &amp; 3-Day Free Trial Pricing</h2>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Synced to Landing, /pricing &amp; /billing
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Changes deployed here immediately update the Landing Page pricing section, <code className="text-amber-300">/pricing</code>, <code className="text-amber-300">/billing</code>, and new user Free Trial length.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Trial Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-sky-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sky-400 text-sm">Free Trial (On Signup)</span>
                <span className="text-[10px] text-sky-300 font-mono">Tier: TRIAL</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Free Trial Length (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={platformSettings.subscriptionPlans?.trialDays ?? 3}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      subscriptionPlans: {
                        ...platformSettings.subscriptionPlans,
                        trialDays: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500/50"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Every newly registered merchant starts with this many days of free full-feature access.
                </p>
              </div>
            </div>

            {/* 1 Month Plan */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-400 text-sm">1 Month Plan</span>
                <span className="text-[10px] text-blue-300 font-mono">Tier: MONTHLY</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.monthlyPrice ?? 399}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          monthlyPrice: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Days</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.monthlyDurationDays ?? 30}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          monthlyDurationDays: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Devices</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.monthlyDeviceLimit ?? 2}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          monthlyDeviceLimit: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* 6 Months Plan */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-purple-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-purple-400 text-sm">6 Months Plan (Most Popular)</span>
                <span className="text-[10px] text-purple-300 font-mono">Tier: HALF_YEARLY</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.halfYearlyPrice ?? 1999}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          halfYearlyPrice: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Days</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.halfYearlyDurationDays ?? 180}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          halfYearlyDurationDays: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Devices</label>
                  <input
                    type="number"
                    min={1}
                    value={platformSettings.subscriptionPlans?.halfYearlyDeviceLimit ?? 5}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          halfYearlyDeviceLimit: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Custom All-Features Plan */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400 text-sm">Custom All-Features Plan</span>
                <span className="text-[10px] text-amber-300 font-mono">Tier: CUSTOM</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Fixed Price (₹, 0 = Quote)</label>
                  <input
                    type="number"
                    min={0}
                    value={platformSettings.subscriptionPlans?.customPrice ?? 0}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          customPrice: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Display Label</label>
                  <input
                    type="text"
                    value={platformSettings.subscriptionPlans?.customLabel || 'Custom — All Features Unlocked'}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        subscriptionPlans: {
                          ...platformSettings.subscriptionPlans,
                          customLabel: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Includes all SumioPay features: unlimited listeners, white-label checkout, priority SLA &amp; dedicated support.
              </p>
            </div>
          </div>

          <details className="pt-2">
            <summary className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer font-semibold">
              Advanced: Legacy Tier Quota Overrides (Starter / Growth / Business / Enterprise)
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Starter Plan */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm">Starter Quota</span>
                  <span className="text-[10px] text-slate-400 font-mono">Tier: STARTER</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Price (₹/mo)</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.STARTER?.monthlyPrice ?? 399}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            STARTER: {
                              ...platformSettings.pricingTiers?.STARTER,
                              monthlyPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Phone Limit</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.STARTER?.deviceLimit ?? 2}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            STARTER: {
                              ...platformSettings.pricingTiers?.STARTER,
                              deviceLimit: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Max GMV (₹)</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.STARTER?.maxGmv ?? 500000}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            STARTER: {
                              ...platformSettings.pricingTiers?.STARTER,
                              maxGmv: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Growth Plan */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-400 text-sm">Growth Quota</span>
                  <span className="text-[10px] text-blue-300 font-mono">Tier: GROWTH</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Price (₹/mo)</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.GROWTH?.monthlyPrice ?? 1999}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            GROWTH: {
                              ...platformSettings.pricingTiers?.GROWTH,
                              monthlyPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Phone Limit</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.GROWTH?.deviceLimit ?? 5}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            GROWTH: {
                              ...platformSettings.pricingTiers?.GROWTH,
                              deviceLimit: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Max GMV (₹)</label>
                    <input
                      type="number"
                      value={platformSettings.pricingTiers?.GROWTH?.maxGmv ?? 2500000}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          pricingTiers: {
                            ...platformSettings.pricingTiers,
                            GROWTH: {
                              ...platformSettings.pricingTiers?.GROWTH,
                              maxGmv: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </form>
    </div>
  );
};

export default SuperAdminSettingsPage;

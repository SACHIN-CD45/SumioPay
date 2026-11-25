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
      </form>
    </div>
  );
};

export default SuperAdminSettingsPage;

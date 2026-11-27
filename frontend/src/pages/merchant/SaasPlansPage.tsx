import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  Layers,
  Plus,
  Users,
  Code2,
  Copy,
  Check,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

export const SaasPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Plan Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [planCode, setPlanCode] = useState('LAB_MONTHLY');
  const [name, setName] = useState('LabSoftware Pro (30 Days)');
  const [priceInr, setPriceInr] = useState('499');
  const [durationDays, setDurationDays] = useState('30');
  const [trialDays, setTrialDays] = useState('3');
  const [description, setDescription] = useState('');
  const [returnUrl, setReturnUrl] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Manual Grant Modal
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlanCode, setGrantPlanCode] = useState('');
  const [grantDays, setGrantDays] = useState('30');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [saasRes, profRes] = await Promise.all([
        api.get('/saas-plans'),
        api.get('/merchant/profile'),
      ]);
      if (saasRes.data.success) {
        setPlans(saasRes.data.data?.plans || []);
        setCustomers(saasRes.data.data?.customers || []);
      }
      if (profRes.data.success) setMerchant(profRes.data.data);
    } catch (err) {
      console.error('[SaasPlansPage]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const copyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPlan(true);
      await api.post('/saas-plans', {
        planCode: planCode.trim(),
        name: name.trim(),
        priceInr: Number(priceInr),
        durationDays: Number(durationDays),
        trialDays: Number(trialDays || 0),
        description: description.trim(),
        returnUrl: returnUrl.trim(),
      });
      setCreateOpen(false);
      await fetchAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not save SaaS plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleManualGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/saas-plans/manual-grant', {
        customerUserId: grantUserId.trim(),
        customerEmail: grantEmail.trim(),
        planCode: grantPlanCode.trim() || undefined,
        durationDays: Number(grantDays || 30),
      });
      setGrantOpen(false);
      setGrantUserId('');
      setGrantEmail('');
      await fetchAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Manual grant failed');
    }
  };

  const sampleCode = `// SaaS-in-a-Box Middleware (Node.js / Express / MERN — Zero Webhooks Required!)
async function requireCustomerSubscription(req, res, next) {
  const userId = req.user.id; // e.g. LAB_USER_101
  const r = await fetch(
    \`https://apipay.sumiotech.in/api/v1/entitlements/check?customerUserId=\${encodeURIComponent(userId)}&planCode=${plans[0]?.planCode || 'LAB_MONTHLY'}\`,
    { headers: { 'x-api-key': '${merchant?.apiKey || 'sp_live_YOUR_API_KEY'}' } }
  );
  const { data } = await r.json();
  if (!data?.active) {
    // Generate hosted SumioPay checkout in 1 call if expired:
    return res.status(402).json({ code: 'SUBSCRIPTION_REQUIRED', renewalRequired: true });
  }
  req.saasSubscription = data;
  next();
}`;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs mb-2 border border-purple-200">
            <Layers className="w-3.5 h-3.5" />
            <span>SaaS-in-a-Box Subscription Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Customer SaaS Plans &amp; Entitlements API
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monetize any web, desktop, or MERN software (LabSoftware, ERP, POS) with built-in trials, automatic expiry tracking, and a 1-line license check API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAll}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Refresh SaaS plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setGrantOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Grant Access</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New SaaS Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div key={p._id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                  {p.planCode}
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-1.5">{p.name}</h2>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-slate-900">₹{p.priceInr}</div>
                <div className="text-[10px] text-slate-500">{p.durationDays} Days Access</div>
              </div>
            </div>
            {p.trialDays > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Auto {p.trialDays}-Day Free Trial on First Check
              </div>
            )}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className={`font-bold ${p.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                {p.isActive ? 'Active' : 'Paused'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await api.patch(`/saas-plans/${p._id}`, { isActive: !p.isActive });
                    fetchAll();
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  title="Toggle active"
                >
                  {p.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete SaaS plan ${p.planCode}?`)) return;
                    await api.delete(`/saas-plans/${p._id}`);
                    fetchAll();
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                  title="Delete plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 1-Line API Integration Snippet */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span>5-Line SaaS Subscription Check API (No Local Trial DB Needed)</span>
          </h2>
          <button
            type="button"
            onClick={() => copyText(sampleCode, 'saasSnippet')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
          >
            {copiedKey === 'saasSnippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'saasSnippet' ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
          <code>{sampleCode}</code>
        </pre>
      </div>

      {/* Customer Subscriptions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Your End-Customer Subscriptions</h2>
            <p className="text-[11px] text-slate-500">Auto-updated whenever linked orders or Payment Links settle.</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{customers.length} customer(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer User ID</th>
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Days Left</th>
                <th className="py-3 px-4 font-semibold">Expires At</th>
                <th className="py-3 px-4 font-semibold">Last UTR / Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{c.customerUserId}</div>
                    {c.customerEmail && <div className="text-[10px] text-slate-400">{c.customerEmail}</div>}
                  </td>
                  <td className="py-3 px-4 font-bold">{c.planName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'TRIAL'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">{c.daysRemaining}d</td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(c.expiresAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {c.lastUtr || c.lastOrderId || 'Trial / Manual'}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No customer entitlements recorded yet. Call <code className="font-mono">/api/v1/entitlements/check</code> or link a SaaS Plan to a Payment Link.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form
            onSubmit={handleSavePlan}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">Create / Update SaaS Plan</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label htmlFor="sp-code" className="block font-bold text-slate-700 mb-1">Plan Code</label>
              <input id="sp-code" type="text" required value={planCode} onChange={(e) => setPlanCode(e.target.value.toUpperCase())} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
            </div>
            <div>
              <label htmlFor="sp-name" className="block font-bold text-slate-700 mb-1">Plan Name</label>
              <input id="sp-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="sp-price" className="block font-bold text-slate-700 mb-1">Price (₹)</label>
                <input id="sp-price" type="number" min={1} required value={priceInr} onChange={(e) => setPriceInr(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
              </div>
              <div>
                <label htmlFor="sp-days" className="block font-bold text-slate-700 mb-1">Days</label>
                <input id="sp-days" type="number" min={1} required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
              </div>
              <div>
                <label htmlFor="sp-trial" className="block font-bold text-slate-700 mb-1">Trial Days</label>
                <input id="sp-trial" type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
              </div>
            </div>
            <div>
              <label htmlFor="sp-desc" className="block font-bold text-slate-700 mb-1">Description</label>
              <input id="sp-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200" />
            </div>
            <div>
              <label htmlFor="sp-ret" className="block font-bold text-slate-700 mb-1">Return URL (Optional)</label>
              <input id="sp-ret" type="url" value={returnUrl} onChange={(e) => setReturnUrl(e.target.value)} placeholder="https://app.yoursaas.com/dashboard" className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold">Cancel</button>
              <button type="submit" disabled={savingPlan} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold">
                {savingPlan ? 'Saving...' : 'Save SaaS Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Grant Modal */}
      {grantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form
            onSubmit={handleManualGrant}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">Manually Grant / Extend License</h2>
              <button type="button" onClick={() => setGrantOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label htmlFor="mg-user" className="block font-bold text-slate-700 mb-1">Customer User ID</label>
              <input id="mg-user" type="text" required value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="e.g. LAB_USER_101" className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
            </div>
            <div>
              <label htmlFor="mg-email" className="block font-bold text-slate-700 mb-1">Customer Email (Optional)</label>
              <input id="mg-email" type="email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="mg-code" className="block font-bold text-slate-700 mb-1">Plan Code</label>
                <input id="mg-code" type="text" value={grantPlanCode} onChange={(e) => setGrantPlanCode(e.target.value.toUpperCase())} placeholder={plans[0]?.planCode || 'LAB_MONTHLY'} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
              </div>
              <div>
                <label htmlFor="mg-days" className="block font-bold text-slate-700 mb-1">Days to Grant</label>
                <input id="mg-days" type="number" min={1} required value={grantDays} onChange={(e) => setGrantDays(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setGrantOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold">Activate Access</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SaasPlansPage;

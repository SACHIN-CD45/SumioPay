import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Pause,
  Play,
  Code2,
  Share2,
  Tag,
  RefreshCw,
  X,
} from 'lucide-react';

interface CouponRow {
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
}

export const PaymentLinksPage: React.FC = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [embedModalLink, setEmbedModalLink] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [amountMode, setAmountMode] = useState<'FIXED' | 'OPEN'>('FIXED');
  const [amountInr, setAmountInr] = useState('499');
  const [minAmountInr, setMinAmountInr] = useState('10');
  const [returnUrl, setReturnUrl] = useState('');
  const [saasPlanCode, setSaasPlanCode] = useState('');
  const [collectName, setCollectName] = useState(true);
  const [collectEmail, setCollectEmail] = useState(true);
  const [collectPhone, setCollectPhone] = useState(false);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponDraftCode, setCouponDraftCode] = useState('');
  const [couponDraftType, setCouponDraftType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [couponDraftVal, setCouponDraftVal] = useState('50');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [linksRes, profRes] = await Promise.all([
        api.get('/payment-links'),
        api.get('/merchant/profile'),
      ]);
      if (linksRes.data.success) setLinks(linksRes.data.data || []);
      if (profRes.data.success) setMerchant(profRes.data.data);
    } catch (err) {
      console.error('[PaymentLinksPage]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPublicUrl = (linkSlug: string) => {
    const origin = window.location.origin;
    return `${origin}/p/${linkSlug}`;
  };

  const addCouponDraft = () => {
    const clean = couponDraftCode.trim().toUpperCase();
    const val = Number(couponDraftVal || 0);
    if (!clean || val <= 0) return;
    if (coupons.some((c) => c.code === clean)) return;
    setCoupons([...coupons, { code: clean, discountType: couponDraftType, discountValue: val }]);
    setCouponDraftCode('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    try {
      setSubmitting(true);
      const portalMode = (localStorage.getItem('sumiopay_mode') || 'LIVE') === 'TEST';
      const res = await api.post('/payment-links', {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        amountMode,
        amountInr: amountMode === 'FIXED' ? Number(amountInr || 0) : 0,
        minAmountInr: Number(minAmountInr || 1),
        returnUrl: returnUrl.trim(),
        saasPlanCode: saasPlanCode.trim(),
        collectName,
        collectEmail,
        collectPhone,
        coupons,
        isTest: portalMode,
      });
      if (res.data.success) {
        setCreateOpen(false);
        setTitle('');
        setSlug('');
        setDescription('');
        setCoupons([]);
        setSaasPlanCode('');
        await fetchAll();
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Could not create payment link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (link: any) => {
    try {
      await api.patch(`/payment-links/${link._id}`, { isActive: !link.isActive });
      fetchAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (link: any) => {
    if (!confirm(`Delete payment link /p/${link.slug}?`)) return;
    try {
      await api.delete(`/payment-links/${link._id}`);
      fetchAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const buildButtonSnippet = (link: any) => {
    const apiKey = merchant?.apiKey || 'sp_live_YOUR_API_KEY';
    const amountVal = link.amountMode === 'FIXED' ? link.amountInr : 499;
    return `<!-- SumioPay 1-Line Pay Button (${link.title}) -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>
<button
  type="button"
  onclick="SumioPay.checkout({
    apiKey: '${apiKey}',
    amount: ${amountVal},
    appName: '${link.appName || 'PAYMENT_LINK'}',
    websiteName: '${(merchant?.websiteName || merchant?.businessName || 'Store').replace(/'/g, '')}',
    planName: '${link.title.replace(/'/g, '')}',
    onSuccess: function(order) {
      window.location.href = '${link.returnUrl || '/thank-you'}?orderId=' + order.orderId;
    }
  })"
  style="background:${merchant?.brandColor || '#4F3DF5'};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;border:none;cursor:pointer;">
  Pay ₹${amountVal} via Direct UPI
</button>`;
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs mb-2 border border-indigo-200">
            <Link2 className="w-3.5 h-3.5" />
            <span>No-Code Store &amp; WhatsApp Payment Links</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Payment Links &amp; 1-Click Pay Buttons
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create shareable branded checkout URLs with promo coupons, customer fields, and copy-paste Pay Buttons with zero backend coding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAll}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            aria-label="Refresh payment links"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setCreateOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Link</span>
          </button>
        </div>
      </div>

      {/* Links List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {links.map((link) => {
          const publicUrl = getPublicUrl(link.slug);
          const waText = encodeURIComponent(
            `Pay for ${link.title}${link.amountMode === 'FIXED' ? ` (₹${link.amountInr})` : ''} securely via Direct UPI: ${publicUrl}`
          );
          return (
            <div
              key={link._id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          link.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {link.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      {link.isTest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          TEST MODE
                        </span>
                      )}
                      {link.saasPlanCode && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          SAAS: {link.saasPlanCode}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 mt-2">{link.title}</h2>
                    {link.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{link.description}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900 font-mono">
                      {link.amountMode === 'FIXED' ? `₹${link.amountInr}` : 'Open ₹'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {link.amountMode === 'FIXED' ? 'Fixed Price' : `Min ₹${link.minAmountInr}`}
                    </div>
                  </div>
                </div>

                {/* Public URL bar */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-indigo-700 truncate">/p/{link.slug}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyText(publicUrl, link._id)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      {copiedId === link._id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === link._id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      title="Open Payment Page"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {Array.isArray(link.coupons) && link.coupons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {link.coupons.map((c: any) => (
                      <span
                        key={c.code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {c.code}: {c.discountType === 'PERCENT' ? `${c.discountValue}%` : `₹${c.discountValue}`} OFF
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Paid Uses</span>
                    <span className="font-bold text-slate-900">{link.usesCount || 0} payments</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Collected</span>
                    <span className="font-bold font-mono text-emerald-700">
                      ₹{Number(link.totalCollectedInr || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setEmbedModalLink(link)}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>HTML Button</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(link)}
                    className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100"
                    title={link.isActive ? 'Pause Link' : 'Activate Link'}
                  >
                    {link.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50"
                    title="Delete Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && links.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-300 rounded-3xl p-6 space-y-3">
            <Link2 className="w-10 h-10 text-indigo-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">No Payment Links Created Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create your first no-code Payment Link with coupons and WhatsApp sharing — start accepting 0% fee UPI payments without touching code.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              + Create Payment Link
            </button>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            aria-labelledby="create-link-heading"
            className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 id="create-link-heading" className="text-base font-extrabold text-slate-900">
                Create No-Code Payment Link
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pl-title" className="block font-bold text-slate-700 mb-1">
                  Title <span aria-hidden="true">*</span>
                </label>
                <input
                  id="pl-title"
                  name="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. LabSoftware Pro License"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 min-h-[42px]"
                />
              </div>

              <div>
                <label htmlFor="pl-slug" className="block font-bold text-slate-700 mb-1">
                  Custom URL Slug (Optional)
                </label>
                <input
                  id="pl-slug"
                  name="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. labsoftware-pro"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono min-h-[42px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pl-desc" className="block font-bold text-slate-700 mb-1">
                Description (Shown on Checkout Page)
              </label>
              <textarea
                id="pl-desc"
                name="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Includes full dashboard access, unlimited reports & email support."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              />
            </div>

            <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <legend className="text-[11px] font-bold text-slate-700 mb-1">Pricing Mode</legend>
              <div>
                <label htmlFor="pl-mode" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Type
                </label>
                <select
                  id="pl-mode"
                  value={amountMode}
                  onChange={(e) => setAmountMode(e.target.value as 'FIXED' | 'OPEN')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 min-h-[42px]"
                >
                  <option value="FIXED">Fixed Amount (₹)</option>
                  <option value="OPEN">Customer Enters Amount</option>
                </select>
              </div>

              {amountMode === 'FIXED' ? (
                <div>
                  <label htmlFor="pl-amt" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Amount (₹ INR) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="pl-amt"
                    type="number"
                    min={1}
                    required
                    value={amountInr}
                    onChange={(e) => setAmountInr(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 min-h-[42px]"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="pl-min" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Minimum Amount (₹)
                  </label>
                  <input
                    id="pl-min"
                    type="number"
                    min={1}
                    value={minAmountInr}
                    onChange={(e) => setMinAmountInr(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 min-h-[42px]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="pl-saas" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Link SaaS Plan Code (Optional)
                </label>
                <input
                  id="pl-saas"
                  type="text"
                  value={saasPlanCode}
                  onChange={(e) => setSaasPlanCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAB_MONTHLY"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 min-h-[42px]"
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="pl-return" className="block font-bold text-slate-700 mb-1">
                Redirect URL After Payment (Optional)
              </label>
              <input
                id="pl-return"
                type="url"
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
                placeholder="https://yourwebsite.com/thank-you"
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 min-h-[42px]"
              />
            </div>

            {/* Built-in Promo Coupon Builder */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Promo Coupon Codes (Optional)</span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={couponDraftCode}
                  onChange={(e) => setCouponDraftCode(e.target.value.toUpperCase())}
                  placeholder="SAVE100"
                  aria-label="Coupon code"
                  className="col-span-5 p-2 rounded-xl bg-white border border-slate-200 font-mono"
                />
                <select
                  value={couponDraftType}
                  onChange={(e) => setCouponDraftType(e.target.value as 'FLAT' | 'PERCENT')}
                  aria-label="Discount type"
                  className="col-span-3 p-2 rounded-xl bg-white border border-slate-200"
                >
                  <option value="FLAT">₹ Flat</option>
                  <option value="PERCENT">% Off</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={couponDraftVal}
                  onChange={(e) => setCouponDraftVal(e.target.value)}
                  aria-label="Discount value"
                  className="col-span-2 p-2 rounded-xl bg-white border border-slate-200 font-mono"
                />
                <button
                  type="button"
                  onClick={addCouponDraft}
                  className="col-span-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Add
                </button>
              </div>
              {coupons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {coupons.map((c) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]"
                    >
                      {c.code} (-{c.discountType === 'PERCENT' ? `${c.discountValue}%` : `₹${c.discountValue}`})
                      <button
                        type="button"
                        onClick={() => setCoupons(coupons.filter((x) => x.code !== c.code))}
                        aria-label={`Remove coupon ${c.code}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <fieldset className="flex flex-wrap gap-4 pt-1">
              <legend className="text-[11px] font-bold text-slate-700 mb-1">Collect Customer Info</legend>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectName}
                  onChange={(e) => setCollectName(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span>Full Name</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectEmail}
                  onChange={(e) => setCollectEmail(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span>Email (for Receipt)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectPhone}
                  onChange={(e) => setCollectPhone(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span>Phone / WhatsApp</span>
              </label>
            </fieldset>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold"
              >
                {submitting ? 'Creating...' : 'Create Payment Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 1-Line HTML Button Embed Modal */}
      {embedModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                1-Line HTML Pay Button — {embedModalLink.title}
              </h2>
              <button
                type="button"
                onClick={() => setEmbedModalLink(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Paste this snippet into any HTML page, WordPress block, Webflow embed, or PHP template to launch the SumioPay Direct UPI Checkout modal on click.
            </p>
            <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
              <code>{buildButtonSnippet(embedModalLink)}</code>
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => copyText(buildButtonSnippet(embedModalLink), 'htmlSnippet')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
              >
                {copiedId === 'htmlSnippet' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'htmlSnippet' ? 'Copied HTML!' : 'Copy HTML Button'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentLinksPage;

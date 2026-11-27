import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Zap, Phone, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { SeoHead } from '../../components/SeoHead';

export const EnterprisePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    workEmail: '',
    companyName: '',
    phone: '',
    monthlyVolume: '₹10L - ₹50L',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <SeoHead
        title="SumioPay Enterprise — High-Volume Self-Hosted Multi-UPI Infrastructure India"
        description="Self-hosted and cloud Direct UPI payment orchestration for high-volume Indian businesses, ERPs, fintech apps, and multi-branch stores. Multi-UPI failover, unlimited orders, 0% commission."
        keywords="enterprise UPI gateway India, self hosted multi UPI failover, high volume UPI API, 0% MDR enterprise payment gateway"
        canonicalPath="/enterprise"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'SumioPay Enterprise Direct UPI Automation',
          provider: {
            '@type': 'Organization',
            name: 'SumioTech',
            url: 'https://sumiopay.sumiotech.in/',
          },
          areaServed: 'IN',
          serviceType: 'Non-Custodial Direct UPI Payment Orchestration Software',
        }}
      />
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              SP
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Sumio<span className="text-blue-600">Pay</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pricing')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login?register=true')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Launch Console
            </button>
          </div>
        </div>
      </header>

      <main className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              High-Volume Infrastructure
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Enterprise Grade UPI Auto-Verification for Scale
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              For diagnostic laboratory chains, hospital groups, fintech platforms, and retail ERPs processing over ₹25 Lakhs per month. Save tens of lakhs in payment aggregator fees every year.
            </p>

            <div className="space-y-3.5 pt-2 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span><strong>Multi-Device Load Balancing:</strong> Distribute thousands of daily orders across 10+ listener phones seamlessly.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span><strong>Multi-VPA Routing:</strong> Rotate between multiple corporate current accounts (HDFC, ICICI, SBI) automatically.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span><strong>Private White-Label Setup:</strong> Self-host on your own AWS / DigitalOcean / on-premise cloud infrastructure.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span><strong>99.99% SLA & Dedicated Support:</strong> Direct WhatsApp hotline with core engineering team.</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-subtle">
            {submitted ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">Thank You!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your enterprise consultation request has been received. Our solutions architect will contact you within 2 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h3 className="text-base font-bold text-slate-950 mb-1">
                  Connect with Enterprise Architecture Team
                </h3>
                <p className="text-slate-500 text-[11px] mb-4">
                  Fill out the form below to receive custom pricing and a personalized architecture walkthrough.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Singhania"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="vikram@company.com"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company / Organization</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MedLife Diagnostics"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimated Monthly UPI Volume</label>
                  <select
                    value={formData.monthlyVolume}
                    onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  >
                    <option value="₹10L - ₹25L">₹10 Lakhs - ₹25 Lakhs / month</option>
                    <option value="₹25L - ₹50L">₹25 Lakhs - ₹50 Lakhs / month</option>
                    <option value="₹50L - ₹1Cr">₹50 Lakhs - ₹1 Crore / month</option>
                    <option value="₹1Cr+">₹1 Crore+ / month (Custom Infrastructure)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tell us about your requirements</label>
                  <textarea
                    rows={3}
                    placeholder="Specific requirements: Number of locations, ERP integration, multi-VPA bank preferences..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Submit Enterprise Consultation Request</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnterprisePage;

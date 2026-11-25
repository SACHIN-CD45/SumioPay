import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ShieldCheck, Lock, Mail, Building, AtSign, Phone, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    businessName: '',
    upiId: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? '/merchant/register' : '/merchant/login';
      const res = await api.post(endpoint, formData);

      if (res.data.success) {
        localStorage.setItem('sumiopay_token', res.data.data.token || res.data.data.accessToken);
        if (res.data.data.refreshToken) {
          localStorage.setItem('sumiopay_refresh_token', res.data.data.refreshToken);
        }
        localStorage.setItem('sumiopay_merchant', JSON.stringify(res.data.data.merchant));
        navigate('/dashboard');
      } else {
        setError(res.data.message || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/merchant/login', {
        email: 'contact@sumiotech.com',
        password: 'Password@123',
      });
      if (res.data.success) {
        localStorage.setItem('sumiopay_token', res.data.data.token || res.data.data.accessToken);
        if (res.data.data.refreshToken) {
          localStorage.setItem('sumiopay_refresh_token', res.data.data.refreshToken);
        }
        localStorage.setItem('sumiopay_merchant', JSON.stringify(res.data.data.merchant));
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Could not connect to SumioTech corporate demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-card relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-xl shadow-sm mb-3"
          >
            SP
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SumioPay Gateway</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Self-Hosted UPI Verification & Settlement SaaS
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Merchant Account
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Your Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Business / Brand Name</label>
                <input
                  type="text"
                  name="businessName"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Apex Diagnostics or SumioLab"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Primary Receiving UPI VPA (ID)
                </label>
                <input
                  type="text"
                  name="upiId"
                  required
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="e.g. merchant@okhdfcbank or 9876543210@paytm"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 shadow-subtle"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Customer payments will be deposited directly into this UPI ID.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="merchant@example.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Register Merchant Portal' : 'Access Merchant Console'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Demo Login */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 transition"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            1-Click SumioTech Corporate Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

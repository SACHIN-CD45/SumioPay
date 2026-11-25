import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export const SuperAdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.post('/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('sumiopay_superadmin_token', res.data.token);
        navigate('/superadmin/dashboard');
      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid superadmin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-sm bg-white border border-amber-200 rounded-3xl p-8 shadow-card relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 font-bold text-xl mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SuperAdmin Console</h1>
          <p className="text-xs text-slate-500 mt-1">Platform Master Controller</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">SuperAdmin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 shadow-subtle"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 shadow-subtle"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter SuperAdmin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLoginPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  ShieldCheck,
  Lock,
  Mail,
  Building,
  AtSign,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  X,
  FileText,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(
    searchParams.get('register') === 'true'
      ? 'register'
      : searchParams.get('reset') === 'true'
      ? 'forgot'
      : defaultMode
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration Form State
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    upiId: '',
    phone: '',
    email: '',
    password: '',
    otp: '',
    termsAccepted: false,
  });

  // Registration OTP State
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpCountdown, setRegOtpCountdown] = useState(0);
  const [sendingRegOtp, setSendingRegOtp] = useState(false);

  // Forgot Password Form State
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotOtpCountdown, setForgotOtpCountdown] = useState(0);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);

  // Terms & Conditions Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Sync mode with searchParams or defaultMode when opened
  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setAuthMode('register');
    } else if (searchParams.get('reset') === 'true') {
      setAuthMode('forgot');
    } else if (defaultMode) {
      setAuthMode(defaultMode);
    }
  }, [searchParams, defaultMode, isOpen]);

  // Lock body scroll when modal is open & handle Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  // Countdown timers
  useEffect(() => {
    let timer: any;
    if (regOtpCountdown > 0) {
      timer = setInterval(() => setRegOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regOtpCountdown]);

  useEffect(() => {
    let timer: any;
    if (forgotOtpCountdown > 0) {
      timer = setInterval(() => setForgotOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [forgotOtpCountdown]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // 1. Send Registration OTP
  const handleSendRegistrationOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email address to receive the verification code.');
      return;
    }
    setError(null);
    setSendingRegOtp(true);

    try {
      const res = await api.post('/merchant/send-registration-otp', {
        email: formData.email,
        name: formData.name,
      });

      if (res.data.success) {
        setRegOtpSent(true);
        setRegOtpCountdown(60);
        setSuccessMessage(`A 6-digit verification code has been dispatched to ${formData.email}`);
      } else {
        setError(res.data.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send verification code.');
    } finally {
      setSendingRegOtp(false);
    }
  };

  // 2. Submit Sign In or Register Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'register') {
        if (!formData.termsAccepted) {
          setError('Please read and accept the Terms & Conditions and Privacy Policy to continue.');
          setLoading(false);
          return;
        }

        if (regOtpSent && !formData.otp.trim()) {
          setError('Please enter the 6-digit verification code sent to your email.');
          setLoading(false);
          return;
        }

        const res = await api.post('/merchant/register', {
          name: formData.name,
          businessName: formData.businessName,
          upiId: formData.upiId,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          otp: formData.otp,
          termsAccepted: formData.termsAccepted,
        });

        if (res.data.success) {
          localStorage.setItem('sumiopay_token', res.data.data.token || res.data.data.accessToken);
          if (res.data.data.refreshToken) {
            localStorage.setItem('sumiopay_refresh_token', res.data.data.refreshToken);
          }
          localStorage.setItem('sumiopay_merchant', JSON.stringify(res.data.data.merchant));
          onClose();
          navigate('/dashboard');
        } else {
          setError(res.data.message || 'Registration failed.');
        }
      } else {
        // Sign In
        const res = await api.post('/merchant/login', {
          email: formData.email,
          password: formData.password,
        });

        if (res.data.success) {
          localStorage.setItem('sumiopay_token', res.data.data.token || res.data.data.accessToken);
          if (res.data.data.refreshToken) {
            localStorage.setItem('sumiopay_refresh_token', res.data.data.refreshToken);
          }
          localStorage.setItem('sumiopay_merchant', JSON.stringify(res.data.data.merchant));
          onClose();
          navigate('/dashboard');
        } else {
          setError(res.data.message || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Forgot Password OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setError(null);
    setSendingForgotOtp(true);

    try {
      const res = await api.post('/merchant/forgot-password/send-otp', {
        email: forgotEmail,
      });

      if (res.data.success) {
        setForgotStep(2);
        setForgotOtpCountdown(60);
        setSuccessMessage(`Password reset code sent to ${forgotEmail}. Please check your inbox.`);
      } else {
        setError(res.data.message || 'Failed to send password reset code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send password reset code.');
    } finally {
      setSendingForgotOtp(false);
    }
  };

  // 4. Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setError('Please enter the 6-digit code received on your email.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/merchant/forgot-password/reset', {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPassword,
      });

      if (res.data.success) {
        setAuthMode('login');
        setFormData((prev) => ({ ...prev, email: forgotEmail, password: '' }));
        setSuccessMessage('Password updated successfully! Please sign in with your new password.');
        setForgotStep(1);
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      } else {
        setError(res.data.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-auto z-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition z-20"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6 pt-2">
          <img
            src="/sumiopay-logo.png"
            alt="SumioPay - Powered by SumioTech"
            className="h-10 sm:h-11 w-auto mx-auto object-contain mb-2.5"
          />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {authMode === 'forgot'
              ? 'Reset Your Password'
              : authMode === 'register'
              ? 'Create Merchant Account'
              : 'Merchant Console Login'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Self-Hosted UPI Verification &amp; Settlement SaaS by{' '}
            <span className="font-semibold text-slate-700">SumioTech</span>
          </p>
        </div>

        {/* Tab Switcher (Visible in Login & Register modes) */}
        {authMode !== 'forgot' && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Global Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: FORGOT PASSWORD                                        */}
        {/* ============================================================== */}
        {authMode === 'forgot' ? (
          <div>
            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotOtp} className="space-y-4 text-xs">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed">
                  Enter the email address registered with your SumioPay account. We will send you a 6-digit one-time password (OTP) to reset your password.
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingForgotOtp}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition mt-2"
                >
                  {sendingForgotOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Password Reset Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs leading-relaxed flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Reset code sent to <strong>{forgotEmail}</strong>. Enter code and choose a new password.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">6-Digit Reset Code (OTP)</label>
                    <button
                      type="button"
                      disabled={forgotOtpCountdown > 0 || sendingForgotOtp}
                      onClick={handleSendForgotOtp}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold disabled:text-slate-400"
                    >
                      {forgotOtpCountdown > 0
                        ? `Resend in ${forgotOtpCountdown}s`
                        : sendingForgotOtp
                        ? 'Sending...'
                        : 'Resend Code'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 543210"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 font-mono text-center tracking-widest text-base font-bold focus:outline-none focus:border-blue-500 shadow-subtle"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">New Password (Min 8 chars)</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
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
                      <span>Update Password &amp; Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Change Email Address
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* MODE 2 & 3: SIGN IN OR REGISTER FORM                           */
          /* ============================================================== */
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {authMode === 'register' && (
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Receiving Bank UPI VPA (ID)
                  </label>
                  <input
                    type="text"
                    name="upiId"
                    required
                    value={formData.upiId}
                    onChange={handleChange}
                    placeholder="e.g. merchant@okhdfcbank or 9875182659@paytm"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 shadow-subtle"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Customer payments deposit 100% directly into this UPI ID. No intermediate wallet holds.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Contact Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 9875182659"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                  />
                </div>
              </>
            )}

            {/* Email Field with Verification Trigger for Register */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">Email Address</label>
                {authMode === 'register' && (
                  <button
                    type="button"
                    disabled={sendingRegOtp || regOtpCountdown > 0 || !formData.email}
                    onClick={handleSendRegistrationOtp}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:text-slate-400 transition"
                  >
                    {sendingRegOtp
                      ? 'Sending OTP...'
                      : regOtpCountdown > 0
                      ? `Resend in ${regOtpCountdown}s`
                      : regOtpSent
                      ? 'Resend Verification Code'
                      : 'Send Verification Code'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@sumiotech.in"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Email OTP Field for Register Mode */}
            {authMode === 'register' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email Verification Code (OTP)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="otp"
                    required
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        otp: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="Enter 6-digit code"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-slate-900 placeholder-slate-400 font-mono tracking-wider font-semibold focus:outline-none focus:border-blue-500 shadow-subtle"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
                {!regOtpSent ? (
                  <p className="text-[10px] text-blue-600 mt-1">
                    Click <strong>"Send Verification Code"</strong> above to receive a 6-digit OTP on your email.
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Code sent! Please enter the 6-digit code from your email.
                  </p>
                )}
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">Password</label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotEmail(formData.email);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-subtle"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Terms and Conditions Acceptance Checkbox (Register Mode) */}
            {authMode === 'register' && (
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 leading-normal">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 font-semibold underline hover:text-blue-800"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-semibold underline hover:text-blue-800"
                    >
                      Privacy Policy
                    </a>{' '}
                    of SumioPay (SumioTech).
                  </span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition mt-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {authMode === 'register' ? 'Verify & Create Merchant Account' : 'Access Merchant Console'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Corporate Trust Badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Corporate: <strong>SumioTech</strong></span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TERMS & CONDITIONS PREVIEW MODAL                                */}
      {/* ============================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">SumioPay Terms of Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto text-xs text-slate-600 space-y-4 leading-relaxed">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-900">
                <strong>SumioPay</strong> is an enterprise UPI verification automation technology suite provided by{' '}
                <strong>SumioTech</strong>.
              </div>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">1. Direct Bank Settlement Model</h4>
              <p>
                SumioPay operates strictly on a self-hosted direct settlement architecture. All customer payments flow 100% directly into your verified bank account UPI VPA. SumioPay and SumioTech do not hold, escrow, pool, or intercept customer funds at any stage.
              </p>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">2. Companion Listener APK</h4>
              <p>
                To automate UPI payment verification, you install the companion Android listener application on an active mobile device receiving your bank SMS alerts or UPI push notifications. The APK encrypts and forwards verification telemetry via TLS 1.3 to your dedicated gateway instance.
              </p>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">3. Merchant Responsibility &amp; Compliance</h4>
              <p>
                Merchants are solely responsible for compliance with Reserve Bank of India (RBI) guidelines, NPCI regulations, income tax disclosures, and anti-money laundering (AML) laws. SumioPay prohibits unlawful activities, prohibited gambling, or unauthorized financial transactions.
              </p>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">4. Zero Commission &amp; Billing</h4>
              <p>
                SumioPay charges flat software subscription fees for our software automation tools and charges 0% transaction commission on your UPI turnover.
              </p>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">5. Corporate Contact &amp; Support</h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                <div>Corporate Entity: SumioTech</div>
                <div>Official Support: contact@sumiotech.in</div>
                <div>Support Helpline: +91 9875182659</div>
                <div>Website: https://sumiopay.sumiotech.in</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, termsAccepted: true }));
                  setShowTermsModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
              >
                Accept &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

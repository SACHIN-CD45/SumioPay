import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Smartphone,
  CreditCard,
  Lock,
  Code2,
  Calculator,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Layers,
  Clock,
  Terminal,
  Cpu,
  Menu,
  X,
  LayoutDashboard,
  FileSpreadsheet,
  RotateCcw,
  FolderGit2,
  Users,
  ShieldAlert,
  Receipt,
  FileText,
  Building2,
  Server,
  HelpCircle,
  Play,
  Check,
  Activity,
  ArrowUpRight,
  BarChart3,
  Shield,
  Workflow,
  Headphones,
  Database,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';
import { publicApi } from '../../lib/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(500000); // 5 Lakhs default
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Platform Config dynamically fetched from SuperAdmin backend
  const [platformConfig, setPlatformConfig] = useState<any>({
    announcementText: 'New v2.4 Release: Enterprise Multi-Tenant UPI Auto-Verification — 100% Direct Bank Settlement.',
    announcementLink: '/login?register=true',
    isAnnouncementActive: true,
    maintenanceMode: false,
    maintenanceMessage: 'SumioPay Platform is undergoing scheduled infrastructure maintenance.',
    allowNewMerchantRegistrations: true,
    totalPlatformGMVFormatted: '₹50+ Cr',
    totalBusinessesCount: 1250,
    slaGuaranteePercent: 99.98,
    enterpriseContactEmail: 'enterprise@sumiopay.internal',
    supportPhone: '+91 800-SUMIOPAY',
  });

  // Interactive Live Simulator State in Hero
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await publicApi.get('/platform-config');
        if (res.data.success && res.data.data) {
          setPlatformConfig(res.data.data);
        }
      } catch (err) {
        // Fallback silently to sleek defaults
      }
    };
    fetchConfig();
  }, []);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 900);
    setTimeout(() => setSimStep(3), 1800);
    setTimeout(() => {
      setSimStep(4);
      setIsSimulating(false);
    }, 2800);
  };

  // Fee calculation: 2% + 18% GST = 2.36%
  const traditionalGatewayFee = Math.round(monthlyVolume * 0.0236);
  const yearlySavings = traditionalGatewayFee * 12;
  const threeYearSavings = yearlySavings * 3;

  const faqs = [
    {
      q: 'How does SumioPay achieve 0% transaction fees?',
      a: 'Traditional aggregators (like Razorpay, Cashfree, PayU) act as financial middlemen taking 2% + 18% GST on every rupee processed. SumioPay bypasses intermediaries by allowing your customers to transfer directly to your own bank account UPI VPA. Our lightweight background Android companion service intercepts the official bank credit notification and confirms orders in under 1.2 seconds with 100% money retained by you.',
    },
    {
      q: 'How does the Paise Differential Engine prevent amount collisions?',
      a: 'If 10 customers simultaneously checkout a ₹499 plan, our dynamic allocation engine allocates fractional paise (e.g. ₹499.14, ₹499.27, ₹499.38) within a temporary 15-minute reservation window. When your bank sends an SMS or push credit for ₹499.27, SumioPay matches that exact customer order with 100% deterministic precision.',
    },
    {
      q: 'Can a single companion phone verify payments for multiple separate software apps?',
      a: 'Yes! That is the core architecture of SumioPay. A single paired Android phone running the companion APK verifies payments for SumioLab, SumioBilling, SumioBook, SumioJewel, and any external SaaS software via distinct project workspaces and signed webhooks.',
    },
    {
      q: 'Do I need a specialized Merchant Current Account or GST registration?',
      a: 'No! SumioPay works seamlessly with any UPI VPA — whether personal (Google Pay, PhonePe, Paytm, BHIM) or official merchant accounts (PhonePe Business, Paytm Soundbox QR, HDFC SmartHub, BharatPe). Money settles directly into your bank instantly with zero settlement delays.',
    },
    {
      q: 'How do I integrate SumioPay into my application?',
      a: 'We provide an official @sumiopay/sdk for Node.js / TypeScript backends, a drop-in <UpiCheckoutModal /> React component that takes 3 minutes to mount, and tamper-proof HMAC-SHA256 signed webhooks for automated fulfillment.',
    },
    {
      q: 'Is customer banking data stored on your cloud?',
      a: 'No. SumioPay adheres to a strict Non-Custodial Zero Liability architecture under the DPDP Act 2023. No customer debit/credit card numbers or CVVs are ever handled or stored on our servers.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans antialiased">
      {/* Maintenance Notice Banner (Controlled by SuperAdmin) */}
      {platformConfig.maintenanceMode && (
        <div className="bg-amber-500 text-slate-950 text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>{platformConfig.maintenanceMessage}</span>
        </div>
      )}

      {/* Top Announcement Bar (Controlled by SuperAdmin) */}
      {platformConfig.isAnnouncementActive && !platformConfig.maintenanceMode && (
        <div className="bg-slate-950 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-slate-800">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] uppercase tracking-wider">
            SuperAdmin Active
          </span>
          <span className="text-slate-200">{platformConfig.announcementText}</span>
          <button
            onClick={() => navigate(platformConfig.announcementLink || '/login?register=true')}
            className="underline font-semibold text-blue-400 hover:text-blue-300 transition ml-1"
          >
            Explore &rarr;
          </button>
        </div>
      )}

      {/* Main Glassmorphic Navigation */}
      <header className="border-b border-slate-100 sticky top-0 z-40 bg-white/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-3">
              <img src="/sumiopay-logo.png" alt="SumioPay Smart Payment Solutions" className="h-9 sm:h-10 w-auto object-contain" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise Gateway
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition">5 Core Modules</a>
              <a href="#enterprise" className="hover:text-blue-600 transition">Enterprise Scale</a>
              <a href="#simulator" className="hover:text-blue-600 transition">Live Simulator</a>
              <a href="#calculator" className="hover:text-blue-600 transition">Fee Calculator</a>
              <button onClick={() => navigate('/pricing')} className="hover:text-blue-600 transition">Pricing Plans</button>
              <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-block px-3 sm:px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login?register=true')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/98 backdrop-blur-lg px-6 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3 text-sm font-semibold text-slate-700">
              <a
                href="#features"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition flex items-center justify-between"
              >
                <span>5 Core Product Modules</span>
                <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">v2.4</span>
              </a>
              <a
                href="#enterprise"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition"
              >
                Enterprise Solutions & SLA
              </a>
              <a
                href="#simulator"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition"
              >
                Live Payment Simulator
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition"
              >
                Savings & ROI Calculator
              </a>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/pricing');
                }}
                className="py-1 text-left hover:text-blue-600 transition"
              >
                Pricing Plans
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/enterprise');
                }}
                className="py-1 text-left hover:text-blue-600 transition"
              >
                Enterprise Custom SLA
              </button>
              <a
                href="#faq"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition"
              >
                Frequently Asked Questions
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition text-center"
              >
                Sign In to Merchant Console
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/login?register=true')}
                }
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition text-center flex items-center justify-center gap-2"
              >
                <span>Create Merchant Account Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* World-Class Enterprise FinTech Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-16 sm:pt-24 pb-20 px-4 sm:px-6">
        {/* Glow Effects & Dot Grid Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-600/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-32 right-10 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          {/* Hero Header & Value Statement */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-bold shadow-lg animate-in fade-in duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Direct Bank-to-Bank UPI &bull; 0% Aggregator Fees &bull; Zero Day Settlement</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              The Universal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">0% Fee Payment Gateway</span> for Indian SaaS & Enterprise.
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Stop forfeiting 2.36% of your revenue to payment aggregators. SumioPay verifies direct UPI transfers into your own bank account in under 1.2 seconds across all your SaaS products with automated reconciliation.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto w-full">
              <button
                onClick={() => navigate('/login?register=true')}
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-xl hover:shadow-blue-500/25 transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span>Start Free Merchant Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-200 text-sm font-bold shadow-md transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Zap className="w-4 h-4 text-blue-400" />
                <span>Test Live Checkout Modal</span>
              </button>
            </div>

            {/* Trust Checkpoints */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No Current Account or GST Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Settlement to Your UPI VPA</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Single Phone Pairs with N SaaS Apps</span>
              </div>
            </div>
          </div>

          {/* Graphical Live Interactive Simulator Terminal (Hero Centerpiece) */}
          <div id="simulator" className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-sm text-white">Live Payment Orchestration Simulator</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  See how companion Android hardware intercepts bank credit and matches orders in &lt; 1.2s.
                </p>
              </div>
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left: Dynamic QR Mockup */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col items-center text-center space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dynamic Intent QR (Paise Reserved)
                </div>
                <div className="relative p-3 bg-white rounded-2xl shadow-inner">
                  {/* QR Code representation */}
                  <div className="w-36 h-36 border-2 border-slate-900 rounded-lg flex items-center justify-center p-2 relative overflow-hidden bg-slate-50">
                    <div className="grid grid-cols-6 gap-1 w-full h-full opacity-80">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            (i % 2 === 0 || i % 5 === 0) ? 'bg-slate-900' : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    {isSimulating && (
                      <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-lg shadow-emerald-500 animate-bounce" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-white font-mono">₹499.42</div>
                  <div className="text-[11px] text-emerald-400 font-bold">42 Paise Unique Collision Lock</div>
                </div>
              </div>

              {/* Right: Live Telemetry Event Flow */}
              <div className="space-y-3 font-mono text-xs">
                <div
                  className={`p-3 rounded-xl border transition ${
                    simStep >= 1 ? 'bg-blue-950/40 border-blue-500 text-blue-200' : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 1: Intent Generated</span>
                    <span className="text-[10px]">00:00.1s</span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-400 font-sans">
                    Customer scans dynamic QR via PhonePe / GPay.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border transition ${
                    simStep >= 2 ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200' : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 2: Bank SMS / Push Intercepted</span>
                    <span className="text-[10px]">00:00.8s</span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-400 font-sans">
                    HDFC Bank: &quot;Rs 499.42 credited via UPI Ref 592817291829&quot;.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border transition ${
                    simStep >= 3 ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200' : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Step 3: Signed Webhook Fired</span>
                    <span className="text-[10px]">00:01.1s</span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-400 font-sans">
                    HMAC-SHA256 signature verified. Order #SP-9481 marked PAID.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border transition ${
                    simStep >= 4 ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Outcome: 0% Fee Deducted</span>
                    <span>100% In Bank</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof & Metrics Strip (SuperAdmin Configured) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-6 text-center border-t border-slate-800">
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {platformConfig.totalPlatformGMVFormatted || '₹50+ Cr'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Platform Volume Processed</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
                {platformConfig.totalBusinessesCount?.toLocaleString('en-IN') || '1,250'}+
              </div>
              <div className="text-xs text-slate-400 mt-1">Active Indian Businesses</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {platformConfig.slaGuaranteePercent || 99.98}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Verification Uptime SLA</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">&lt; 1.2s</div>
              <div className="text-xs text-slate-400 mt-1">Average Auto-Verify Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Universal UPI App Ecosystem Strip */}
      <section className="py-10 border-b border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-6">
            100% Interoperable Across All Indian UPI Apps & Commercial Banks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-80 grayscale hover:grayscale-0 transition duration-300">
            <span className="font-black text-base tracking-tight text-slate-800">PhonePe</span>
            <span className="font-black text-base tracking-tight text-slate-800">Google Pay</span>
            <span className="font-black text-base tracking-tight text-slate-800">Paytm</span>
            <span className="font-black text-base tracking-tight text-slate-800">BHIM UPI</span>
            <span className="font-black text-base tracking-tight text-slate-800">CRED</span>
            <span className="font-black text-base tracking-tight text-slate-800">HDFC Bank</span>
            <span className="font-black text-base tracking-tight text-slate-800">ICICI Bank</span>
            <span className="font-black text-base tracking-tight text-slate-800">State Bank of India</span>
          </div>
        </div>
      </section>

      {/* 5 Core Enterprise Product Modules Section */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
            Enterprise SaaS Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
            5 Modular Pillars of the SumioPay Suite
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Engineered as a high-throughput, provider-agnostic payment orchestration and automated reconciliation platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Super Admin */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Core Module 1
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Super Admin Platform Governance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Centralized platform administration, tenant onboarding approval, KYC verification workflows, risk & fraud mitigation alerts, and subscription pricing controls.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">&bull; Global Platform GMV & Revenue Run-Rate</li>
              <li className="flex items-center gap-2">&bull; Automated & Manual KYC Review Pipeline</li>
              <li className="flex items-center gap-2">&bull; Merchant Tier & Custom Price Overrides</li>
              <li className="flex items-center gap-2">&bull; Tamper-Proof Privileged Action Audit Trail</li>
            </ul>
          </div>

          {/* Module 2: Merchant Dashboard */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                Core Module 2
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Merchant Control Console</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete multi-tenant merchant portal for real-time payment collection, dynamic UPI QR generation, transaction timelines, multi-project workspaces, and team RBAC.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">&bull; Direct UPI Intent & Dynamic QR Generator</li>
              <li className="flex items-center gap-2">&bull; Orders & Payment Events Lifecycle Ledger</li>
              <li className="flex items-center gap-2">&bull; Multi-Project Isolation (e.g. SumioLab, SumioBook)</li>
              <li className="flex items-center gap-2">&bull; Team Invites, RBAC & Role Scopes</li>
            </ul>
          </div>

          {/* Module 3: Developer Portal */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                Core Module 3
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Developer Portal & SDK Suite</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Modern developer infrastructure with dual keypairs, official TypeScript SDK, drop-in React Checkout Modal, HMAC-SHA256 signature verification, and simulator sandboxes.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">&bull; Live & Test API Keypairs (sp_live / sp_test)</li>
              <li className="flex items-center gap-2">&bull; Signed Webhook Dispatcher with Exponential Backoff</li>
              <li className="flex items-center gap-2">&bull; @sumiopay/sdk & @sumiopay/checkout-react</li>
              <li className="flex items-center gap-2">&bull; Interactive In-Browser Payment Sandbox</li>
            </ul>
          </div>

          {/* Module 4: Reconciliation Engine */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                Core Module 4
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Intelligent Reconciliation Engine</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-rule reconciliation matching bank statements with pending orders using exact 12-digit UTR, unique fractional paise windows, and delayed transaction rescue.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">&bull; Multi-Rule Matching (UTR + Exact Minor Units)</li>
              <li className="flex items-center gap-2">&bull; Bank Passbook CSV Ingestion & Parsing</li>
              <li className="flex items-center gap-2">&bull; Delayed Payment Rescue & Manual Match Desk</li>
              <li className="flex items-center gap-2">&bull; Exportable Financial Accounting Ledgers</li>
            </ul>
          </div>

          {/* Module 5: Android Device Connector */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-purple-400 shadow-xs hover:shadow-lg transition space-y-4 md:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                Core Module 5
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Android Companion Hardware</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Companion Android listener application utilizing permitted notification hooks to capture official bank receipts, relay encrypted telemetry, and verify device health.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">&bull; 10-Second QR Pairing Protocol</li>
              <li className="flex items-center gap-2">&bull; Heartbeat, Battery & Signal Telemetry</li>
              <li className="flex items-center gap-2">&bull; Multi-App Routing from a Single Phone</li>
              <li className="flex items-center gap-2">&bull; End-to-End Encrypted Sync Protocol</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Enterprise Solutions & Multi-Tenant Showcase */}
      <section id="enterprise" className="py-24 px-4 sm:px-6 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3.5 py-1 rounded-full border border-blue-400/20">
              Built for High-Scale Enterprise
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Enterprise Grade Infrastructure & Non-Custodial Architecture
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Designed from first principles to remove financial aggregation risk, ensure DPDP Act 2023 compliance, and provide dedicated infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Workflow className="w-6 h-6 text-blue-400" />
              <h3 className="font-bold text-white text-base">Multi-Tenant Software Routing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Run 50+ internal SaaS apps (e.g. SumioLab, SumioBook, SumioJewel) under one organization. Each app gets its own isolated webhooks and order scopes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Database className="w-6 h-6 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Non-Custodial Direct Settlement</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero client funds are pooled or escrowed. Customer funds route directly to your bank account VPA, eliminating third-party account freezing risks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h3 className="font-bold text-white text-base">DPDP Act 2023 & Non-PII Storage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No customer card numbers, net banking credentials, or Aadhaar numbers touch our cloud. All transactions occur via NPCI standardized UPI rail.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Cpu className="w-6 h-6 text-purple-400" />
              <h3 className="font-bold text-white text-base">Hardware Redundancy & Failover</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect secondary standby Android phones. If the primary phone battery drops below 10% or disconnects from Wi-Fi, the secondary listener takes over seamlessly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              <h3 className="font-bold text-white text-base">Paise Collision Avoidance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic fraction matching handles hundreds of concurrent users purchasing the same item simultaneously without collision or duplicate payment misattribution.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Headphones className="w-6 h-6 text-rose-400" />
              <h3 className="font-bold text-white text-base">Dedicated SLA & Technical Manager</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enterprise tiers receive customized 99.98% uptime contracts, custom Redis cluster deployment, and dedicated WhatsApp/Slack engineer channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Comparison: Traditional vs SumioPay */}
      <section className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100">
            Uncompromising Economics
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
            Why Modern Merchants are Leaving Payment Aggregators
          </h2>
        </div>

        <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 sm:p-5 font-bold text-slate-600">Feature Comparison</th>
                <th className="p-4 sm:p-5 font-bold text-rose-600">Traditional Gateway (Razorpay/Cashfree)</th>
                <th className="p-4 sm:p-5 font-bold text-emerald-700 bg-emerald-50/70">SumioPay Direct UPI Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-800">Transaction Fee</td>
                <td className="p-4 sm:p-5 text-rose-600 font-semibold">2.00% + 18% GST (2.36% Total)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-black bg-emerald-50/70">0% (Keep 100% of Revenue)</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-800">Settlement Timeline</td>
                <td className="p-4 sm:p-5 text-slate-600">T+2 to T+3 Business Days</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-emerald-50/70">Instant (Direct in your Bank)</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-800">Account Freezing Risk</td>
                <td className="p-4 sm:p-5 text-slate-600">High (Rolling reserves, arbitrary risk holds)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-emerald-50/70">Zero (Non-custodial, peer-to-merchant)</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-800">GST Registration Required?</td>
                <td className="p-4 sm:p-5 text-slate-600">Yes (Mandatory for current account merchant setup)</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-emerald-50/70">No (Works with any personal or business UPI ID)</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-bold text-slate-800">Multi-Tenancy Support</td>
                <td className="p-4 sm:p-5 text-slate-600">1 Account per Legal Business</td>
                <td className="p-4 sm:p-5 text-emerald-700 font-bold bg-emerald-50/70">Unlimited Projects per Merchant</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Savings & ROI Calculator */}
      <section id="calculator" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                <Calculator className="w-4 h-4" />
                <span>ROI & Profitability Calculator</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Calculate Exactly What You Save on Gateway Fees
              </h2>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block">Your Annual Net Savings:</span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                ₹{yearlySavings.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span className="text-slate-300">Your Monthly Transaction Volume:</span>
                <span className="text-blue-400 font-mono text-base font-bold">
                  ₹{monthlyVolume.toLocaleString('en-IN')} / month
                </span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                <span>₹50,000</span>
                <span>₹25,00,000</span>
                <span>₹50,00,000+</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block">Traditional Payment Aggregator</span>
                <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">
                  -₹{traditionalGatewayFee.toLocaleString('en-IN')} / mo
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  (2% fee + 18% GST = 2.36% lost permanently)
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                <span className="text-xs text-blue-300 block">With SumioPay Direct UPI</span>
                <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                  ₹0 Transaction Fees (100% Retained)
                </span>
                <span className="text-[11px] text-emerald-300/80 mt-1 block">
                  3-Year Accumulated Net Savings: <strong className="text-emerald-400">₹{threeYearSavings.toLocaleString('en-IN')}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
            Got Questions?
          </span>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    activeFaq === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* High-Impact Enterprise Final CTA Banner */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white rounded-3xl p-10 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            Ready to Cut Gateway Fees to Zero?
          </h2>
          <p className="text-blue-100 text-sm max-w-xl mx-auto">
            Create your merchant account, pair your companion phone in under 10 seconds, and start collecting UPI payments directly into your bank.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/login?register=true')}
              className="px-6 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition shadow-sm"
            >
              Launch Merchant Console Now
            </button>
            <button
              onClick={() => setDemoOpen(true)}
              className="px-6 py-3.5 rounded-xl bg-blue-700/80 border border-blue-400/40 text-white font-bold text-xs hover:bg-blue-700 transition"
            >
              Test Live Payment Modal
            </button>
          </div>
        </div>
      </section>

      {/* Comprehensive 5-Column Modern Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-white pt-16 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Top Brand & Status Strip */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-10 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 px-3 py-1.5 rounded-2xl shadow-sm border border-slate-700/50">
                <img src="/sumiopay-logo.png" alt="SumioPay Smart Payment Solutions" className="h-8 sm:h-9 w-auto object-contain" />
              </div>
              <div>
                <div className="font-extrabold text-lg text-white flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                    v2.4 Enterprise
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Universal Multi-Tenant UPI Payment Infrastructure & Automated Reconciliation Engine
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All Engine Systems Operational (99.98% SLA)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>256-Bit TLS Bank-Grade Encryption</span>
              </div>
            </div>
          </div>

          {/* 5-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 text-xs">
            {/* Col 1: FinTech Solutions */}
            <div className="space-y-3">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-blue-400" />
                <span>FinTech Solutions</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#enterprise" className="hover:text-blue-400 transition text-left">
                    SaaS Subscription Billing
                  </a>
                </li>
                <li>
                  <a href="#enterprise" className="hover:text-blue-400 transition text-left">
                    Direct UPI QR Infrastructure
                  </a>
                </li>
                <li>
                  <a href="#enterprise" className="hover:text-blue-400 transition text-left">
                    Multi-Tenant Project Routing
                  </a>
                </li>
                <li>
                  <a href="#enterprise" className="hover:text-blue-400 transition text-left">
                    Non-Custodial Bank Settlement
                  </a>
                </li>
                <li>
                  <a href="#enterprise" className="hover:text-blue-400 transition text-left">
                    Offline Passbook Reconciliation
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 2: Merchant Operations */}
            <div className="space-y-3">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                <span>Merchant Console</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button onClick={() => navigate('/dashboard')} className="hover:text-blue-400 transition text-left">
                    Overview Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/connect')} className="hover:text-blue-400 transition text-left">
                    Dynamic QR & Intent Links
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/orders')} className="hover:text-blue-400 transition text-left">
                    Transactions & Orders
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/projects')} className="hover:text-blue-400 transition text-left">
                    Multi-Project Workspaces
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/team')} className="hover:text-blue-400 transition text-left">
                    Team Members & RBAC
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Developer & SDKs */}
            <div className="space-y-3">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Developer Portal</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button onClick={() => navigate('/docs')} className="hover:text-indigo-400 transition text-left">
                    REST API Documentation
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/webhooks')} className="hover:text-indigo-400 transition text-left">
                    Webhooks & HMAC Signatures
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/docs')} className="hover:text-indigo-400 transition text-left">
                    @sumiopay/sdk (TypeScript)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/docs')} className="hover:text-indigo-400 transition text-left">
                    @sumiopay/checkout-react
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/simulator')} className="hover:text-indigo-400 transition text-left">
                    Sandbox Payment Simulator
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Reconciliation & Finance */}
            <div className="space-y-3">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reconciliation & Hardware</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button onClick={() => navigate('/reconciliation')} className="hover:text-emerald-400 transition text-left">
                    Multi-Rule Reconciler
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/reconciliation')} className="hover:text-emerald-400 transition text-left">
                    Bank Statement CSV Ingestion
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/refunds')} className="hover:text-emerald-400 transition text-left">
                    Refunds & Dispute Resolution
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/devices')} className="hover:text-emerald-400 transition text-left">
                    Android Companion Hardware
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/reports')} className="hover:text-emerald-400 transition text-left">
                    Financial Reports Export
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 5: Company & Legal */}
            <div className="space-y-3">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Company & Legal</span>
              </div>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button onClick={() => navigate('/pricing')} className="hover:text-purple-400 transition text-left">
                    Pricing Plans & Limits
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/enterprise')} className="hover:text-purple-400 transition text-left">
                    Enterprise Dedicated SLA
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="hover:text-purple-400 transition text-left">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/privacy')} className="hover:text-purple-400 transition text-left">
                    Privacy Policy (DPDP 2023)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/refund-policy')} className="hover:text-purple-400 transition text-left">
                    Cancellation & Refund Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Legal Notice Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <p>&copy; {new Date().getFullYear()} SumioTech Private Limited. All rights reserved. Built for Indian merchants & SaaS founders.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Zero Fund Holding Architecture &bull; Non-Custodial Direct Settlement to Merchant UPI VPAs &bull; DPDP Act 2023 & RBI Guidelines Compliant.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-slate-300 font-medium">NPCI UPI Aligned</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-300 font-medium">ISO 27001 Standard Aligned</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-300 font-medium">100% Data Sovereignty in India</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <UpiCheckoutModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        appName="SUMIOLAB"
        userId="demo_visitor_123"
        planName="SumioLab Annual Pro Tier"
        baseAmount={499}
        onSuccess={(data) => {
          alert(`Test Payment Confirmed! Order: ${data.orderId}`);
          setDemoOpen(false);
        }}
      />
    </div>
  );
};

export default LandingPage;

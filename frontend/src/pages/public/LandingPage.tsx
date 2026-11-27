import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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
import { AuthModal } from '../../components/auth/AuthModal';
import { SeoHead } from '../../components/SeoHead';
import { publicApi } from '../../lib/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isLoginRoute = location.pathname === '/login';
  const [authModalOpen, setAuthModalOpen] = useState(isLoginRoute);

  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthModalOpen(true);
    }
  }, [location.pathname]);

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false);
    if (location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  };

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
    enterpriseContactEmail: 'contact@sumiotech.in',
    supportPhone: '+91 9875182659',
    subscriptionPlans: {
      trialDays: 3,
      monthlyPrice: 399,
      monthlyDurationDays: 30,
      monthlyDeviceLimit: 2,
      halfYearlyPrice: 1999,
      halfYearlyDurationDays: 180,
      halfYearlyDeviceLimit: 5,
      customPrice: 0,
    },
  });

  // Interactive Live Simulator & Code Inspector State in Hero
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [heroTab, setHeroTab] = useState<'script' | 'url' | 'curl' | 'webhook'>('script');
  const [copiedHeroCode, setCopiedHeroCode] = useState<boolean>(false);

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

  // Dynamic Pricing Plans (controlled live from SuperAdmin)
  const sp = platformConfig?.subscriptionPlans || {};
  const trialDays = sp.trialDays ?? 3;
  const monthlyPrice = sp.monthlyPrice ?? 399;
  const halfYearlyPrice = sp.halfYearlyPrice ?? 1999;
  const monthlyDevices = sp.monthlyDeviceLimit ?? 2;
  const halfYearlyDevices = sp.halfYearlyDeviceLimit ?? 5;
  const customPrice = sp.customPrice ?? 0;
  const halfYearlySavings = Math.max(0, monthlyPrice * 6 - halfYearlyPrice);

  const handleActivateFromLanding = (plan?: string) => {
    const loggedIn = Boolean(localStorage.getItem('sumiopay_token'));
    if (loggedIn) {
      navigate(plan ? `/billing?plan=${plan}` : '/billing');
    } else {
      navigate('/login?register=true');
    }
  };

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
      q: 'Does SumioPay hold my money, or is customer banking data stored on your cloud?',
      a: 'SumioPay holds ₹0.00 of customer or merchant funds at all times. Payments go 100% directly from your customer’s UPI app into your own bank account VPA. SumioPay is a non-custodial software automation tool (not a bank, RBI-licensed Payment Aggregator, or NPCI entity) and never stores debit/credit cards, CVVs, UPI PINs, or net banking passwords.',
    },
  ];

  const homeStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'SumioPay Self-Hosted Direct UPI Payment Gateway',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Linux VPS, Android, Node.js, React, WordPress WooCommerce',
        url: 'https://sumiopay.sumiotech.in/',
        description:
          'Non-custodial, self-hosted and cloud Direct UPI payment orchestration platform in India with 0% transaction fees, unique paise differential matching, Android notification listener verification, and HMAC-SHA256 webhooks.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: '0',
          highPrice: String(halfYearlyPrice),
          offerCount: '3',
        },
        publisher: {
          '@type': 'Organization',
          name: 'SumioTech',
          email: 'contact@sumiotech.in',
          url: 'https://sumiopay.sumiotech.in/',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans antialiased">
      <SeoHead
        title={
          isLoginRoute
            ? 'Merchant Sign In & Onboarding — SumioPay Self-Hosted UPI Gateway'
            : 'SumioPay — Self-Hosted 0% Fee Direct UPI Payment Gateway SaaS India'
        }
        description="Accept direct bank-to-bank UPI QR and intent payments straight to your account with 0% commission, automated UTR verification, WooCommerce & SaaS REST APIs, and flat ₹399/mo plans."
        keywords="self hosted UPI payment gateway India, 0 percent fee UPI gateway, SumioPay, direct UPI QR verification API, SaaS UPI payment automation, WooCommerce UPI gateway zero fee, non custodial UPI software"
        canonicalPath={isLoginRoute ? undefined : '/'}
        noIndex={isLoginRoute}
        structuredData={isLoginRoute ? undefined : homeStructuredData}
      />
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
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition">5 Core Modules</a>
              <a href="#enterprise" className="hover:text-blue-600 transition">Enterprise Scale</a>
              <a href="#simulator" className="hover:text-blue-600 transition">Live Simulator</a>
              <a href="#calculator" className="hover:text-blue-600 transition">Fee Calculator</a>
              <a href="#pricing" className="hover:text-blue-600 transition">Pricing Plans</a>
              <button type="button" onClick={() => navigate('/guide')} className="hover:text-blue-600 transition">Integration Guide</button>
              <button type="button" onClick={() => navigate('/security')} className="hover:text-blue-600 transition">Security &amp; Legal</button>
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
              <a
                href="#pricing"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-blue-600 transition"
              >
                Pricing Plans
              </a>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/enterprise');
                }}
                className="py-1 text-left hover:text-blue-600 transition"
              >
                Enterprise Custom SLA
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/guide');
                }}
                className="py-1 text-left hover:text-blue-600 transition"
              >
                Developer &amp; Platform Guide
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/security');
                }}
                className="py-1 text-left hover:text-blue-600 transition"
              >
                Security &amp; Legal Disclaimer
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#060B18] text-white pt-16 sm:pt-22 pb-20 px-4 sm:px-6 border-b border-slate-800/80">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b33_1px,transparent_1px),linear-gradient(to_bottom,#1e293b33_1px,transparent_1px)] [background-size:48px_48px] opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          {/* Hero Header */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>0% Gateway Commission • Direct UPI to Your Bank • {trialDays}-Day Free Trial</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Accept UPI Payments Straight Into Your Bank. Zero Fees.
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Generate dynamic paise-locked UPI QR codes on your website or SaaS, verify real bank credits in under 1.2 seconds via our Android Listener app, and fire signed webhooks instantly.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto w-full">
              <button
                onClick={() => navigate('/login?register=true')}
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span>Start {trialDays}-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-100 text-sm font-bold transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Preview Live Checkout</span>
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Settled to Your UPI ID</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Duplicate UTR Anti-Fraud Shield</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Starts at ₹{monthlyPrice}/mo After Trial</span>
              </div>
            </div>
          </div>

          {/* Interactive Code & Live QR Terminal */}
          <div id="simulator" className="max-w-5xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm text-white">Developer Integration &amp; Verification Preview</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drop-in script, hosted payment link, REST API, and real-time Android verification flow.
                </p>
              </div>

              <div className="flex flex-wrap items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHeroTab('script')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    heroTab === 'script' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1-Line SDK
                </button>
                <button
                  type="button"
                  onClick={() => setHeroTab('url')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    heroTab === 'url' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment Link
                </button>
                <button
                  type="button"
                  onClick={() => setHeroTab('curl')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    heroTab === 'curl' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  REST API
                </button>
                <button
                  type="button"
                  onClick={() => setHeroTab('webhook')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    heroTab === 'webhook' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Webhook
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left: Code Viewer */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#040711] border border-slate-800 p-4 font-mono text-[11px] leading-relaxed overflow-hidden">
                <div className="overflow-x-auto text-slate-300">
                  {heroTab === 'script' && (
                    <pre><code>{`<!-- Drop-In Checkout Script (HTML / React / PHP) -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<button onclick="SumioPay.checkout({
  apiKey: 'sp_live_YOUR_KEY',
  amount: 399,
  appName: 'MySaaS',
  onSuccess: function(order) {
    // Verified via Android bank push + UTR
    window.location.href = '/activated?orderId=' + order.orderId;
  }
})">
  Pay ₹399 via UPI (0% Fee)
</button>`}</code></pre>
                  )}

                  {heroTab === 'url' && (
                    <pre><code>{`# Zero-Code Hosted Checkout URL
https://sumiopay.sumiotech.in/pay/ORD-20261126-9481

- Locks unique fractional paise (e.g. ₹399.42)
- Renders live UPI QR + GPay / PhonePe / Paytm Intent
- Verifies bank SMS & UTR automatically
- Redirects customer immediately upon confirmation`}</code></pre>
                  )}

                  {heroTab === 'curl' && (
                    <pre><code>{`# Create Verified UPI Order via API
curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "x-api-key: sp_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "baseAmount": 399,
    "appName": "SAAS_BILLING",
    "customerUserId": "usr_8491"
  }'

# Returns: { orderId: "ORD-20261126-9481", exactAmount: 399.42, upiIntentUrl }`}</code></pre>
                  )}

                  {heroTab === 'webhook' && (
                    <pre><code>{`// POST https://yoursite.com/api/webhook
// Header: x-sumiopay-signature: <HMAC-SHA256 hex>
{
  "event": "PAYMENT_CONFIRMED",
  "orderId": "ORD-20261126-9481",
  "appName": "SAAS_BILLING",
  "amount": 399.42,
  "utrNumber": "432109876543",
  "status": "PAID"
}`}</code></pre>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>HMAC-SHA256 Signed &bull; Idempotent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy =
                        heroTab === 'script'
                          ? `<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>`
                          : heroTab === 'url'
                          ? `https://sumiopay.sumiotech.in/pay/ORD-20261126-9481`
                          : heroTab === 'curl'
                          ? `curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders -H "x-api-key: sp_live_YOUR_KEY" -H "Content-Type: application/json" -d '{"baseAmount":399,"appName":"SAAS_BILLING"}'`
                          : `{"event":"PAYMENT_CONFIRMED","orderId":"ORD-20261126-9481","amount":399.42,"utrNumber":"432109876543","status":"PAID"}`;
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedHeroCode(true);
                      setTimeout(() => setCopiedHeroCode(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] transition"
                  >
                    {copiedHeroCode ? 'Copied' : 'Copy Snippet'}
                  </button>
                </div>
              </div>

              {/* Right: Realistic QR Terminal Preview */}
              <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#040711] border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Live UPI Signal Flow
                  </span>
                  <button
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition disabled:opacity-60"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isSimulating ? 'Verifying...' : 'Run Flow'}</span>
                  </button>
                </div>

                {/* Scannable QR Preview Card */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shrink-0">
                    <QRCodeSVG
                      value="upi://pay?pa=sumiotech@upi&pn=SumioTech&am=399.42&cu=INR&tn=ORD-20261126-9481"
                      size={74}
                      level="M"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Exact Amount Lock
                    </div>
                    <div className="text-2xl font-black text-white font-mono">₹399.42</div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      +₹0.42 collision lock • sumiotech@upi
                    </div>
                  </div>
                </div>

                {/* Real State Progression */}
                <div className="space-y-2 text-[11px] font-mono">
                  <div className={`p-2.5 rounded-xl border transition ${
                    simStep >= 1 ? 'bg-blue-950/50 border-blue-500/60 text-blue-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    1. QR Created &bull; ORD-20261126-9481
                  </div>
                  <div className={`p-2.5 rounded-xl border transition ${
                    simStep >= 2 ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    2. Android Listener Parsed Bank Credit (UTR 432109876543)
                  </div>
                  <div className={`p-2.5 rounded-xl border transition ${
                    simStep >= 3 ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    3. Webhook Verified (200 OK) &bull; Status: PAID
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Interactive Checkout Modal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Architectural Benchmarks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-4 text-center border-t border-slate-800/80">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">0%</div>
              <div className="text-xs text-slate-400 mt-1">Gateway Fee Forever</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">&lt; 1.2s</div>
              <div className="text-xs text-slate-400 mt-1">Average UPI Auto-Verify</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">Instant</div>
              <div className="text-xs text-slate-400 mt-1">Direct-to-Bank Settlement</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">HMAC</div>
              <div className="text-xs text-slate-400 mt-1">Signed Webhook Payloads</div>
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

      {/* Core Product Suite Section */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
            Platform Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
            Built for Developers, Finance &amp; Operations
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Every tool required to generate UPI checkouts, auto-verify bank credits, and reconcile payouts at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">SuperAdmin SaaS Governance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Manage merchants, audit KYC submissions, control global subscription plans, create manual/UPI bills, and monitor live gateway risk alerts.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li>&bull; Live Plan Pricing &amp; Free Trial Control</li>
              <li>&bull; Self-Billing Collector Setup &amp; Invoices</li>
              <li>&bull; Complete Action Audit Trail &amp; KYC Queue</li>
            </ul>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Merchant Control Console</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-tenant portal for live order tracking, instant dynamic QR generation, multi-project isolation, refunds, disputes, and team RBAC.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li>&bull; Dynamic Paise-Locked UPI Intent &amp; QR</li>
              <li>&bull; Multi-Project Scopes (SaaS, Store, App)</li>
              <li>&bull; Full Transaction Timeline &amp; Export Reports</li>
            </ul>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Developer Portal &amp; SDKs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integrate any website or SaaS backend in minutes with live/test API keys, drop-in JavaScript checkout, React Modal, and signed webhooks.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li>&bull; Live &amp; Sandbox Keypairs (sp_live / sp_test)</li>
              <li>&bull; HMAC-SHA256 Signed Callback Verification</li>
              <li>&bull; Interactive Webhook Delivery Inspector</li>
            </ul>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-400 shadow-xs hover:shadow-lg transition space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Passbook Reconciliation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Match bank CSV statements against orders by UTR and exact paise, rescue late arrivals, and resolve unmapped credits with one click.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li>&bull; Duplicate UTR Replay Fraud Prevention</li>
              <li>&bull; Delayed Payment Rescue &amp; CSV Batch Match</li>
              <li>&bull; Unmapped Payment Ledger Resolution</li>
            </ul>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-slate-200/90 hover:border-purple-400 shadow-xs hover:shadow-lg transition space-y-4 md:col-span-2 lg:col-span-1">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Android Listener Companion APK</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Lightweight Android companion app monitors PhonePe, GPay, Paytm, BHIM &amp; Bank SMS credit alerts and relays instant cryptographic signals.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100">
              <li>&bull; 10-Second QR Pairing &amp; Multi-Phone Failover</li>
              <li>&bull; Live Battery, Signal &amp; Heartbeat Telemetry</li>
              <li>&bull; Direct Background Notification Interceptor</li>
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
              Zero Fund Custody &amp; Real Cryptographic Security
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Built from first principles so ₹0 ever stays in escrow: SSRF-firewalled webhooks, CSPRNG paise-locking, constant-time OTP locks, and 100% direct bank settlement.
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
              <h3 className="font-bold text-white text-base">₹0 Fund Custody (Direct-to-Bank)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero client funds are pooled, escrowed, or touched. Every rupee flows directly between the customer&apos;s UPI app and your bank VPA — eliminating holding delays.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h3 className="font-bold text-white text-base">SSRF Firewall &amp; Anti-Replay Defense</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                HMAC-SHA256 webhook signing with DNS/RFC1918 SSRF blocking, strict 12-digit UTR anti-replay checks, rotating JWT families, and zero card/CVV/PIN storage.
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

      {/* Transparent Flat SaaS Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{trialDays}-Day Free Trial • 0% Gateway Commission</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-3">
              Simple Flat Pricing. Zero Transaction Cut.
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Start free for {trialDays} days. Then activate directly via SumioPay UPI for ₹{monthlyPrice}/month or ₹{halfYearlyPrice}/6 months.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Free Trial */}
            <div className="rounded-3xl p-7 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Free Trial</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {trialDays} Days Free
                  </span>
                </div>
                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-950">₹0</span>
                  <span className="text-xs font-semibold text-slate-500">/ {trialDays} days</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  Try live UPI auto-verification, Android Listener &amp; webhooks free on signup.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                  {[
                    `${trialDays}-Day Instant Trial on Signup`,
                    'Android Listener App + QR Pairing',
                    'Sandbox + Live Payment Testing',
                    'HMAC-SHA256 Signed Webhooks',
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/login?register=true')}
                className="mt-7 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>Start {trialDays}-Day Free Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Monthly ₹399 */}
            <div className="rounded-3xl p-7 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Monthly Pro</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    30 Days
                  </span>
                </div>
                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-950">₹{monthlyPrice.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-semibold text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  All core UPI gateway features for websites, SaaS &amp; stores.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                  {[
                    '0% Transaction Commission',
                    `Up to ${monthlyDevices} Android Listener Phones`,
                    'Unlimited Live UPI Transactions',
                    'Hosted Checkout + SDK + REST API',
                    'Unmapped Payment 1-Click Reconcile',
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleActivateFromLanding('MONTHLY')}
                className="mt-7 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Activate ₹{monthlyPrice}/mo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 6 Months ₹1,999 */}
            <div className="rounded-3xl p-7 bg-slate-950 text-white border-2 border-blue-500 shadow-xl flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm">
                Most Popular {halfYearlySavings > 0 ? `• Save ₹${halfYearlySavings}` : ''}
              </span>
              <div>
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-base font-bold text-white">6 Months Growth</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-blue-300">
                    180 Days
                  </span>
                </div>
                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">₹{halfYearlyPrice.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-semibold text-slate-400">/ 6 months</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-5">
                  Save more on semi-annual billing (≈ ₹{Math.round(halfYearlyPrice / 6)}/mo effective).
                </p>
                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-200">
                  {[
                    'Everything in Monthly Pro',
                    `Up to ${halfYearlyDevices} Android Listener Phones`,
                    'Multi-Phone Load Balancing',
                    'Priority Webhook Retries & CSV Sync',
                    'Priority Support (+91 9875182659)',
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleActivateFromLanding('HALF_YEARLY')}
                className="mt-7 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Activate ₹{halfYearlyPrice} / 6 Mo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom All Features */}
            <div className="rounded-3xl p-7 bg-white border border-amber-300 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Custom Plan</h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    All Features
                  </span>
                </div>
                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-950">
                    {customPrice > 0 ? `₹${customPrice.toLocaleString('en-IN')}` : 'Custom'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {customPrice > 0 ? '/ yr' : '• All Features'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  Every enterprise capability unlocked with white-label checkout &amp; unlimited devices.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                  {[
                    'ALL SumioPay Features Included',
                    'Unlimited Listener Phones & UPI VPAs',
                    'White-Label Checkout & Custom Domain',
                    'RBAC Team, Refunds & Audit Logs',
                    'Dedicated SLA (contact@sumiotech.in)',
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/enterprise')}
                className="mt-7 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold transition flex items-center justify-center gap-1.5"
              >
                <span>Get Custom Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/pricing')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5"
            >
              <span>Compare All Features vs Traditional Aggregators</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
              Preview Live Checkout
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
                    v2.5 Enterprise
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
                  <button onClick={() => navigate('/guide')} className="hover:text-indigo-400 text-slate-200 font-semibold transition text-left">
                    Complete Integration Guide (/guide)
                  </button>
                </li>
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
                  <button onClick={() => navigate('/security')} className="hover:text-emerald-400 text-slate-200 font-semibold transition text-left">
                    Security &amp; Non-Custodial Disclaimer
                  </button>
                </li>
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
                    Privacy &amp; Data Policy
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

          {/* Transparent Non-Custodial Legal Notice Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <p>&copy; {new Date().getFullYear()} SumioTech. All rights reserved. Built for Indian merchants &amp; SaaS founders.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                100% Non-Custodial Software Utility &bull; ₹0.00 Held by SumioPay — Customer payments route directly bank-to-bank into Merchant UPI VPAs. Not a bank, Payment Aggregator, RBI, or NPCI entity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="text-emerald-400 font-semibold">₹0 Fund Custody</span>
              <span className="text-slate-600">&bull;</span>
              <button onClick={() => navigate('/security')} className="text-slate-300 hover:text-white underline font-medium">
                Security Architecture
              </button>
              <span className="text-slate-600">&bull;</span>
              <button onClick={() => navigate('/disclaimer')} className="text-slate-300 hover:text-white underline font-medium">
                Legal Disclaimer
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal (Interactive Browser Preview) */}
      <UpiCheckoutModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        appName="SUMIOPAY"
        userId="demo_visitor"
        planName="Monthly Pro Preview"
        websiteName="SumioTech Cloud"
        brandColor="#4F3DF5"
        baseAmount={monthlyPrice}
        billDetails={{
          items: [{ label: 'SumioPay Merchant License (Monthly)', quantity: 1, amount: monthlyPrice + 100 }],
          subtotal: monthlyPrice + 100,
          couponCode: 'SUMIO100',
          discountAmount: 100,
          note: `To begin your subscription, ₹${monthlyPrice} will be processed securely via UPI.`,
        }}
        demoMode={true}
      />

      {/* Enterprise Authentication Modal Overlay */}
      <AuthModal
        isOpen={authModalOpen || location.pathname === '/login'}
        onClose={handleCloseAuthModal}
        defaultMode={searchParams.get('register') === 'true' ? 'register' : 'login'}
      />
    </div>
  );
};

export default LandingPage;

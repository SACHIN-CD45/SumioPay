import React, { useState, useEffect } from 'react';
import { api, API_BASE } from '../../lib/api';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Smartphone,
  ArrowUpRight,
  Sparkles,
  Zap,
  RefreshCw,
  Copy,
  Check,
  Download,
  QrCode,
  Terminal,
  Code2,
  X,
  AlertTriangle,
  Play,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { UpiCheckoutModal } from '../../sdk/UpiCheckoutModal';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [merchant, setMerchant] = useState<any>(null);

  // Companion App Onboarding Modal
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [pairingToken, setPairingToken] = useState<string>('');
  const [pairingPayloadJson, setPairingPayloadJson] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Developer Sandbox & QR Playground
  const [testAmount, setTestAmount] = useState<number>(100);
  const [testAppName, setTestAppName] = useState<string>('MyStore');
  const [liveOrder, setLiveOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sandboxTab, setSandboxTab] = useState<'qr' | 'html' | 'woocommerce' | 'api'>('qr');
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/dashboard-stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
      const profileRes = await api.get('/merchant/profile');
      if (profileRes.data.success) {
        setMerchant(profileRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch fresh pairing QR token when opening companion modal
  const openCompanionModal = async () => {
    setIsInstallModalOpen(true);
    try {
      const res = await api.post('/device/generate-pairing-token');
      if (res.data.success) {
        setPairingToken(res.data.data.pairingToken);
        setPairingPayloadJson(res.data.data.pairingPayloadJson);
      }
    } catch (err) {
      console.error('Failed to generate pairing token:', err);
    }
  };

  // Generate Live Dynamic UPI QR for Sandbox
  const handleGenerateSandboxQr = async () => {
    try {
      setIsCreatingOrder(true);
      const res = await api.post('/order/create', {
        baseAmount: Number(testAmount) || 100,
        appName: testAppName || 'STORE',
        customerUserId: 'sandbox_user_' + Math.floor(Math.random() * 1000),
      });

      if (res.data.success && res.data.data) {
        setLiveOrder(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Simulate Instant UPI Credit (Webhook test)
  const handleSimulatePayment = async () => {
    if (!liveOrder?.orderId) return;
    try {
      setIsSimulating(true);
      const res = await api.post(`/order/sandbox-simulate-payment/${liveOrder.orderId}`);
      if (res.data.success) {
        setLiveOrder((prev: any) => ({
          ...prev,
          status: 'PAID',
          utrNumber: res.data.data.utrNumber,
        }));
        fetchStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to simulate payment');
    } finally {
      setIsSimulating(false);
    }
  };

  // Poll live order status while pending in sandbox
  useEffect(() => {
    if (!liveOrder || liveOrder.status === 'PAID') return;
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/order/status/${liveOrder.orderId}`);
        if (res.data.success && res.data.data?.status === 'PAID') {
          setLiveOrder((prev: any) => ({
            ...prev,
            status: 'PAID',
            utrNumber: res.data.data.utrNumber,
          }));
          fetchStats();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [liveOrder]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
              Central Multi-App Gateway
            </span>
            <span className="text-xs text-slate-500">Merchant: {merchant?.businessName || 'SumioTech'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Universal UPI Auto-Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Receiving VPA: <span className="font-mono text-blue-600 font-bold">{merchant?.upiId || 'Loading...'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openCompanionModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Install Companion App (v2.5)</span>
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Checkout Modal</span>
          </button>
          <button
            onClick={fetchStats}
            title="Refresh Realtime Stats"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-subtle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Critical Setup Alert Banner if no phone is connected */}
      {stats?.onlineDevicesCount === 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Action Required: Install SumioPay Companion App on your Android Phone
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                To auto-verify payments in &lt;1.2s when customers scan your UPI QR code, install the lightweight companion app on any spare Android phone. It intercepts bank notifications and SMS with zero battery drain.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openCompanionModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Setup Companion Phone</span>
            </button>
            <a
              href={`${API_BASE}/public/download-apk`}
              download="SumioPayListener-v2.5.apk"
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-subtle transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </a>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Lifetime Volume (GMV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats?.lifetimeVolume?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            100% direct bank settlement (0% fee)
          </div>
        </div>

        {/* Today's GMV */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Today's Collections</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats?.todayVolume?.toLocaleString('en-IN') || '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.todayPaidCount || 0} successful orders today
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Auto-Verify Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.conversionRate || '100%'}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.totalPaidOrders || 0} of {stats?.totalOrders || 0} orders
          </div>
        </div>

        {/* Listener Phones Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Android Listener Status</span>
            <Smartphone className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{stats?.onlineDevicesCount || 0}</span>
            <span className="text-xs font-normal text-slate-500">/ {stats?.totalDevices || 0} Paired</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.onlineDevicesCount > 0 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active & Listening
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Needs Phone Pairing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Developer Sandbox & Live QR Payment Simulator */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Interactive Developer Mode
              </span>
              <span className="text-xs text-slate-400">0% Gateway Cut • Direct Bank Settlement</span>
            </div>
            <h2 className="text-xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Live UPI QR Payment Playground &amp; Website Integration
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Test real dynamic QR generation, mobile intent deep links, and automated webhook auto-verification right here before embedding into your website.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setSandboxTab('qr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                sandboxTab === 'qr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live QR Test
            </button>
            <button
              onClick={() => setSandboxTab('html')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                sandboxTab === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drop-In HTML
            </button>
            <button
              onClick={() => setSandboxTab('woocommerce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                sandboxTab === 'woocommerce' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              WooCommerce
            </button>
            <button
              onClick={() => setSandboxTab('api')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                sandboxTab === 'api' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              REST API
            </button>
          </div>
        </div>

        {/* Tab 1: Live QR Test Playground */}
        {sandboxTab === 'qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">1. Configure Test Order</h3>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Order Base Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:border-blue-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    SumioPay will automatically allocate a unique paise offset (e.g., ₹{testAmount}.14)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Store / App Name
                  </label>
                  <input
                    type="text"
                    value={testAppName}
                    onChange={(e) => setTestAppName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 outline-none"
                  />
                </div>

                <button
                  onClick={handleGenerateSandboxQr}
                  disabled={isCreatingOrder}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isCreatingOrder ? 'Generating...' : '⚡ Generate Dynamic UPI QR'}</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="font-bold text-slate-300">How to test live money collection:</div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>Scan the QR on the right using PhonePe, GPay, Paytm, or BHIM.</li>
                  <li>Pay the exact locked amount (with paise offset).</li>
                  <li>100% money settles into your bank account instantly.</li>
                  <li>Companion phone detects bank notification/SMS and marks order PAID in &lt;1.2s!</li>
                </ol>
              </div>
            </div>

            {/* Right: Dynamic QR Render */}
            <div className="lg:col-span-7">
              {liveOrder ? (
                <div className={`p-6 rounded-2xl border transition-all ${
                  liveOrder.status === 'PAID'
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-emerald-900/20 shadow-2xl'
                    : 'bg-slate-950 border-slate-800 shadow-xl'
                }`}>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Order ID: <span className="text-white font-mono">{liveOrder.orderId}</span>
                      </span>
                      <div className="text-3xl font-black text-white font-mono mt-1">
                        ₹{liveOrder.exactAmount?.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold">
                        Paise Offset: +₹{liveOrder.paiseOffset?.toFixed(2)} (Auto-Matching Active)
                      </span>
                    </div>

                    <div>
                      {liveOrder.status === 'PAID' ? (
                        <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>PAYMENT VERIFIED (PAID)</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                          <span>Awaiting UPI Payment...</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QR Image & Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 py-6">
                    <div className="p-3 bg-white rounded-2xl shadow-inner inline-block">
                      <QRCodeSVG
                        value={liveOrder.upiIntentUrl || ''}
                        size={170}
                        level="M"
                      />
                    </div>

                    <div className="space-y-3 flex-1 text-center sm:text-left">
                      <div className="text-xs text-slate-300">
                        Scan with <span className="text-white font-bold">Google Pay, PhonePe, Paytm, BHIM, CRED</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 break-all">
                        {liveOrder.upiId || merchant?.upiId}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={liveOrder.upiIntentUrl}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Open in UPI App</span>
                        </a>

                        <a
                          href={`/pay/${liveOrder.orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Hosted Link</span>
                        </a>

                        {liveOrder.status !== 'PAID' && liveOrder.isTest && (
                          <button
                            onClick={handleSimulatePayment}
                            disabled={isSimulating}
                            className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{isSimulating ? 'Verifying...' : 'Simulate Instant Credit (Test Mode)'}</span>
                          </button>
                        )}
                        {liveOrder.status !== 'PAID' && !liveOrder.isTest && (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[10px] text-amber-300 font-semibold">
                            Live QR: Pay via UPI App (Switch top bar to Test Mode to simulate free)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {liveOrder.status === 'PAID' && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Instant Auto-Verification Confirmed! Bank UTR: <strong>{liveOrder.utrNumber || '412345678901'}</strong></span>
                      </div>
                      <button
                        onClick={handleGenerateSandboxQr}
                        className="text-xs text-emerald-400 underline font-bold hover:text-emerald-300 ml-2"
                      >
                        Test Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">No Active Sandbox Order</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Enter an amount on the left and click "Generate Dynamic UPI QR" to test real-time money collection.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Universal Drop-in HTML / JS */}
        {sandboxTab === 'html' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Universal 1-Line Drop-in Checkout Script</h3>
                <p className="text-xs text-slate-400">Works on Shopify, WordPress, Webflow, Custom PHP, React, or static HTML</p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(`<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<button 
  onclick="SumioPay.checkout({
    apiKey: '${merchant?.apiKey || 'sp_live_YOUR_KEY'}',
    websiteName: '${merchant?.websiteName || merchant?.businessName || 'MyStore'}',
    brandColor: '${merchant?.brandColor || '#4F3DF5'}',
    amount: 499,
    appName: '${merchant?.businessName || 'MyStore'}',
    onSuccess: function(order) {
      alert('Payment Verified! UTR: ' + order.utr);
      window.location.href = '/order-success?orderId=' + order.orderId;
    }
  })"
  style="background:#4F3DF5;color:#fff;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;border:none;">
  Pay via Direct UPI (0% Fee)
</button>`)
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`<!-- 1. Include SumioPay Universal Drop-In SDK in your website header -->
<script src="https://apipay.sumiotech.in/api/public/checkout.js"></script>

<!-- 2. Drop this button anywhere on your product or cart checkout page -->
<button 
  onclick="SumioPay.checkout({
    apiKey: '${merchant?.apiKey || 'sp_live_YOUR_KEY'}',
    websiteName: '${merchant?.websiteName || merchant?.businessName || 'MyStore'}',
    brandColor: '${merchant?.brandColor || '#4F3DF5'}',
    amount: 499,
    appName: '${merchant?.businessName || 'MyStore'}',
    userId: 'cust_84920',
    onSuccess: function(order) {
      console.log('Payment Auto-Verified:', order.orderId, order.utr);
      window.location.href = '/order-success?orderId=' + order.orderId;
    }
  })"
  style="background:#4F3DF5;color:#fff;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;border:none;">
  Pay via Direct UPI (0% Fee)
</button>`}
            </pre>
          </div>
        )}

        {/* Tab 3: WooCommerce */}
        {sandboxTab === 'woocommerce' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Official WooCommerce Payment Gateway Plugin</h3>
                <p className="text-xs text-slate-400">Install our WordPress plugin for zero-code automatic order completion</p>
              </div>
              <a
                href={`${API_BASE}/public/download-woocommerce-plugin`}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Plugin (sumiopay-woocommerce.zip)</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-blue-400">Step 1: Upload Plugin</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Go to WordPress Admin &rarr; Plugins &rarr; Add New &rarr; Upload Plugin &rarr; select <span className="font-mono text-slate-200">sumiopay-woocommerce.zip</span> &rarr; Activate.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-emerald-400">Step 2: Enter API Key</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Go to WooCommerce Settings &rarr; Payments &rarr; SumioPay UPI &rarr; paste your API Key: <code className="text-emerald-300 font-mono text-[10px]">{merchant?.apiKey ? merchant.apiKey.substring(0, 14) + '...' : 'sp_live_xxxx'}</code>.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-purple-400">Step 3: Instant Fulfillment</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  When customer scans QR and pays, SumioPay marks WooCommerce order as "Processing / Completed" in &lt;1.2 seconds!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: REST API */}
        {sandboxTab === 'api' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Direct Backend REST API (cURL / Node / PHP / Python)</h3>
                <p className="text-xs text-slate-400">Standard RESTful API with HMAC Webhook callback</p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(`curl -X POST https://apipay.sumiotech.in/api/v1/payments/orders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${merchant?.apiKey || 'sp_live_YOUR_KEY'}" \\
  -d '{
    "baseAmount": 499,
    "appName": "MY_STORE",
    "customerUserId": "order_#1092",
    "callbackWebhookUrl": "https://mystore.com/api/payment-callback"
  }'`)
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy cURL'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
{`# 1. Create Order via REST API:
POST https://apipay.sumiotech.in/api/v1/payments/orders
Headers:
  x-api-key: ${merchant?.apiKey || 'sp_live_YOUR_KEY'}
  Content-Type: application/json
Body:
  {
    "baseAmount": 499,
    "appName": "MY_STORE",
    "customerUserId": "order_#1092",
    "callbackWebhookUrl": "https://mystore.com/api/payment-callback"
  }

# 2. Response returns:
# - exactAmount: 499.14 (Paise locked for 15 mins)
# - upiIntentUrl: "upi://pay?pa=${merchant?.upiId || 'merchant@okhdfcbank'}&pn=Store&am=499.14&tr=ORD-xxx"
# - orderId: "ORD-20261125-8B2A91"

# 3. Webhook sent to your callbackWebhookUrl upon payment:
# Headers: x-sumiopay-signature (HMAC-SHA256)
# Body: { "event": "payment.succeeded", "orderId": "ORD-xxx", "amount": 499.14, "utr": "412345678901" }`}
            </pre>
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Live Incoming Transactions Feed
          </h2>
          <a
            href="/orders"
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            View Full Ledger <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/60">
                <th className="py-3 px-3 font-semibold">Order ID</th>
                <th className="py-3 px-3 font-semibold">Website / App</th>
                <th className="py-3 px-3 font-semibold">Payer / Customer</th>
                <th className="py-3 px-3 font-semibold">Amount (Exact)</th>
                <th className="py-3 px-3 font-semibold">Bank / UPI &amp; UTR</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((ord: any) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{ord.orderId}</span>
                        {ord.isTest && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                            TEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {ord.appName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-[11px]">
                      <div className="font-semibold text-slate-900">
                        {ord.senderName || ord.customerEmail || ord.customerUserId || 'guest'}
                      </div>
                      {ord.customerUserId && ord.senderName && (
                        <div className="text-[10px] font-mono text-slate-400">ID: {ord.customerUserId}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{ord.exactAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="text-emerald-700 font-bold">{ord.utrNumber || '—'}</div>
                      {ord.bankAppName && (
                        <div className="text-[10px] text-slate-500 font-sans font-semibold">{ord.bankAppName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions yet. Generate a test order above to try!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SENIOR LEVEL ONBOARDING POPUP: COMPANION APP ACTIVATION */}
      {/* ======================================================== */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-white relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  Senior-Level Companion Setup
                </span>
                <span className="text-xs text-slate-400">Android 7.0 to Android 16</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Activate Real UPI Auto-Verification Companion Phone
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Install this companion application on any Android phone that receives your incoming bank credit alerts (PhonePe, GPay, Paytm, BHIM, Bank SMS). It automatically verifies user payments in &lt;1.2 seconds.
              </p>
            </div>

            {/* 2 Column: Phone Camera QR & Direct Download */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-slate-950 border border-slate-800 items-center">
              {/* Left: Scan QR */}
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Scan with Phone Camera to Download
                </span>
                <div className="p-3 bg-white rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={`${API_BASE}/public/download-apk`}
                    size={130}
                    level="M"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Direct Android Download Link
                </span>
              </div>

              {/* Right: Direct Download Button & Details */}
              <div className="space-y-3 text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-bold text-white">SumioPayListener-v2.5.apk</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lightweight (624 KB) • 24x7 Battery Friendly • Notification Interceptor (UPI + Bank Alerts)
                  </p>
                </div>

                <a
                  href={`${API_BASE}/public/download-apk`}
                  download="SumioPayListener-v2.5.apk"
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK to PC / Phone</span>
                </a>

                <div className="text-[11px] text-emerald-400 font-medium">
                  ✓ Pre-configured for server: <code className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded">apipay.sumiotech.in</code>
                </div>
              </div>
            </div>

            {/* Step-by-Step Activation Guide */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Simple 3-Step Phone Activation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-blue-400 font-bold text-[11px]">1. Install APK</div>
                  <p className="text-[11px] text-slate-400">
                    Open APK on phone &rarr; Allow &quot;Install unknown apps&quot; in Chrome/Files.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-bold text-[11px]">2. Grant Permissions</div>
                  <p className="text-[11px] text-slate-400">
                    Tap &quot;Enable Notification Access&quot; &amp; &quot;Unrestrict Battery&quot;.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-purple-400 font-bold text-[11px]">3. Pair Token</div>
                  <p className="text-[11px] text-slate-400">
                    Paste the token below &rarr; Tap &quot;Complete Device Pairing&quot;.
                  </p>
                </div>
              </div>

              {/* Pairing Token Box */}
              {pairingToken && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                      Your Unique Pairing Token:
                    </span>
                    <div className="font-mono text-sm font-black text-white mt-0.5">
                      {pairingToken}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pairingToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied Token!' : 'Copy Token'}</span>
                  </button>
                </div>
              )}

              {/* Android 14/15/16 Note */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
                <strong>Android 13, 14, 15, 16 Tip:</strong> If notification toggle says <em>&ldquo;Restricted setting&rdquo;</em>: Open Phone Settings &rarr; Apps &rarr; SumioPay Listener &rarr; tap the <strong>3 vertical dots</strong> in the top-right corner &rarr; select <strong>&ldquo;Allow restricted settings&rdquo;</strong>.
              </div>
            </div>

            {/* Bottom Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Done &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      <UpiCheckoutModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        appName="SUMIOLAB"
        userId="usr_test_demo"
        planName="SumioLab Annual Pro Tier"
        websiteName={merchant?.websiteName || merchant?.businessName}
        websiteLogoUrl={merchant?.websiteLogoUrl}
        brandColor={merchant?.brandColor}
        baseAmount={499}
        billDetails={{
          items: [{ label: 'SumioLab Annual Pro Tier', quantity: 1, amount: 599 }],
          subtotal: 599,
          couponCode: 'PRO100',
          discountAmount: 100,
          note: 'Live merchant test checkout displaying your website identity, coupon discount, and Trusted Business badge.',
        }}
        apiUrl={API_BASE}
        apiKey={merchant?.apiKey}
        onSuccess={(data) => {
          console.log('Payment Successful in Dashboard Test:', data);
          fetchStats();
        }}
      />
    </div>
  );
};

export default DashboardPage;

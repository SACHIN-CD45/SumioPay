import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { SeoHead } from './components/SeoHead';
import { LandingPage } from './pages/public/LandingPage';
import { PricingPage } from './pages/public/PricingPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { TermsPage } from './pages/public/TermsPage';
import { RefundPolicyPage } from './pages/public/RefundPolicyPage';
import { SecurityCompliancePage } from './pages/public/SecurityCompliancePage';
import { IntegrationGuidePage } from './pages/public/IntegrationGuidePage';
import { EnterprisePage } from './pages/public/EnterprisePage';
import { HostedPaymentPage } from './pages/public/HostedPaymentPage';
import { PublicPaymentLinkPage } from './pages/public/PublicPaymentLinkPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/merchant/LoginPage';
import { DashboardPage } from './pages/merchant/DashboardPage';
import { ConnectPage } from './pages/merchant/ConnectPage';
import { DevicesPage } from './pages/merchant/DevicesPage';
import { OrdersPage } from './pages/merchant/OrdersPage';
import { ReconciliationPage } from './pages/merchant/ReconciliationPage';
import { ProjectsPage } from './pages/merchant/ProjectsPage';
import { TeamPage } from './pages/merchant/TeamPage';
import { BillingPage } from './pages/merchant/BillingPage';
import { ProfilePage } from './pages/merchant/ProfilePage';
import { RefundsPage } from './pages/merchant/RefundsPage';
import { ReportsPage } from './pages/merchant/ReportsPage';
import { WebhooksPage } from './pages/merchant/WebhooksPage';
import { SimulatorPage } from './pages/merchant/SimulatorPage';
import { DocsPage } from './pages/merchant/DocsPage';
import { PaymentLinksPage } from './pages/merchant/PaymentLinksPage';
import { SaasPlansPage } from './pages/merchant/SaasPlansPage';
import { SuperAdminLayout } from './pages/superadmin/SuperAdminLayout';
import { SuperAdminLoginPage } from './pages/superadmin/SuperAdminLoginPage';
import { SuperAdminOverviewPage } from './pages/superadmin/SuperAdminOverviewPage';
import { SuperAdminMerchantsPage } from './pages/superadmin/SuperAdminMerchantsPage';
import { SuperAdminKycPage } from './pages/superadmin/SuperAdminKycPage';
import { SuperAdminTransactionsPage } from './pages/superadmin/SuperAdminTransactionsPage';
import { SuperAdminReconciliationPage } from './pages/superadmin/SuperAdminReconciliationPage';
import { SuperAdminDevicesPage } from './pages/superadmin/SuperAdminDevicesPage';
import { SuperAdminWebhooksPage } from './pages/superadmin/SuperAdminWebhooksPage';
import { SuperAdminRiskSecurityPage } from './pages/superadmin/SuperAdminRiskSecurityPage';
import { SuperAdminSubscriptionsPage } from './pages/superadmin/SuperAdminSubscriptionsPage';
import { SuperAdminAuditLogsPage } from './pages/superadmin/SuperAdminAuditLogsPage';
import { SuperAdminSettingsPage } from './pages/superadmin/SuperAdminSettingsPage';
import { api } from './lib/api';

// Merchant Layout with Light Theme Navbar & Sidebar
const MerchantLayout: React.FC = () => {
  const token = localStorage.getItem('sumiopay_token');
  const location = useLocation();
  const [merchant, setMerchant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [portalMode, setPortalMode] = useState<'LIVE' | 'TEST'>(
    (localStorage.getItem('sumiopay_mode') as 'LIVE' | 'TEST') || 'LIVE'
  );

  useEffect(() => {
    const handleMode = () => {
      setPortalMode((localStorage.getItem('sumiopay_mode') as 'LIVE' | 'TEST') || 'LIVE');
    };
    window.addEventListener('sumiopay_mode_changed', handleMode);
    return () => window.removeEventListener('sumiopay_mode_changed', handleMode);
  }, []);

  const fetchMeta = useCallback(async () => {
    if (!token) return;
    try {
      const [profRes, subRes] = await Promise.all([
        api.get('/merchant/profile'),
        api.get('/merchant/subscription'),
      ]);
      if (profRes.data.success) setMerchant(profRes.data.data);
      const subData = subRes.data.success ? subRes.data.data : null;
      if (subData) {
        setSubscription(subData);
      }

      if (!subData?.isExpired) {
        const devRes = await api.get('/device/my-devices').catch(() => null);
        if (devRes?.data?.success) {
          const online = devRes.data.data.filter((d: any) => d.status === 'ONLINE').length;
          setOnlineCount(online);
        }
      } else {
        setOnlineCount(0);
      }
    } catch (e) {
      // Token expired or invalid
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchMeta();
    const interval = setInterval(fetchMeta, 12000);

    const handleSubUpdated = () => {
      fetchMeta();
    };
    const handleSubExpired = () => {
      setSubscription((prev: any) => ({ ...(prev || {}), isExpired: true, daysRemaining: 0 }));
    };

    window.addEventListener('sumiopay_subscription_updated', handleSubUpdated);
    window.addEventListener('sumiopay_subscription_expired', handleSubExpired);
    return () => {
      clearInterval(interval);
      window.removeEventListener('sumiopay_subscription_updated', handleSubUpdated);
      window.removeEventListener('sumiopay_subscription_expired', handleSubExpired);
    };
  }, [token, fetchMeta]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isSubscriptionExpired = Boolean(subscription?.isExpired);
  const mustRedirectToBilling = isSubscriptionExpired && location.pathname !== '/billing';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar
        merchant={merchant}
        onlineDevicesCount={onlineCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isSubscriptionExpired={isSubscriptionExpired}
      />

      {isSubscriptionExpired ? (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2.5 shadow-sm z-20">
          <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
            <span>
              SUBSCRIPTION REQUIRED — Your {subscription?.planTier === 'TRIAL' ? '3-day free trial' : 'plan'} has expired. All dashboard modules and payment APIs are locked until you activate a plan.
            </span>
          </div>
        </div>
      ) : (
        portalMode === 'TEST' && (
          <div className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 flex items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse"></span>
              <span>
                DEVELOPER TEST MODE ACTIVE — Real bank accounts are not debited. Test UPI intents, simulated payments, and webhooks freely.
              </span>
              <button
                onClick={() => {
                  localStorage.setItem('sumiopay_mode', 'LIVE');
                  setPortalMode('LIVE');
                  window.dispatchEvent(new Event('sumiopay_mode_changed'));
                }}
                className="ml-auto underline text-slate-950 hover:text-slate-800 font-extrabold text-[11px] shrink-0"
              >
                Switch to Live Mode &rarr;
              </button>
            </div>
          </div>
        )
      )}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isSubscriptionExpired={isSubscriptionExpired}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          <SeoHead
            title="Merchant Console — SumioPay"
            description="Protected merchant workspace."
            noIndex
          />
          {mustRedirectToBilling ? <Navigate to="/billing?expired=true" replace /> : <Outlet />}
        </main>
      </div>
    </div>
  );
};

// SuperAdmin Guard
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('sumiopay_superadmin_token');
  if (!token) {
    return <Navigate to="/superadmin/login" replace />;
  }
  return (
    <>
      <SeoHead
        title="Restricted Admin Console — SumioPay"
        description="Restricted administrative console."
        noIndex
      />
      {children}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing Landing & Legal Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/security" element={<SecurityCompliancePage />} />
        <Route path="/disclaimer" element={<SecurityCompliancePage />} />
        <Route path="/guide" element={<IntegrationGuidePage />} />

        {/* Merchant Public Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Public Hosted Direct Payment Link & QR Checkout */}
        <Route path="/pay/:orderId" element={<HostedPaymentPage />} />
        <Route path="/p/:slug" element={<PublicPaymentLinkPage />} />

        {/* Merchant Portal Protected Routes */}
        <Route element={<MerchantLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/links" element={<PaymentLinksPage />} />
          <Route path="/saas-plans" element={<SaasPlansPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>

        {/* SuperAdmin Routes */}
        <Route path="/superadmin" element={<Navigate to="/superadmin/overview" replace />} />
        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
        <Route
          element={
            <SuperAdminGuard>
              <SuperAdminLayout />
            </SuperAdminGuard>
          }
        >
          <Route path="/superadmin/dashboard" element={<Navigate to="/superadmin/overview" replace />} />
          <Route path="/superadmin/overview" element={<SuperAdminOverviewPage />} />
          <Route path="/superadmin/merchants" element={<SuperAdminMerchantsPage />} />
          <Route path="/superadmin/kyc" element={<SuperAdminKycPage />} />
          <Route path="/superadmin/transactions" element={<SuperAdminTransactionsPage />} />
          <Route path="/superadmin/reconciliation" element={<SuperAdminReconciliationPage />} />
          <Route path="/superadmin/devices" element={<SuperAdminDevicesPage />} />
          <Route path="/superadmin/webhooks" element={<SuperAdminWebhooksPage />} />
          <Route path="/superadmin/risk" element={<SuperAdminRiskSecurityPage />} />
          <Route path="/superadmin/subscriptions" element={<SuperAdminSubscriptionsPage />} />
          <Route path="/superadmin/audit" element={<SuperAdminAuditLogsPage />} />
          <Route path="/superadmin/settings" element={<SuperAdminSettingsPage />} />
        </Route>

        {/* Catch-all to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

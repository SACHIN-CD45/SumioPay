import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LandingPage } from './pages/public/LandingPage';
import { PricingPage } from './pages/public/PricingPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { TermsPage } from './pages/public/TermsPage';
import { RefundPolicyPage } from './pages/public/RefundPolicyPage';
import { EnterprisePage } from './pages/public/EnterprisePage';
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
import { RefundsPage } from './pages/merchant/RefundsPage';
import { ReportsPage } from './pages/merchant/ReportsPage';
import { WebhooksPage } from './pages/merchant/WebhooksPage';
import { SimulatorPage } from './pages/merchant/SimulatorPage';
import { DocsPage } from './pages/merchant/DocsPage';
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
  const [merchant, setMerchant] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const fetchMeta = async () => {
      try {
        const [profRes, devRes] = await Promise.all([
          api.get('/merchant/profile'),
          api.get('/device/my-devices'),
        ]);
        if (profRes.data.success) setMerchant(profRes.data.data);
        if (devRes.data.success) {
          const online = devRes.data.data.filter((d: any) => d.status === 'ONLINE').length;
          setOnlineCount(online);
        }
      } catch (e) {
        // Token expired or invalid
      }
    };

    fetchMeta();
    const interval = setInterval(fetchMeta, 12000);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar
        merchant={merchant}
        onlineDevicesCount={onlineCount}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          <Outlet />
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
  return <>{children}</>;
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

        {/* Merchant Public Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Merchant Portal Protected Routes */}
        <Route element={<MerchantLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/billing" element={<BillingPage />} />
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

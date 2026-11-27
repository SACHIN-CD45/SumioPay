import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  FileCheck2,
  ReceiptIndianRupee,
  GitCompareArrows,
  Smartphone,
  Webhook,
  ShieldAlert,
  CreditCard,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { SeoHead } from '../../components/SeoHead';

const navItems = [
  { to: '/superadmin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/superadmin/merchants', label: 'Merchants', icon: Store },
  { to: '/superadmin/kyc', label: 'KYC Queue', icon: FileCheck2 },
  { to: '/superadmin/transactions', label: 'Live Ledger', icon: ReceiptIndianRupee },
  { to: '/superadmin/reconciliation', label: 'Unmapped Credits', icon: GitCompareArrows },
  { to: '/superadmin/devices', label: 'Listener Fleet', icon: Smartphone },
  { to: '/superadmin/webhooks', label: 'Webhook Logs', icon: Webhook },
  { to: '/superadmin/risk', label: 'Risk & Fraud', icon: ShieldAlert },
  { to: '/superadmin/subscriptions', label: 'Billing & Plans', icon: CreditCard },
  { to: '/superadmin/audit', label: 'Audit Trail', icon: History },
  { to: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
];

export const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('sumiopay_superadmin_token');
    navigate('/superadmin/login');
  };

  const activeItem = navItems.find((item) => location.pathname.startsWith(item.to));

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white tracking-tight">SumioPay Admin</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Platform Governor
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/guide')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-slate-700/70 text-[11px] font-semibold transition"
        >
          <span>Platform &amp; Admin Guide</span>
          <span className="font-mono text-amber-400">/guide</span>
        </button>

        <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">SumioTech Core</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v2.6</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out SuperAdmin</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <SeoHead
        title="Restricted Admin Console — SumioPay"
        description="Restricted administrative console."
        noIndex
      />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 md:sticky md:top-0 md:h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-extrabold text-white leading-tight">SumioPay Admin</p>
            <p className="text-[11px] text-amber-400 font-medium">
              {activeItem?.label || 'Console'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{SidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;

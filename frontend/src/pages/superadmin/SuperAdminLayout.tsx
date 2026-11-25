import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  FileCheck,
  CreditCard,
  FileSpreadsheet,
  Smartphone,
  Radio,
  ShieldAlert,
  Receipt,
  ClipboardList,
  SlidersHorizontal,
  LogOut,
  ExternalLink,
  Server,
  Activity,
} from 'lucide-react';

export const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('sumiopay_superadmin_token');
    navigate('/superadmin/login');
  };

  const navItems = [
    { label: 'Platform Overview', to: '/superadmin/overview', icon: TrendingUp },
    { label: 'Merchants Fleet', to: '/superadmin/merchants', icon: Users },
    { label: 'KYC & Compliance', to: '/superadmin/kyc', icon: FileCheck },
    { label: 'Global Transactions', to: '/superadmin/transactions', icon: CreditCard },
    { label: 'Reconciliation Engine', to: '/superadmin/reconciliation', icon: FileSpreadsheet },
    { label: 'Hardware Listeners', to: '/superadmin/devices', icon: Smartphone },
    { label: 'Webhooks & Gateway', to: '/superadmin/webhooks', icon: Radio },
    { label: 'Risk & Anti-Fraud', to: '/superadmin/risk', icon: ShieldAlert },
    { label: 'SaaS Subscriptions', to: '/superadmin/subscriptions', icon: Receipt },
    { label: 'Audit Trail', to: '/superadmin/audit', icon: ClipboardList },
    { label: 'Platform Controls', to: '/superadmin/settings', icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Top Executive Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              SumioPay
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SuperAdmin Master
              </span>
            </div>
            <div className="text-[11px] text-slate-400 -mt-0.5">Central Infrastructure Command Center</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px]">System Status: 99.98% SLA</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-mono text-[11px]">Master Governor</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold transition flex items-center gap-1.5"
            title="Terminate SuperAdmin Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Master Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/50 flex flex-col justify-between p-4 shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Platform Modules
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom Security Info Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-2 mt-6">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>Privileged Audit Active</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Every operation executed within this console is cryptographically signed and logged with operator IP.
            </p>
          </div>
        </aside>

        {/* Dynamic Route Outlet */}
        <main className="flex-1 overflow-y-auto bg-[#0B0F19] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

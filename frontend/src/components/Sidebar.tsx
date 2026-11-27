import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Smartphone,
  CreditCard,
  KeyRound,
  FileCode2,
  Cpu,
  ShieldCheck,
  ChevronRight,
  Globe,
  Zap,
  FileSpreadsheet,
  FolderGit2,
  Users,
  RotateCcw,
  Receipt,
  FileText,
  X,
  Lock,
  Link2,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isSubscriptionExpired?: boolean;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    to: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, isSubscriptionExpired = false }) => {
  const navSections: NavSection[] = [
    {
      title: 'FINANCE & PAYMENTS',
      items: [
        { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Payment Links', to: '/links', icon: Link2, badge: 'NO-CODE', badgeColor: 'bg-indigo-100 text-indigo-700' },
        { label: 'Transactions Ledger', to: '/orders', icon: CreditCard },
        { label: 'Bank Reconciliation', to: '/reconciliation', icon: FileSpreadsheet },
        { label: 'Refunds & Disputes', to: '/refunds', icon: RotateCcw },
        { label: 'Financial Reports', to: '/reports', icon: FileText },
      ],
    },
    {
      title: 'DEVELOPER & INTEGRATION',
      items: [
        { label: 'Connect & Integrate', to: '/connect', icon: Zap, badge: 'SDK', badgeColor: 'bg-blue-100 text-blue-700' },
        { label: 'SaaS Plans API', to: '/saas-plans', icon: Layers, badge: 'SAAS', badgeColor: 'bg-purple-100 text-purple-700' },
        { label: 'Integration Guide', to: '/guide', icon: Globe, badge: 'DOCS', badgeColor: 'bg-indigo-100 text-indigo-700' },
        { label: 'Webhooks & Events', to: '/webhooks', icon: KeyRound, badge: 'HMAC', badgeColor: 'bg-emerald-100 text-emerald-700' },
        { label: 'Payment Simulator', to: '/simulator', icon: Cpu },
        { label: 'Developer API Docs', to: '/docs', icon: FileCode2 },
      ],
    },
    {
      title: 'INFRASTRUCTURE & COMPANION',
      items: [
        { label: 'Listener Phones', to: '/devices', icon: Smartphone, badge: 'APK v2.6', badgeColor: 'bg-indigo-100 text-indigo-700' },
      ],
    },
    {
      title: 'ORGANIZATION & SETTINGS',
      items: [
        { label: 'Profile & UPI Bank', to: '/profile', icon: ShieldCheck, badge: 'UPI', badgeColor: 'bg-emerald-100 text-emerald-700' },
        { label: 'Project Workspaces', to: '/projects', icon: FolderGit2 },
        { label: 'Team & RBAC', to: '/team', icon: Users },
        { label: 'Billing & Plans', to: '/billing', icon: Receipt },
      ],
    },
  ];

  const content = (
    <>
      <div className="space-y-4">
        <div className="px-3 flex items-center justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSubscriptionExpired ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span>{isSubscriptionExpired ? 'Account Locked' : 'Merchant Console'}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSubscriptionExpired && (
          <div className="mx-1 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Plan Expired</span>
            </div>
            <p className="leading-snug text-rose-700">
              Your 3-day free trial or plan has ended. Activate a plan under <strong>Billing &amp; Plans</strong> to unlock access.
            </p>
          </div>
        )}

        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isLockedItem = isSubscriptionExpired && item.to !== '/billing';
                  const targetTo = isLockedItem ? '/billing?expired=true' : item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={targetTo}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isLockedItem
                            ? 'text-slate-400 bg-slate-50/70 opacity-65 cursor-not-allowed hover:bg-rose-50/60 hover:text-rose-700'
                            : isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isLockedItem ? 'text-slate-300' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isLockedItem ? (
                              <Lock className="w-3 h-3 text-rose-400" />
                            ) : (
                              <>
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                      item.badgeColor || 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Website & Support Footer Link */}
      <div className="pt-4 border-t border-slate-100 space-y-1 mt-auto">
        <NavLink
          to="/security"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Security &amp; Legal Policy</span>
        </NavLink>
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <Globe className="w-4 h-4 text-slate-400" />
          <span>Public Portal</span>
        </NavLink>
        <div className="mt-2 px-3 text-[10px] text-slate-400 text-center font-mono">
          SumioPay Engine v2.5 &bull; SumioTech
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200/80 bg-white flex-col justify-between p-4 shrink-0 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white flex flex-col justify-between p-4 shadow-2xl overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;

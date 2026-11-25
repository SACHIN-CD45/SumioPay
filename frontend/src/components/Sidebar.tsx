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
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Connect Payments', to: '/connect', icon: Zap },
    { label: 'Transactions Ledger', to: '/orders', icon: CreditCard },
    { label: 'Reconciliation', to: '/reconciliation', icon: FileSpreadsheet },
    { label: 'Refunds & Disputes', to: '/refunds', icon: RotateCcw },
    { label: 'Project Workspaces', to: '/projects', icon: FolderGit2 },
    { label: 'Team & RBAC', to: '/team', icon: Users },
    { label: 'Billing & Plan', to: '/billing', icon: Receipt },
    { label: 'Financial Reports', to: '/reports', icon: FileText },
    { label: 'Listener Phones', to: '/devices', icon: Smartphone },
    { label: 'API & Webhooks', to: '/webhooks', icon: KeyRound },
    { label: 'Payment Simulator', to: '/simulator', icon: Cpu },
    { label: 'Developer Docs', to: '/docs', icon: FileCode2 },
  ];

  const content = (
    <>
      <div className="space-y-6">
        <div className="px-3 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Merchant Console
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

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Website & Support Footer Link */}
      <div className="pt-4 border-t border-slate-100 space-y-1">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <Globe className="w-4 h-4 text-slate-400" />
          <span>Public Website</span>
        </NavLink>
        <div className="mt-2 px-3 text-[10px] text-slate-400 text-center font-mono">
          SumioPay Engine v2.4 &bull; Merchant Mode
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

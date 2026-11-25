import React from 'react';
import { LogOut, Smartphone, CheckCircle, AlertCircle, ArrowRight, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  merchant?: {
    name?: string;
    businessName?: string;
    email?: string;
    upiId?: string;
  } | null;
  onLogout?: () => void;
  onlineDevicesCount?: number;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  merchant,
  onLogout,
  onlineDevicesCount = 0,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('sumiopay_token');
      localStorage.removeItem('sumiopay_merchant');
      navigate('/login');
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-slate-900" /> : <Menu className="w-4 h-4 text-slate-900" />}
          </button>
        )}
        <div
          onClick={() => navigate('/dashboard')}
          className="cursor-pointer flex items-center gap-2.5"
        >
          <img src="/sumiopay-icon.png" alt="SumioPay" className="w-9 h-9 rounded-xl shadow-sm object-contain" />
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              SumioPay
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Gateway Console
              </span>
            </div>
            <div className="text-[11px] text-slate-500 -mt-0.5">Auto UPI Verification Service</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Device Status Pill */}
        <div
          onClick={() => navigate('/devices')}
          className="cursor-pointer px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs transition hover:border-slate-300"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium hidden sm:inline">Listener:</span>
          {onlineDevicesCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {onlineDevicesCount} Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Pair Phone
            </span>
          )}
        </div>

        {/* Merchant Info */}
        {merchant && (
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800">{merchant.businessName}</span>
            <span className="text-[10px] font-mono text-slate-500">{merchant.upiId}</span>
          </div>
        )}

        {/* Home / Website Link */}
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-500 hover:text-blue-600 font-semibold hidden lg:inline"
        >
          Landing Page
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { 
  LogOut, Users, ChevronRight, X, Key, QrCode, FileText, CreditCard, LayoutDashboard, Landmark, Receipt, Zap, Clock, ArrowRightLeft
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose
}) => {
  const { user, logout, decrementTimer } = useAuthStore();

  React.useEffect(() => {
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [decrementTimer]);

  const getNavItems = (): SidebarNavItem[] => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'dashboard',
          label: 'Overview & Earnings',
          icon: LayoutDashboard
        },
        {
          id: 'admin_payout',
          label: 'Payout Slabs & Txns',
          icon: ArrowRightLeft
        },
        {
          id: 'admin_statement',
          label: 'Account Passbook',
          icon: FileText
        },
        {
          id: 'live_bill_history',
          label: 'LiveBillPay History',
          icon: Clock
        },
        {
          id: 'users',
          label: 'User Accounts',
          icon: Users
        },
        {
          id: 'bank_entry',
          label: 'Bank Entry',
          icon: Landmark
        },
        {
          id: 'admin_bill_requests',
          label: 'CC Bill Requests',
          icon: Receipt
        },
        {
          id: 'qr_master',
          label: 'QR Master',
          icon: QrCode
        },
        {
          id: 'qr_requests',
          label: 'QR Payment Requests',
          icon: FileText
        }
      ];
    }

    const items: SidebarNavItem[] = [
      {
        id: 'users',
        label: 'Dashboard & Account',
        icon: Users
      }
    ];

    if (user?.role === 'user' || user?.role === 'distributor' || user?.role === 'super_distributor') {
      items.push({
        id: 'user_statement',
        label: 'Account Passbook',
        icon: FileText
      });
      items.push({
        id: 'payout_transfer',
        label: 'Instant Payout',
        icon: ArrowRightLeft
      });
    }

    if (user?.role === 'user') {
      items.push({
        id: 'live_bill_pay',
        label: 'Live Bill Pay',
        icon: Zap
      });
      items.push({
        id: 'bill_request',
        label: 'Credit Card Bill Pay',
        icon: CreditCard
      });
      items.push({
        id: 'qr_requests',
        label: 'QR Add Money',
        icon: QrCode
      });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static top-0 left-0 bottom-0 z-50
        w-72 h-full shrink-0 bg-slate-900 border-r border-slate-800
        flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Close Bar for Mobile */}
        <div className="p-3 flex justify-end lg:hidden border-b border-slate-800">
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Navigation Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center justify-between p-3 rounded-2xl font-medium text-xs transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    p-2 rounded-xl transition-colors
                    ${isActive ? 'bg-white/20 text-white' : 'bg-slate-950 text-slate-400 group-hover:text-white group-hover:bg-slate-800'}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left truncate">
                    <p className="truncate font-semibold">{item.label}</p>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white' : 'text-slate-600 group-hover:translate-x-0.5'}`} />
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/50">


          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" /> Log Out Session
          </button>
        </div>
      </aside>
    </>
  );
};

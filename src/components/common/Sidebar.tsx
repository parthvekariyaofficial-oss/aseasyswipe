import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { userApi } from '../../services/api';
import { 
  LogOut, Users, ChevronRight, X, Key, KeyRound, Lock, QrCode, FileText, CreditCard, LayoutDashboard, Landmark, Receipt, Zap, Clock, ArrowRightLeft, ShieldCheck, Images
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
  const { liveBillPayEnabled, instantPayoutEnabled, ccBillPayEnabled } = useSettingsStore();
  const [badgeCounts, setBadgeCounts] = React.useState<{ [key: string]: number }>({});

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'super_distributor': return 'Super Distributor';
      case 'distributor': return 'Distributor';
      case 'user': return 'Retailer';
      default: return 'User';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'super_distributor': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'distributor': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'user': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [decrementTimer]);

  // Real-time polling for live request badge counts (Admin only)
  React.useEffect(() => {
    if (user?.role !== 'admin') return;

    const fetchBadgeCounts = async () => {
      try {
        const res = await userApi.getAdminBadgeCounts();
        if (res.success && res.counts) {
          setBadgeCounts(res.counts);
        }
      } catch {
        // Silent catch for background poll
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 3000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const getNavItems = (): SidebarNavItem[] => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'dashboard',
          label: 'Overview & Earnings',
          icon: LayoutDashboard
        },
        {
          id: 'users',
          label: 'User Accounts',
          icon: Users
        },
        {
          id: 'admin_kyc',
          label: 'KYC Verification',
          icon: ShieldCheck,
          badge: badgeCounts['admin_kyc'],
          badgeColor: 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
        },
        {
          id: 'qr_requests',
          label: 'QR Payment Requests',
          icon: FileText,
          badge: badgeCounts['qr_requests'],
          badgeColor: 'bg-amber-500 text-slate-950 shadow-amber-500/30'
        },
        {
          id: 'qr_gallery',
          label: 'QR Proof Gallery',
          icon: Images
        },
        {
          id: 'admin_bill_requests',
          label: 'CC Bill Requests',
          icon: CreditCard,
          badge: badgeCounts['admin_bill_requests'],
          badgeColor: 'bg-rose-500 text-white shadow-rose-500/30'
        },
        {
          id: 'live_bill_history',
          label: 'LiveBillPay History',
          icon: Clock
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
          id: 'bank_entry',
          label: 'Bank Entry',
          icon: Landmark
        },
        {
          id: 'qr_master',
          label: 'QR Master',
          icon: QrCode
        },
        {
          id: 'change_password',
          label: 'Change Password',
          icon: Key
        }
      ];
    }

    if (user?.role === 'user') {
      const userItems: SidebarNavItem[] = [
        {
          id: 'users',
          label: 'Dashboard & Account',
          icon: Users
        },
        {
          id: 'qr_requests',
          label: 'QR Payment History',
          icon: QrCode
        }
      ];

      if (liveBillPayEnabled) {
        userItems.push({
          id: 'live_bill_pay',
          label: 'Live Bill Pay',
          icon: Zap
        });
      }

      if (instantPayoutEnabled) {
        userItems.push({
          id: 'payout_transfer',
          label: 'Instant Payout',
          icon: ArrowRightLeft
        });
      }

      userItems.push({
        id: 'bill_request',
        label: 'Credit Card Bill Pay',
        icon: CreditCard
      });

      userItems.push({
        id: 'user_statement',
        label: 'Account Passbook',
        icon: FileText
      });

      userItems.push({
        id: 'manage_tpin',
        label: 'Create TPIN',
        icon: Key
      });

      userItems.push({
        id: 'change_mpin',
        label: 'Change MPIN',
        icon: KeyRound
      });

      userItems.push({
        id: 'change_password',
        label: 'Change Password',
        icon: Lock
      });

      return userItems;
    }

    const items: SidebarNavItem[] = [
      {
        id: 'users',
        label: 'Dashboard & Account',
        icon: Users
      },
      {
        id: 'qr_requests',
        label: 'QR Payment History',
        icon: QrCode
      }
    ];

    if (instantPayoutEnabled) {
      items.push({
        id: 'payout_transfer',
        label: 'Instant Payout',
        icon: ArrowRightLeft
      });
    }

    items.push({
      id: 'user_statement',
      label: 'Account Passbook',
      icon: FileText
    });

    items.push({
      id: 'manage_tpin',
      label: 'Create TPIN',
      icon: Key
    });

    items.push({
      id: 'change_mpin',
      label: 'Change MPIN',
      icon: KeyRound
    });

    items.push({
      id: 'change_password',
      label: 'Change Password',
      icon: Lock
    });

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
        w-64 sm:w-68 lg:w-[265px] h-full shrink-0 bg-slate-900 border-r border-slate-800
        flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Brand Header (Aligned to h-16) */}
        <div className="h-16 px-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div 
            onClick={() => onTabChange('overview')}
            className="flex-1 flex items-center cursor-pointer hover:opacity-90 transition-opacity min-w-0 py-1"
            title="Overview & Earnings"
          >
            <img 
              src="/logo.png" 
              alt="AS EasySwipe Pvt Ltd" 
              className="w-full max-h-12 object-contain select-none p-[3px]"
            />
          </div>

          {/* Mobile Close Button */}
          <button 
            onClick={onClose} 
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
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
                  w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-950/60' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    p-2 rounded-xl transition-colors flex-shrink-0
                    ${isActive ? 'bg-white/20 text-white shadow-sm' : 'bg-slate-950 text-slate-400 group-hover:text-indigo-400 group-hover:bg-slate-800'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left truncate">
                    <p className="truncate font-bold tracking-tight">{item.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-[10px] font-black font-mono shadow-md animate-pulse
                      ${item.badgeColor || 'bg-rose-500 text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:translate-x-1 group-hover:text-white'}`} />
                </div>
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

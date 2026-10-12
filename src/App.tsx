import { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { userApi } from './services/api';
import { Sidebar } from './components/common/Sidebar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginSplitScreen } from './components/auth/LoginSplitScreen';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { ResetPinOtpModal } from './components/auth/ResetPinOtpModal';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { AdminOverviewDashboard } from './components/dashboards/AdminOverviewDashboard';
import { SuperDistributorDashboard } from './components/dashboards/SuperDistributorDashboard';
import { DistributorDashboard } from './components/dashboards/DistributorDashboard';
import { RetailerDashboard } from './components/dashboards/RetailerDashboard';
import { QRMasterManagement } from './components/qr/QRMasterManagement';
import { QRPaymentRequests } from './components/qr/QRPaymentRequests';
import { BankManagement } from './components/bank/BankManagement';
import { UserBillPaymentRequest } from './components/bills/UserBillPaymentRequest';
import { AdminBillRequestsManagement } from './components/bills/AdminBillRequestsManagement';
import { LiveBillPayment } from './components/bills/LiveBillPayment';
import { AdminLiveBillPayHistory } from './components/bills/AdminLiveBillPayHistory';
import { AdminPayoutManagement } from './components/payout/AdminPayoutManagement';
import { UserPayoutTransfer } from './components/payout/UserPayoutTransfer';
import { UserAccountStatement } from './components/statement/UserAccountStatement';
import { AdminMasterStatement } from './components/statement/AdminMasterStatement';
import { LandingPage } from './components/home/LandingPage';
import type { UserRole } from './types/auth';
import { Menu, LogOut, Wallet, Clock, ChevronDown, Key } from 'lucide-react';

export default function App() {
  const { user, isAuthenticated, logout, updateUser, sessionRemainingSeconds } = useAuthStore();
  const getTabFromPath = (path: string, role?: string): string => {
    const p = path.toLowerCase().trim();
    if (p.includes('admin-statement') || p.includes('admin_statement')) return 'admin_statement';
    if (p.includes('statement') || p.includes('passbook')) return role === 'admin' ? 'admin_statement' : 'user_statement';
    if (p.includes('admin-payout') || p.includes('admin_payout')) return 'admin_payout';
    if (p.includes('payout')) return role === 'admin' ? 'admin_payout' : 'payout_transfer';
    if (p.includes('dashboard')) return 'dashboard';
    if (p.includes('bank-entry') || p.includes('bank_entry')) return 'bank_entry';
    if (p.includes('admin-bill-requests') || p.includes('admin_bill_requests')) return 'admin_bill_requests';
    if (p.includes('live-bill-history') || p.includes('live_bill_history')) return 'live_bill_history';
    if (p.includes('live-bill-pay') || p.includes('live_bill_pay')) {
      return role === 'user' ? 'live_bill_pay' : (role === 'admin' ? 'live_bill_history' : 'users');
    }
    if (p.includes('bill-request') || p.includes('bill_request')) return 'bill_request';
    if (p.includes('qr-master') || p.includes('qr_master')) return 'qr_master';
    if (p.includes('qr-requests') || p.includes('qr_requests')) return 'qr_requests';
    if (p.includes('users')) return 'users';
    if (role === 'admin') return 'dashboard';
    return 'users';
  };

  const getPathFromTab = (tab: string): string => {
    if (tab === 'dashboard') return '/dashboard';
    if (tab === 'admin_payout') return '/admin-payout';
    if (tab === 'payout_transfer') return '/payout';
    if (tab === 'admin_statement') return '/admin-statement';
    if (tab === 'user_statement') return '/statement';
    if (tab === 'bank_entry') return '/bank-entry';
    if (tab === 'admin_bill_requests') return '/admin-bill-requests';
    if (tab === 'live_bill_history') return '/live-bill-history';
    if (tab === 'live_bill_pay') return '/live-bill-pay';
    if (tab === 'bill_request') return '/bill-request';
    if (tab === 'qr_master') return '/qr-master';
    if (tab === 'qr_requests') return '/qr-requests';
    return '/users';
  };


  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return getTabFromPath(window.location.pathname, user?.role);
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Auto-sync profile & wallet balance in real-time
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncProfile = async () => {
      try {
        const res = await userApi.getProfile();
        if (res.success && res.user) {
          updateUser(res.user);
        }
      } catch {
        // Silent catch for background sync
      }
    };

    syncProfile();
    const interval = setInterval(syncProfile, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, updateUser]);

  const handleTabChange = (tabId: string) => {
    setActiveTabState(tabId);
    const targetPath = getPathFromTab(tabId);
    setCurrentPath(targetPath);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: tabId }, '', targetPath);
    }
  };

  // Listen for browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p);
      const currentTab = getTabFromPath(p, user?.role);
      setActiveTabState(currentTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role]);

  // Sync initial URL path and tab on auth load
  useEffect(() => {
    if (isAuthenticated) {
      const p = window.location.pathname;
      if (p === '/login' || p === '/') {
        const currentTab = getTabFromPath(p, user?.role);
        setActiveTabState(currentTab);
        const targetPath = getPathFromTab(currentTab);
        window.history.replaceState({ tab: currentTab }, '', targetPath);
        setCurrentPath(targetPath);
      }
    }
  }, [isAuthenticated, user?.role]);

  // Session expiry listener
  useEffect(() => {
    const handleExpired = () => {
      alert('🔒 Security Notice: Your session token has expired. Automatically logging out for security.');
      logout();
    };
    window.addEventListener('aseasy_session_expired', handleExpired);
    return () => window.removeEventListener('aseasy_session_expired', handleExpired);
  }, [logout]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Super Admin HQ';
      case 'super_distributor': return 'Super Distributor (MS)';
      case 'distributor': return 'Distributor (DS)';
      case 'user': return 'Retailer Merchant';
      default: return 'User';
    }
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'super_distributor': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'distributor': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'user': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getPageTitle = (tab: string, role?: string): string => {
    switch (tab) {
      case 'dashboard':
        return role === 'admin' ? 'Overview & Earnings' : 'Dashboard Overview';
      case 'users':
        return role === 'admin' ? 'User Accounts' : 'Dashboard & Account';
      case 'qr_requests':
        return 'QR Payment Requests';
      case 'admin_bill_requests':
        return 'CC Bill Requests';
      case 'live_bill_history':
        return 'LiveBillPay History';
      case 'admin_payout':
        return 'Payout Slabs & Txns';
      case 'payout_transfer':
        return 'Instant Payout';
      case 'admin_statement':
        return 'Account Passbook';
      case 'user_statement':
        return 'Account Passbook';
      case 'bank_entry':
        return 'Bank Entry';
      case 'qr_master':
        return 'QR Master';
      case 'live_bill_pay':
        return 'Live Bill Pay';
      case 'bill_request':
        return 'Credit Card Bill Payment';
      default:
        return 'Dashboard';
    }
  };

  const renderDashboardByRole = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        );
      case 'super_distributor':
        return (
          <ProtectedRoute allowedRoles={['super_distributor', 'admin']}>
            <SuperDistributorDashboard />
          </ProtectedRoute>
        );
      case 'distributor':
        return (
          <ProtectedRoute allowedRoles={['distributor', 'admin']}>
            <DistributorDashboard />
          </ProtectedRoute>
        );
      case 'user':
      default:
        return (
          <ProtectedRoute allowedRoles={['user', 'distributor', 'super_distributor', 'admin']}>
            <RetailerDashboard />
          </ProtectedRoute>
        );
    }
  };

  // 1. Not Authenticated -> Show Landing Page on / and Login on /login
  if (!isAuthenticated || !user) {
    if (currentPath === '/login') {
      return (
        <>
          <LoginSplitScreen
            onBackToHome={() => {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
            }}
            onOpenResetPin={() => setShowResetPinModal(true)}
          />
          {showResetPinModal && (
            <ResetPinOtpModal
              isOpen={true}
              onClose={() => setShowResetPinModal(false)}
            />
          )}
        </>
      );
    }

    return (
      <LandingPage
        onNavigateToLogin={() => {
          window.history.pushState(null, '', '/login');
          setCurrentPath('/login');
        }}
      />
    );
  }

  // 2. Force Change Password Guard
  if (user.must_change_password) {
    return <ForceChangePasswordModal isOpen={true} user={user} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans flex antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Left Full Height Sidebar (Top-to-Bottom 100vh) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Right Main Layout Column (Header + Content) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 shrink-0 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo */}
            <div className="lg:hidden flex items-center shrink-0">
              <img src="/logo.png" alt="AS EasySwipe" className="h-8 w-auto object-contain rounded-lg" />
            </div>

            {/* Active Page Title in Header */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse hidden sm:block shrink-0" />
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {getPageTitle(activeTab, user.role)}
              </h1>
            </div>
          </div>

          {/* Right Header Stats & Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Role Tag Badge (e.g. Super Admin HQ) */}
            <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-sm ${getRoleBadgeStyle(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>

            {/* Main Wallet pill (Hidden for Admin) */}
            {user.role !== 'admin' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="text-right">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Main Wallet</p>
                  <p className="text-xs font-black text-emerald-400">
                    ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formatTimer(sessionRemainingSeconds)}</span>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition"
              >
                <img
                  src={user.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email || user.mobile_number}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowResetPinModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <Key className="w-4 h-4 text-indigo-400" /> Reset 4-Digit TPIN
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Body Layout */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          {activeTab === 'dashboard' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOverviewDashboard />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_payout' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPayoutManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_statement' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMasterStatement />
            </ProtectedRoute>
          )}
          {activeTab === 'user_statement' && <UserAccountStatement />}
          {activeTab === 'payout_transfer' && <UserPayoutTransfer />}
          {activeTab === 'bank_entry' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <BankManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_bill_requests' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBillRequestsManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'live_bill_history' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLiveBillPayHistory />
            </ProtectedRoute>
          )}
          {activeTab === 'live_bill_pay' && (
            user.role === 'user' ? <LiveBillPayment /> : (user.role === 'admin' ? <AdminLiveBillPayHistory /> : renderDashboardByRole(user.role))
          )}
          {activeTab === 'bill_request' && <UserBillPaymentRequest />}
          {activeTab === 'qr_master' && <QRMasterManagement />}
          {activeTab === 'qr_requests' && <QRPaymentRequests />}
          {activeTab === 'users' && renderDashboardByRole(user.role)}
          {activeTab !== 'dashboard' && activeTab !== 'admin_payout' && activeTab !== 'admin_statement' && activeTab !== 'user_statement' && activeTab !== 'payout_transfer' && activeTab !== 'bank_entry' && activeTab !== 'admin_bill_requests' && activeTab !== 'live_bill_history' && activeTab !== 'live_bill_pay' && activeTab !== 'bill_request' && activeTab !== 'qr_master' && activeTab !== 'qr_requests' && activeTab !== 'users' && renderDashboardByRole(user.role)}
        </main>
      </div>

      {/* Reset TPIN / MPIN Modal */}
      {showResetPinModal && (
        <ResetPinOtpModal
          isOpen={true}
          onClose={() => setShowResetPinModal(false)}
        />
      )}
    </div>
  );
}

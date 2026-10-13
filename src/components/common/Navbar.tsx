import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { 
  ShieldCheck, LogOut, Wallet, Clock, 
  ChevronDown, Key, Lock
} from 'lucide-react';
import type { UserRole } from '../../types/auth';

interface NavbarProps {}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, sessionRemainingSeconds, decrementTimer } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [decrementTimer]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'super_distributor': return 'Super Distributor';
      case 'distributor': return 'Distributor';
      case 'user': return 'Retailer';
      default: return 'User';
    }
  };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-white font-sans">
                AsEasy<span className="text-indigo-400">Swipe</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Fintech V2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400 inline" /> 256-bit Encrypted Session
            </p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-3 lg:space-x-6">

            {user.role !== 'admin' && (
              <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Main Wallet</p>
                  <p className="text-sm font-bold text-emerald-400">
                    ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Session Auto-Logout</p>
                <p className="text-xs font-mono font-semibold text-amber-300">
                  {formatTimer(sessionRemainingSeconds)}
                </p>
              </div>
            </div>

            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleBadgeStyle(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800 transition border border-transparent hover:border-slate-700 focus:outline-none"
              >
                {user.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt={user.name} className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/40" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="hidden lg:inline-block text-xs font-medium text-slate-200">{user.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.firm_name}</p>
                    <p className="text-xs text-indigo-400 mt-1 font-mono">+91 {user.mobile_number}</p>
                  </div>



                  <div className="border-t border-slate-800 py-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </header>
  );
};

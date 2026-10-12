import React from 'react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/auth';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  activeTab?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-red-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/40">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Access Restricted (403)</h2>
          <p className="text-xs text-slate-300 mb-6">
            Your current role <span className="text-amber-400 font-semibold uppercase">{user.role}</span> is not authorized to access this module.
          </p>

          <div className="bg-slate-900/80 rounded-xl p-4 text-left border border-slate-800 mb-6 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" /> Permitted Roles for this View:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
              {allowedRoles.map(role => (
                <li key={role} className="capitalize">{role.replace('_', ' ')}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition shadow-lg flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch Role / Return to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

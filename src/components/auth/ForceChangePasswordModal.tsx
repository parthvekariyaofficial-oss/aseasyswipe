import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface ForceChangePasswordModalProps {
  isOpen?: boolean;
  user?: UserProfile;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen = true,
  user: propUser,
}) => {
  const { user: storeUser, updateUser } = useAuthStore();
  const user = propUser || storeUser;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMinLength || !hasNumber || !isMatch) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.changePassword({ newPassword });
      if (res.success && res.user) {
        updateUser(res.user);
      } else {
        setErrorMessage(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/40 shadow-2xl relative overflow-hidden animate-shake">
        
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/40">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">First Login: Password Update Required</h2>
          <p className="text-xs text-slate-300 mt-1">
            For security compliance, you must set a new strong password before accessing your account.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Account Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
            <div className={`flex items-center space-x-2 ${isMinLength ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>At least 6 characters</span>
            </div>
            <div className={`flex items-center space-x-2 ${hasNumber ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Contains at least one number</span>
            </div>
            <div className={`flex items-center space-x-2 ${isMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isMinLength || !hasNumber || !isMatch}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold text-sm shadow-xl hover:opacity-95 transition disabled:opacity-40"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>

      </div>
    </div>
  );
};

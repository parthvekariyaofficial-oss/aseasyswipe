import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Smartphone, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface CreateMpinModalProps {
  isOpen?: boolean;
  user?: UserProfile;
  onSuccess?: () => void;
}

export const CreateMpinModal: React.FC<CreateMpinModalProps> = ({
  isOpen = true,
  user: propUser,
  onSuccess,
}) => {
  const { user: storeUser, updateUser } = useAuthStore();
  const user = propUser || storeUser;
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSixDigits = mpin.length === 6 && /^\d+$/.test(mpin);
  const isMatch = mpin.length > 0 && mpin === confirmMpin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSixDigits || !isMatch) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.createMpin(mpin);
      const updatedProfile = { ...(res.user || user), mpin };
      updateUser(updatedProfile);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to save MPIN:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to save MPIN on server. Please try again.';
      setErrorMessage(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/40 shadow-2xl relative overflow-hidden animate-shake">
        
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/40">
            <Smartphone className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Security Setup: Create 6-Digit MPIN</h2>
          <p className="text-xs text-slate-300 mt-1">
            Please create a secret 6-digit MPIN. You will need this MPIN every time you log in to your account.
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Enter 6-Digit MPIN</label>
            <div className="relative">
              <input
                type={showMpin ? 'text' : 'password'}
                required
                maxLength={6}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit secret code (e.g. 987654)"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest text-center"
              />
              <button
                type="button"
                onClick={() => setShowMpin(!showMpin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm 6-Digit MPIN</label>
            <input
              type={showMpin ? 'text' : 'password'}
              required
              maxLength={6}
              value={confirmMpin}
              onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter 6-digit MPIN"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest text-center"
            />
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
            <div className={`flex items-center space-x-2 ${isSixDigits ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Exactly 6 numeric digits</span>
            </div>
            <div className={`flex items-center space-x-2 ${isMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>MPINs match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isSixDigits || !isMatch}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl hover:opacity-95 transition disabled:opacity-40"
          >
            {loading ? 'Setting MPIN...' : 'Save 6-Digit MPIN & Access Portal'}
          </button>
        </form>

      </div>
    </div>
  );
};

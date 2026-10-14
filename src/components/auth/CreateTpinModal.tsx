import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { ShieldCheck, Check, AlertCircle, Eye, EyeOff, Lock, X } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface CreateTpinModalProps {
  isOpen?: boolean;
  user?: UserProfile;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const CreateTpinModal: React.FC<CreateTpinModalProps> = ({
  isOpen = true,
  user: propUser,
  onSuccess,
  onClose,
}) => {
  const { user: storeUser, updateUser } = useAuthStore();
  const user = propUser || storeUser;
  const [tpin, setTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [showTpin, setShowTpin] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isFourDigits = tpin.length === 4 && /^\d+$/.test(tpin);
  const isMatch = tpin.length > 0 && tpin === confirmTpin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFourDigits || !isMatch) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.createTpin(tpin);
      const updatedProfile = { ...(res.user || user), tpin, tpin_set: true };
      updateUser(updatedProfile);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Failed to save TPIN:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to save TPIN on server. Please try again.';
      setErrorMessage(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/40 shadow-2xl relative overflow-hidden animate-shake">
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/40 shadow-lg">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {user.tpin_set ? 'Change 4-Digit TPIN' : 'Financial Security: Create 4-Digit TPIN'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {user.tpin_set
              ? 'Update your secret 4-digit Transaction PIN (TPIN) for Live Bill Pay & Instant Payout.'
              : 'Set a 4-digit secret Transaction PIN (TPIN). You will need this PIN every time you perform Live Bill Pay and Instant Payout transfers.'}
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Enter 4-Digit TPIN</label>
            <div className="relative">
              <input
                type={showTpin ? 'text' : 'password'}
                required
                maxLength={4}
                value={tpin}
                onChange={(e) => setTpin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit secret PIN (e.g. 4321)"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-base font-mono tracking-widest text-center"
              />
              <button
                type="button"
                onClick={() => setShowTpin(!showTpin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showTpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm 4-Digit TPIN</label>
            <input
              type={showTpin ? 'text' : 'password'}
              required
              maxLength={4}
              value={confirmTpin}
              onChange={(e) => setConfirmTpin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter 4-digit TPIN"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-base font-mono tracking-widest text-center"
            />
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
            <div className={`flex items-center space-x-2 ${isFourDigits ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Exactly 4 numeric digits</span>
            </div>
            <div className={`flex items-center space-x-2 ${isMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>TPINs match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFourDigits || !isMatch}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-sm shadow-xl hover:opacity-95 transition disabled:opacity-40"
          >
            {loading ? 'Setting TPIN...' : 'Save 4-Digit TPIN & Proceed'}
          </button>
        </form>

      </div>
    </div>
  );
};

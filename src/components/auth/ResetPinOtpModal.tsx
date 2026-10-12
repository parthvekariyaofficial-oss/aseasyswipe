import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { MessageSquare, Phone, Check, AlertCircle, X, Sparkles } from 'lucide-react';

interface ResetPinOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPinOtpModal: React.FC<ResetPinOtpModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [resetType] = useState<'tpin'>('tpin');
  const [channel, setChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newValue, setNewValue] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleRequestOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.requestOtp({
        purpose: resetType === 'tpin' ? 'RESET_TPIN' : 'RESET_MPIN',
        channel
      });

      if (res.success) {
        setOtpSent(true);
        setDemoOtp(res.demoOtpCode || '123456');
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error requesting OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (resetType === 'tpin') {
        const res = await authApi.resetTpin({ otpCode, newTpin: newValue });
        if (res.success) {
          setSuccessMsg(res.message);
          setTimeout(() => onClose(), 1500);
        } else {
          setErrorMsg(res.message);
        }
      } else {
        const res = await authApi.resetMpin({ otpCode, newMpin: newValue });
        if (res.success) {
          setSuccessMsg(res.message);
          setTimeout(() => onClose(), 1500);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 border border-slate-700 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/40">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Reset Security Credentials</h3>
          <p className="text-xs text-slate-400">Validate via WhatsApp or SMS OTP verification</p>
        </div>



        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Delivery Channel</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('WHATSAPP')}
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition ${
                    channel === 'WHATSAPP'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition ${
                    channel === 'SMS'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>SMS OTP</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              OTP code will be dispatched to registered mobile: <strong className="text-slate-200 font-mono">+91 {user.mobile_number}</strong>
            </p>

            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition"
            >
              {loading ? 'Sending Security Code...' : 'Request Verification OTP'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {demoOtp && (
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Generated Demo OTP:
                </span>
                <span className="font-mono font-extrabold text-white text-sm tracking-wider px-2 py-0.5 rounded bg-indigo-600">
                  {demoOtp}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter received OTP"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Enter New {resetType === 'tpin' ? '4-Digit TPIN' : '6-Digit MPIN'}
              </label>
              <input
                type="password"
                required
                maxLength={resetType === 'tpin' ? 4 : 6}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value.replace(/\D/g, ''))}
                placeholder={resetType === 'tpin' ? 'Enter 4 new digits' : 'Enter 6 new digits'}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-center font-mono text-lg tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !otpCode || !newValue}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold text-sm shadow-xl hover:opacity-95 transition disabled:opacity-40"
            >
              {loading ? 'Updating Credentials...' : `Confirm & Update ${resetType.toUpperCase()}`}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

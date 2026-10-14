import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, 
  MessageSquare, RefreshCw, Smartphone, ShieldAlert, ArrowRight, Zap, Check
} from 'lucide-react';

export const ManageTpinPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  // Active Tab: 'set' (Create/Change) or 'reset' (Forgot/Reset via OTP)
  const [activeMode, setActiveMode] = useState<'set' | 'reset'>('set');

  // Direct Set / Change TPIN State
  const [tpin, setTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [showTpin, setShowTpin] = useState(false);
  const [setLoading, setSetLoading] = useState(false);
  const [setSuccessMsg, setSetSuccessMsg] = useState<string | null>(null);
  const [setErrorMsg, setSetErrorMsg] = useState<string | null>(null);

  // Forgot / Reset OTP State
  const [channel] = useState<'WHATSAPP'>('WHATSAPP');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newResetTpin, setNewResetTpin] = useState('');
  const [showResetTpin, setShowResetTpin] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  const isFourDigits = tpin.length === 4 && /^\d+$/.test(tpin);
  const isMatch = tpin.length > 0 && tpin === confirmTpin;

  // Handle Direct Set / Change TPIN
  const handleSetTpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFourDigits || !isMatch) return;

    setSetLoading(true);
    setSetErrorMsg(null);
    setSetSuccessMsg(null);

    try {
      const res = await authApi.createTpin(tpin);
      const updatedProfile = { ...(res.user || user), tpin, tpin_set: true };
      updateUser(updatedProfile as any);
      setSetSuccessMsg(res.message || '4-digit TPIN successfully saved and activated!');
      setTpin('');
      setConfirmTpin('');
    } catch (err: any) {
      console.error('Failed to set TPIN:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save TPIN. Please try again.';
      setSetErrorMsg(msg);
    } finally {
      setSetLoading(false);
    }
  };

  // Handle Request OTP for Reset
  const handleRequestOtp = async () => {
    setResetLoading(true);
    setResetErrorMsg(null);
    setResetSuccessMsg(null);

    try {
      const res = await authApi.requestOtp({
        purpose: 'RESET_TPIN',
        channel
      });

      if (res.success) {
        setOtpSent(true);
        if (res.demoOtpCode) setDemoOtp(res.demoOtpCode);
        setResetSuccessMsg(res.message || 'OTP sent successfully to your WhatsApp!');
      } else {
        setResetErrorMsg(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setResetErrorMsg(err.response?.data?.message || 'Error communicating with OTP service.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Submit Reset TPIN with OTP
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newResetTpin.length !== 4 || !/^\d+$/.test(newResetTpin)) {
      setResetErrorMsg('New TPIN must be exactly 4 numeric digits.');
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      setResetErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setResetLoading(true);
    setResetErrorMsg(null);
    setResetSuccessMsg(null);

    try {
      const res = await authApi.resetTpin({ otpCode, newTpin: newResetTpin });
      if (res.success) {
        setResetSuccessMsg(res.message || '4-digit TPIN reset successfully!');
        if (user) {
          updateUser({ ...user, tpin: newResetTpin, tpin_set: true });
        }
        setOtpCode('');
        setNewResetTpin('');
        setOtpSent(false);
      } else {
        setResetErrorMsg(res.message || 'Failed to reset TPIN.');
      }
    } catch (err: any) {
      setResetErrorMsg(err.response?.data?.message || 'Failed to reset TPIN. Please check the OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Security Center
              </span>
              {user?.tpin_set ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> TPIN Active
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not Configured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-2">
              <Key className="w-7 h-7 text-emerald-400" />
              4-Digit Financial TPIN
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Your secret 4-digit Transaction PIN protects your funds and authorizes every <strong>Live Bill Pay</strong> and <strong>Instant Payout</strong> transfer.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className={`p-3 rounded-xl border ${user?.tpin_set ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Current Status</p>
              <p className="text-base font-black text-white">
                {user?.tpin_set ? 'Protected & Active' : 'TPIN Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODE TABS (SET / CHANGE vs FORGOT / RESET) */}
      <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => {
            setActiveMode('set');
            setSetErrorMsg(null);
            setSetSuccessMsg(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'set'
              ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{user?.tpin_set ? 'Change 4-Digit TPIN' : 'Create 4-Digit TPIN'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMode('reset');
            setResetErrorMsg(null);
            setResetSuccessMsg(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'reset'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Forgot / Reset TPIN</span>
        </button>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE FORM CARD */}
        <div className="lg:col-span-7 space-y-6">

          {/* TAB 1: CREATE / CHANGE TPIN FORM */}
          {activeMode === 'set' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  {user?.tpin_set ? 'Update Your 4-Digit TPIN' : 'Create Your 4-Digit TPIN'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose a secret 4-digit numeric code. Avoid common sequences like 1234 or 0000.
                </p>
              </div>

              {setSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{setSuccessMsg}</span>
                </div>
              )}

              {setErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-semibold">{setErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSetTpinSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Enter New 4-Digit TPIN <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showTpin ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={tpin}
                      onChange={(e) => setTpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTpin(!showTpin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showTpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Confirm 4-Digit TPIN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showTpin ? 'text' : 'password'}
                    required
                    maxLength={4}
                    value={confirmTpin}
                    onChange={(e) => setConfirmTpin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Live validation indicators */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                  <div className={`flex items-center space-x-2 transition-colors ${isFourDigits ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Exactly 4 numeric digits (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-2 transition-colors ${isMatch ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Both PIN fields match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={setLoading || !isFourDigits || !isMatch}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {setLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving 4-Digit TPIN...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Save & Activate 4-Digit TPIN</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: FORGOT / RESET TPIN VIA OTP */}
          {activeMode === 'reset' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  Reset 4-Digit TPIN via WhatsApp OTP
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verify your identity using a One-Time Password (OTP) sent directly to your registered mobile number: <strong className="text-indigo-300 font-mono">+91 {user?.mobile_number}</strong>
                </p>
              </div>

              {resetSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{resetSuccessMsg}</span>
                </div>
              )}

              {resetErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-semibold">{resetErrorMsg}</span>
                </div>
              )}

              {!otpSent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <p className="text-xs text-slate-300">
                      We will dispatch a secure 6-digit verification code to your WhatsApp:
                    </p>
                    <p className="text-base font-bold text-emerald-400 font-mono">
                      +91 {user?.mobile_number}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={resetLoading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    {resetLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending WhatsApp OTP...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-5 h-5" />
                        <span>Send WhatsApp OTP Code</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-5 animate-in fade-in">
                  {demoOtp && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                      <span>Demo Mode OTP Code:</span>
                      <strong className="font-mono text-white text-sm bg-indigo-900/60 px-2 py-0.5 rounded">{demoOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Enter 6-Digit WhatsApp OTP <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Enter New 4-Digit TPIN <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showResetTpin ? 'text' : 'password'}
                        required
                        maxLength={4}
                        value={newResetTpin}
                        onChange={(e) => setNewResetTpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetTpin(!showResetTpin)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showResetTpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading || otpCode.length !== 6 || newResetTpin.length !== 4}
                      className="w-2/3 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                    >
                      {resetLoading ? 'Verifying...' : 'Verify OTP & Reset TPIN'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: SECURITY GUIDELINES & NOTICE CARD */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              TPIN Security Rules & Guide
            </h3>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Required for Live Bill Pay
                </p>
                <p className="text-[11px] text-slate-400">
                  Every time you execute a Credit Card or utility bill payment, entering your 4-digit TPIN is mandatory before wallet debit.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Required for Instant Payout
                </p>
                <p className="text-[11px] text-slate-400">
                  Any bank transfer or payout to an IMPS account requires explicit TPIN authentication to avoid unauthorized transfers.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> 3-Attempt Security Lockout
                </p>
                <p className="text-[11px] text-slate-400">
                  Entering an incorrect TPIN 3 consecutive times automatically locks financial transactions for 15 minutes as an anti-fraud protection measure.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> WhatsApp Recovery
                </p>
                <p className="text-[11px] text-slate-400">
                  Forgot your TPIN? You can instantly reset it using WhatsApp OTP verification on this page anytime.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

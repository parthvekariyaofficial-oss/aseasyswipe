import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, 
  RefreshCw, ShieldAlert, Zap, Check, ArrowRight, HelpCircle
} from 'lucide-react';

export const ManageTpinPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  // Verification method: 'old_tpin' | 'mpin' | 'password'
  const [verificationMethod, setVerificationMethod] = useState<'old_tpin' | 'mpin' | 'password'>('old_tpin');
  
  // Verification input values
  const [oldTpin, setOldTpin] = useState('');
  const [mpin, setMpin] = useState('');
  const [password, setPassword] = useState('');

  // New TPIN values
  const [newTpin, setNewTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [showNewTpin, setShowNewTpin] = useState(false);
  const [showVerificationSecret, setShowVerificationSecret] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFourDigits = newTpin.length === 4 && /^\d+$/.test(newTpin);
  const isMatch = newTpin.length > 0 && newTpin === confirmTpin;

  // Check if current verification value is valid
  const isVerificationReady = () => {
    if (!user?.tpin_set) return true; // First time, no verification needed
    if (verificationMethod === 'old_tpin') return oldTpin.length === 4 && /^\d+$/.test(oldTpin);
    if (verificationMethod === 'mpin') return mpin.length === 6 && /^\d+$/.test(mpin);
    if (verificationMethod === 'password') return password.trim().length >= 6;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFourDigits || !isMatch || !isVerificationReady()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!user?.tpin_set) {
        // First-time setup
        const res = await authApi.createTpin(newTpin);
        updateUser({ ...(res.user || user), tpin: newTpin, tpin_set: true } as any);
        setSuccessMsg(res.message || '4-Digit TPIN successfully created!');
        setNewTpin('');
        setConfirmTpin('');
      } else {
        // Multi-tier reset (Old TPIN -> MPIN -> Password)
        let verificationValue = '';
        if (verificationMethod === 'old_tpin') verificationValue = oldTpin.trim();
        if (verificationMethod === 'mpin') verificationValue = mpin.trim();
        if (verificationMethod === 'password') verificationValue = password.trim();

        const res = await authApi.resetTpin({
          newTpin,
          verificationType: verificationMethod,
          verificationValue
        });

        if (res.success) {
          updateUser({ ...(res.user || user), tpin: newTpin, tpin_set: true } as any);
          setSuccessMsg(res.message || '4-Digit TPIN successfully updated!');
          setOldTpin('');
          setMpin('');
          setPassword('');
          setNewTpin('');
          setConfirmTpin('');
        } else {
          setErrorMsg(res.message || 'Failed to update TPIN.');
        }
      }
    } catch (err: any) {
      console.error('TPIN Update Error:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to process TPIN update.';
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
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
                  <CheckCircle2 className="w-3 h-3" /> TPIN Configured
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not Set Yet
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-2">
              <Key className="w-7 h-7 text-emerald-400" />
              4-Digit Financial TPIN Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage your 4-digit secret Transaction PIN used to authorize <strong>Live Bill Pay</strong> and <strong>Instant Payout</strong> transactions.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className={`p-3 rounded-xl border ${user?.tpin_set ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Current Status</p>
              <p className="text-base font-black text-white">
                {user?.tpin_set ? 'Active & Protected' : 'Setup Required'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: TPIN FORM CARD */}
        <div className="lg:col-span-7 space-y-6">

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {user?.tpin_set ? 'Change / Reset 4-Digit TPIN' : 'Create 4-Digit TPIN'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {user?.tpin_set
                  ? 'Verify your identity using your Old TPIN, 6-digit MPIN, or Account Password to set a new 4-digit TPIN.'
                  : 'Enter a secret 4-digit numeric code to protect all financial actions.'}
              </p>
            </div>

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* STEP 1: IDENTITY VERIFICATION (ONLY IF TPIN ALREADY SET) */}
              {user?.tpin_set && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-400" /> Step 1: Verify Current Identity
                    </span>

                    {/* Method selector pills */}
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('old_tpin');
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          verificationMethod === 'old_tpin'
                            ? 'bg-emerald-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Old TPIN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('mpin');
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          verificationMethod === 'mpin'
                            ? 'bg-indigo-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        6-Digit MPIN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('password');
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          verificationMethod === 'password'
                            ? 'bg-purple-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Password
                      </button>
                    </div>
                  </div>

                  {/* Verification Input by Method */}
                  {verificationMethod === 'old_tpin' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Enter Current Old 4-Digit TPIN <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showVerificationSecret ? 'text' : 'password'}
                          required
                          maxLength={4}
                          value={oldTpin}
                          onChange={(e) => setOldTpin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showVerificationSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span className="text-slate-400">Remember your current 4-digit PIN</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationMethod('mpin');
                            setErrorMsg(null);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Forgot Old TPIN? Use 6-Digit MPIN</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {verificationMethod === 'mpin' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Enter Your 6-Digit Login MPIN <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showVerificationSecret ? 'text' : 'password'}
                          required
                          maxLength={6}
                          value={mpin}
                          onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full bg-slate-900 border border-slate-750 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showVerificationSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationMethod('old_tpin');
                            setErrorMsg(null);
                          }}
                          className="text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          ← Back to Old TPIN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationMethod('password');
                            setErrorMsg(null);
                          }}
                          className="text-purple-400 hover:text-purple-300 font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Forgot MPIN? Use Password</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {verificationMethod === 'password' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Enter Your Account Login Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showVerificationSecret ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your account login password"
                          className="w-full bg-slate-900 border border-slate-750 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showVerificationSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span className="text-slate-400">Master account password verification</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationMethod('old_tpin');
                            setErrorMsg(null);
                          }}
                          className="text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          ← Back to Old TPIN
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: ENTER NEW 4-DIGIT TPIN */}
              <div className="space-y-4">
                <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  {user?.tpin_set ? 'Step 2: Enter New 4-Digit TPIN' : 'Enter 4-Digit TPIN'}
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    New 4-Digit TPIN <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewTpin ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={newTpin}
                      onChange={(e) => setNewTpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewTpin(!showNewTpin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewTpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Confirm New 4-Digit TPIN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showNewTpin ? 'text' : 'password'}
                    required
                    maxLength={4}
                    value={confirmTpin}
                    onChange={(e) => setConfirmTpin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Validation indicators */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className={`flex items-center space-x-2 transition-colors ${isFourDigits ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Exactly 4 numeric digits (0-9)</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isMatch ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Both PIN fields match</span>
                </div>
                {user?.tpin_set && (
                  <div className={`flex items-center space-x-2 transition-colors ${isVerificationReady() ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      {verificationMethod === 'old_tpin' && 'Current Old TPIN entered'}
                      {verificationMethod === 'mpin' && '6-digit MPIN entered'}
                      {verificationMethod === 'password' && 'Password entered'}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !isFourDigits || !isMatch || !isVerificationReady()}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Saving TPIN...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>{user?.tpin_set ? 'Verify & Update 4-Digit TPIN' : 'Save 4-Digit TPIN'}</span>
                  </>
                )}
              </button>

            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: RECOVERY CASCADE EXPLANATION & SECURITY RULES */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Recovery Hierarchy Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              TPIN Reset Hierarchy (No OTP)
            </h3>
            <p className="text-xs text-slate-300">
              You do not need to wait for mobile or WhatsApp OTPs! Reset your TPIN instantly using your existing credentials:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-300">Level 1: Old 4-Digit TPIN</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If you know your current TPIN, enter it directly to update to a new 4-digit PIN.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-300">Level 2: 6-Digit Login MPIN</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Forgot your old TPIN? Simply enter your 6-digit Login MPIN to create a new TPIN immediately.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-300">Level 3: Account Password</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Forgot both TPIN and MPIN? Enter your main account login password to reset your TPIN anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Rules Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Protection Notice
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Live Bill Pay & Payout
                </p>
                <p className="text-[11px] text-slate-400">
                  Your 4-digit TPIN is required every time you pay a bill or perform an instant IMPS bank transfer.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> 3-Attempt Lockout
                </p>
                <p className="text-[11px] text-slate-400">
                  Entering an incorrect TPIN 3 times consecutively locks transactions for 15 minutes to protect your balance from unauthorized attempts.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

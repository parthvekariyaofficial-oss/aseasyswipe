import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, 
  RefreshCw, ShieldAlert, Key, Check, HelpCircle, UserCheck
} from 'lucide-react';

export const ChangeMpinPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  // Verification method: 'old_mpin' | 'password'
  const [verificationMethod, setVerificationMethod] = useState<'old_mpin' | 'password'>('old_mpin');
  
  // Verification input values
  const [oldMpin, setOldMpin] = useState('');
  const [password, setPassword] = useState('');

  // New MPIN values
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showNewMpin, setShowNewMpin] = useState(false);
  const [showVerificationSecret, setShowVerificationSecret] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSixDigits = newMpin.length === 6 && /^\d+$/.test(newMpin);
  const isMatch = newMpin.length > 0 && newMpin === confirmMpin;

  // Check if current verification value is ready
  const isVerificationReady = () => {
    if (verificationMethod === 'old_mpin') return oldMpin.length === 6 && /^\d+$/.test(oldMpin);
    if (verificationMethod === 'password') return password.trim().length >= 6;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSixDigits || !isMatch || !isVerificationReady()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let verificationValue = '';
      if (verificationMethod === 'old_mpin') verificationValue = oldMpin.trim();
      if (verificationMethod === 'password') verificationValue = password.trim();

      const res = await authApi.changeMpin({
        newMpin,
        verificationType: verificationMethod,
        verificationValue
      });

      if (res && res.success) {
        updateUser({ ...(res.user || user), mpin: newMpin, mpin_set: true } as any);
        setSuccessMsg(res.message || '6-Digit Login MPIN successfully updated!');
        setOldMpin('');
        setPassword('');
        setNewMpin('');
        setConfirmMpin('');
      } else {
        setErrorMsg(res.message || 'Failed to update 6-digit MPIN.');
      }
    } catch (err: any) {
      console.error('MPIN Update Error:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to process MPIN update.';
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Login Security
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 6-Digit MPIN Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-2">
              <KeyRound className="w-7 h-7 text-purple-400" />
              6-Digit Login MPIN Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage your 6-digit Login MPIN used to authenticate your daily portal access after entering your password.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/30 text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">MPIN Status</p>
              <p className="text-base font-black text-white">
                Active & Protected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CHANGE MPIN FORM CARD */}
        <div className="lg:col-span-7 space-y-6">

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                Change 6-Digit Login MPIN
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Verify your identity using your Old 6-Digit MPIN or Account Password to set a new 6-digit MPIN.
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

              {/* STEP 1: IDENTITY VERIFICATION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-purple-400" /> Step 1: Verify Current Identity
                  </span>

                  {/* Method selector pills */}
                  <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMethod('old_mpin');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        verificationMethod === 'old_mpin'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Old 6-Digit MPIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMethod('password');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        verificationMethod === 'password'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Password
                    </button>
                  </div>
                </div>

                {/* Sub-inputs depending on verification method */}
                {verificationMethod === 'old_mpin' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Enter Current Old 6-Digit MPIN <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showVerificationSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showVerificationSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showVerificationSecret ? 'text' : 'password'}
                        required
                        maxLength={6}
                        value={oldMpin}
                        onChange={(e) => setOldMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px]">
                      <span className="text-slate-400">Enter your 6-digit login MPIN</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('password');
                          setErrorMsg(null);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-bold transition cursor-pointer"
                      >
                        Forgot Old MPIN? Use Password →
                      </button>
                    </div>
                  </div>
                )}

                {verificationMethod === 'password' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Enter Account Login Password <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showVerificationSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showVerificationSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showVerificationSecret ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your login account password"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px]">
                      <span className="text-slate-400">Authorize using your main login password</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('old_mpin');
                          setErrorMsg(null);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-bold transition cursor-pointer"
                      >
                        Remember Old MPIN? Use MPIN →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: ENTER NEW 6-DIGIT MPIN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" /> Step 2: Enter New 6-Digit MPIN
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    New 6-Digit MPIN <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewMpin ? 'text' : 'password'}
                      required
                      maxLength={6}
                      value={newMpin}
                      onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewMpin(!showNewMpin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Confirm New 6-Digit MPIN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showNewMpin ? 'text' : 'password'}
                    required
                    maxLength={6}
                    value={confirmMpin}
                    onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Validation indicators */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className={`flex items-center space-x-2 transition-colors ${isSixDigits ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Exactly 6 numeric digits (0-9)</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isMatch ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Both MPIN fields match</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isVerificationReady() ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {verificationMethod === 'old_mpin' && 'Current Old 6-digit MPIN entered'}
                    {verificationMethod === 'password' && 'Account Password entered'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isSixDigits || !isMatch || !isVerificationReady()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Saving MPIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>Verify & Update 6-Digit MPIN</span>
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
              <HelpCircle className="w-5 h-5 text-purple-400" />
              MPIN Reset Hierarchy (No OTP)
            </h3>
            <p className="text-xs text-slate-300">
              You do not need to wait for mobile or WhatsApp OTPs! Reset your 6-digit Login MPIN instantly using your credentials:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-300">Level 1: Old 6-Digit MPIN</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If you know your current MPIN, enter it directly to update to a new 6-digit MPIN.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-300">Level 2: Account Password</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Forgot your old MPIN? Simply enter your main account login password to reset your MPIN anytime.
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
                <p className="font-bold text-purple-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Secure Login Access
                </p>
                <p className="text-[11px] text-slate-400">
                  Your 6-digit MPIN protects your daily portal login session and prevents unauthorized access to your account.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Never Share Credentials
                </p>
                <p className="text-[11px] text-slate-400">
                  AS EasySwipe support will never ask for your MPIN, TPIN, or Password. Always keep them private.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

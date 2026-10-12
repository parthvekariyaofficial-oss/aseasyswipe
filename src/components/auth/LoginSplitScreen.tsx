import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Eye, EyeOff, Lock, Phone, KeyRound, ArrowRight, 
  Sparkles, CheckCircle, AlertCircle, Building2, Smartphone, Key, ArrowLeft, UserCheck
} from 'lucide-react';

interface LoginSplitScreenProps {
  onOpenResetPin?: () => void;
  onBackToHome?: () => void;
}

export const LoginSplitScreen: React.FC<LoginSplitScreenProps> = ({ onOpenResetPin, onBackToHome }) => {
  const { setAuth } = useAuthStore();
  const [loginStep, setLoginStep] = useState<'password' | 'mpin_verify'>('password');
  
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setBlockedReason(null);

    try {
      const res = await authApi.login({ mobile_number: mobileNumber, password });
      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token, res.must_change_password);
      } else {
        setErrorMessage(res.message || 'Authentication failed.');
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp) {
        if (resp.reason === 'ACCOUNT_BLOCKED' || resp.reason === 'ACCOUNT_INACTIVE') {
          setBlockedReason(resp.message);
        } else {
          setErrorMessage(resp.message || 'Authentication error occurred.');
        }
      } else {
        setErrorMessage('Server unreachable or network error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[92vh] flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 bg-[#0b0f19]">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT PANEL: Branding & Feature Cards */}
        <div className="lg:col-span-6 space-y-6 lg:pr-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen Enterprise Fintech Portal</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Multi-Role <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Security & Banking</span> Replica
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            Ultra-secure authentication engine powered by 256-bit JWT tokens, mandatory TPIN transaction authorization, hierarchical commission tree, and automatic rate-limiting lockout.
          </p>

          {/* Key Feature Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">4-Digit TPIN Engine</h4>
                <p className="text-[11px] text-slate-400">Auto-lockout after 3 invalid attempts</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Multi-Role Hierarchy</h4>
                <p className="text-[11px] text-slate-400">Admin, MS, DS, Retailer & B2B</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Instant WhatsApp OTP</h4>
                <p className="text-[11px] text-slate-400">Self-service TPIN & MPIN resets</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">B2B API Gateway</h4>
                <p className="text-[11px] text-slate-400">REST API keys & Webhook engine</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Modern 2-Step Login Form */}
        <div className="lg:col-span-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Back to Home Button */}
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition mb-4 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>← Back to Home</span>
              </button>
            )}

            {/* Login Header */}
            <div className="text-center mb-6">
              {loginStep === 'password' ? (
                <>
                  <h2 className="text-2xl font-bold text-white">Sign In to Account</h2>
                  <p className="text-xs text-slate-400 mt-1">Enter your registered mobile number & account password</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/30">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Step 2: Enter 6-Digit MPIN</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Welcome <span className="font-bold text-indigo-300">{userName}</span>! Enter your secret 6-digit MPIN to complete sign-in.
                  </p>
                </>
              )}
            </div>

            {/* Account Status / Blocked Alert */}
            {blockedReason && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-200">Account Access Denied</p>
                  <p className="mt-0.5">{blockedReason}</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {loginStep === 'password' ? (
                <>
                  {/* Mobile Number Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                        +91
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl glass-input text-sm font-mono tracking-wider"
                      />
                      <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm font-sans"
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
                </>
              ) : (
                <>
                  {/* 6-Digit MPIN Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Enter 6-Digit MPIN</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={6}
                        value={mpin}
                        onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit MPIN"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest text-center"
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

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('password'); setMpin(''); setErrorMessage(null); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Password Input
                    </button>
                  </div>
                </>
              )}

              {/* Actions & Resets */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Security Encrypted</span>
                {onOpenResetPin && (
                  <button
                    type="button"
                    onClick={onOpenResetPin}
                    className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" /> Reset TPIN / MPIN
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : loginStep === 'password' ? (
                  <>
                    <span>Continue to MPIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Verify MPIN & Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
};

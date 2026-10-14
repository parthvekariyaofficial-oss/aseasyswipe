import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { kycApi } from '../../services/api';
import { 
  Clock, ShieldAlert, CheckCircle2, RefreshCw, LogOut, 
  Building2, Phone, Mail, FileCheck2, AlertCircle 
} from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface KycUnderReviewScreenProps {
  user: UserProfile;
}

export const KycUnderReviewScreen: React.FC<KycUnderReviewScreenProps> = ({ user }) => {
  const { updateUser, logout } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      const res = await kycApi.getMyKycStatus();
      setLastChecked(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (res.success && res.kyc_status) {
        if (res.kyc_status !== user.kyc_status) {
          // Status updated! Update store so React re-renders to Dashboard or Upload screen
          updateUser({
            ...user,
            kyc_status: res.kyc_status,
            kyc_rejection_reason: res.rejection_reason || null
          });
        } else {
          setCheckMessage('Status is still Under Review. Please check back shortly.');
        }
      }
    } catch (err: any) {
      setCheckMessage('Unable to check status at this moment. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* TOP HEADER */}
      <header className="h-16 shrink-0 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AS EasySwipe" className="h-8 w-auto object-contain rounded-lg shadow" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>AS EasySwipe</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Under Review
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{user.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{user.firm_name} • {user.mobile_number}</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl text-center">
          {/* BACKGROUND GLOW */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* PULSING STATUS ICON */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl relative z-10">
              <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
          </div>

          {/* TITLE & DESCRIPTION */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-3">
            KYC Verification Pending
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Account Under Review
          </h2>

          <p className="text-sm text-slate-300 mt-3 leading-relaxed max-w-lg mx-auto">
            તમારા બધા જ KYC દસ્તાવેજો (PAN, Aadhaar, Firm Selfie, Cheque) સફળતાપૂર્વક સબમિટ થઈ ગયા છે. હાલમાં એડમિન ટીમ દ્વારા દસ્તાવેજોની ચકાસણી કરવામાં આવી રહી છે.
          </p>

          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Your KYC documents are currently being verified by the compliance desk. As soon as Admin approves your request, your dashboard will automatically unlock.
          </p>

          {/* SUBMISSION SUMMARY BOX */}
          <div className="mt-8 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <span className="text-slate-400">Account Name</span>
              <span className="font-bold text-white">{user.name}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <span className="text-slate-400">Firm / Business Name</span>
              <span className="font-bold text-white">{user.firm_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <span className="text-slate-400">Registered Mobile</span>
              <span className="font-mono font-bold text-indigo-400">{user.mobile_number}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <span className="text-slate-400">Documents Submitted</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>5 / 5 Documents Verified Upload</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Current Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Under Review
              </span>
            </div>
          </div>

          {/* STATUS NOTIFICATION / FEEDBACK */}
          {checkMessage && (
            <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{checkMessage}</span>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {lastChecked && (
            <p className="text-[10px] text-slate-500 mt-4">
              Last checked at {lastChecked}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

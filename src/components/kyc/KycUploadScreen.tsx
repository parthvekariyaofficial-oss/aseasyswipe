import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { kycApi } from '../../services/api';
import { 
  ShieldCheck, Upload, CheckCircle2, AlertCircle, FileText, 
  CreditCard, Store, Building2, Camera, LogOut, ArrowRight, Loader2, X 
} from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface KycUploadScreenProps {
  user: UserProfile;
}

interface DocSlot {
  key: 'pan_card_url' | 'aadhaar_front_url' | 'aadhaar_back_url' | 'firm_selfie_url' | 'cheque_url';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
}

const DOC_SLOTS: DocSlot[] = [
  {
    key: 'pan_card_url',
    title: 'PAN Card Photo',
    subtitle: 'Upload clear photo of original PAN Card',
    icon: CreditCard,
    badge: 'Mandatory'
  },
  {
    key: 'aadhaar_front_url',
    title: 'Aadhaar Card (Front)',
    subtitle: 'Front side showing Name & Aadhaar Number',
    icon: FileText,
    badge: 'Mandatory'
  },
  {
    key: 'aadhaar_back_url',
    title: 'Aadhaar Card (Back)',
    subtitle: 'Back side showing complete Address',
    icon: FileText,
    badge: 'Mandatory'
  },
  {
    key: 'firm_selfie_url',
    title: 'Firm / Shop Selfie Photo',
    subtitle: 'Selfie with your shop, office or firm banner',
    icon: Store,
    badge: 'Verification'
  },
  {
    key: 'cheque_url',
    title: 'Bank Cheque / Passbook',
    subtitle: 'Cancelled cheque or bank passbook first page',
    icon: Building2,
    badge: 'Payout Bank'
  }
];

export const KycUploadScreen: React.FC<KycUploadScreenProps> = ({ user }) => {
  const { updateUser, logout } = useAuthStore();

  const [docs, setDocs] = useState<{
    pan_card_url: string;
    aadhaar_front_url: string;
    aadhaar_back_url: string;
    firm_selfie_url: string;
    cheque_url: string;
  }>({
    pan_card_url: '',
    aadhaar_front_url: '',
    aadhaar_back_url: '',
    firm_selfie_url: '',
    cheque_url: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (key: keyof typeof docs, file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setDocs(prev => ({ ...prev, [key]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (key: keyof typeof docs) => {
    setDocs(prev => ({ ...prev, [key]: '' }));
  };

  const uploadedCount = Object.values(docs).filter(Boolean).length;
  const isComplete = uploadedCount === 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) {
      setErrorMessage('Please upload all 5 required documents before submitting.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await kycApi.submitKyc(docs);
      if (res.success && res.user) {
        updateUser(res.user);
      } else {
        setErrorMessage(res.message || 'Failed to submit KYC documents.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Server error while submitting KYC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRejected = user.kyc_status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* TOP HEADER */}
      <header className="h-16 shrink-0 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AS EasySwipe" className="h-8 w-auto object-contain rounded-lg shadow" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>AS EasySwipe</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Onboarding KYC
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

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* REJECTION ALERT (IF APPLICABLE) */}
        {isRejected && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
                Previous KYC Submission Was Rejected
              </p>
              <p className="mt-1 text-rose-300">
                Reason: <span className="font-semibold text-white">{user.kyc_rejection_reason || 'Documents unclear or verification failed.'}</span>
              </p>
              <p className="mt-1 text-slate-400 text-[11px]">
                Please review the reason above and re-upload clear, original photos of all required documents.
              </p>
            </div>
          </div>
        )}

        {/* HERO TITLE & PROGRESS */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>First-Time User Verification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Mandatory KYC Document Submission
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Welcome to AS EasySwipe! In accordance with RBI and banking security policies, please upload clear photos of your 5 identity & business verification documents. Once submitted, your account will be reviewed and activated by Admin.
              </p>
            </div>

            {/* PROGRESS COUNTER */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shrink-0 flex flex-col items-center justify-center min-w-[180px]">
              <div className="text-xs font-semibold text-slate-400">Upload Progress</div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                <span className={uploadedCount === 5 ? 'text-emerald-400' : 'text-indigo-400'}>{uploadedCount}</span>
                <span className="text-slate-600"> / 5</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${uploadedCount === 5 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${(uploadedCount / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
                {uploadedCount === 5 ? '✓ All files attached' : `${5 - uploadedCount} remaining`}
              </span>
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* UPLOAD FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOC_SLOTS.map((slot) => {
              const fileData = docs[slot.key];
              const IconComp = slot.icon;
              const inputId = `file_input_${slot.key}`;

              return (
                <div 
                  key={slot.key}
                  className={`relative rounded-2xl p-4 transition border flex flex-col justify-between ${
                    fileData 
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* TOP HEADER OF CARD */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        fileData ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-indigo-400 border-slate-700'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white leading-tight">{slot.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{slot.subtitle}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                      fileData 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {fileData ? 'Attached' : slot.badge}
                    </span>
                  </div>

                  {/* PREVIEW OR DROPZONE */}
                  {fileData ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black/40 group aspect-[4/3] flex items-center justify-center">
                      <img 
                        src={fileData} 
                        alt={slot.title} 
                        className="w-full h-full object-cover transition group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => removeDoc(slot.key)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-emerald-500 text-slate-950 shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <label 
                      htmlFor={inputId}
                      className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center text-center transition bg-slate-950/40 hover:bg-slate-900/60 aspect-[4/3] group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-indigo-500/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center mb-2 transition">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                        Click to Upload
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        PNG, JPG, JPEG up to 10MB
                      </span>
                    </label>
                  )}

                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slot.key, file);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* SUBMIT BUTTON CONTAINER */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All uploads are encrypted. Verification takes roughly 15 to 30 minutes during business hours.</span>
            </div>

            <button
              type="submit"
              disabled={!isComplete || loading}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl ${
                isComplete && !loading
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting Documents...</span>
                </>
              ) : (
                <>
                  <span>Send Documents for Admin Approval</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

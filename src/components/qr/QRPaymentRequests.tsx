import React, { useState, useEffect } from 'react';
import { qrApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { QrMaster, QrPaymentRequest } from '../../types/qr';
import { 
  QrCode, Copy, Check, Upload, ArrowRight, ShieldCheck, 
  AlertCircle, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  CheckCircle, X, Eye, FileText, Lock 
} from 'lucide-react';

export const QRPaymentRequests: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Active QR for Retailer
  const [activeQr, setActiveQr] = useState<QrMaster | null>(null);
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // System Settings State
  const [userQrVisible, setUserQrVisible] = useState(true);
  const [qrRequestSectionEnabled, setQrRequestSectionEnabled] = useState(true);

  // Retailer Payment Form State
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Copy State
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Admin Processing State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<QrPaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Filter State for Admin
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const setRes = await qrApi.getSettings().catch(() => ({ success: false, settings: null }));
      if (setRes.success && setRes.settings) {
        setUserQrVisible(setRes.settings.user_qr_visible !== false);
        setQrRequestSectionEnabled(setRes.settings.qr_request_section_enabled !== false);
      }

      if (!isAdmin) {
        const activeRes = await qrApi.getActiveQr();
        if (activeRes.success) {
          setActiveQr(activeRes.qr_master);
          if (activeRes.settings) {
            setUserQrVisible(activeRes.settings.user_qr_visible !== false);
            setQrRequestSectionEnabled(activeRes.settings.qr_request_section_enabled !== false);
          }
        }
      }

      const reqRes = await qrApi.getPaymentRequests();
      if (reqRes.success) {
        setRequestsList(reqRes.payment_requests || []);
      }
    } catch (err) {
      console.error('Fetch Data Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleOpenScreenshot = async (req: QrPaymentRequest) => {
    if (req.screenshot_url) {
      setPreviewScreenshot(req.screenshot_url);
      return;
    }
    try {
      const res = await qrApi.getScreenshot(req.id);
      if (res.success && res.screenshot_url) {
        setPreviewScreenshot(res.screenshot_url);
      } else {
        alert('No receipt screenshot available for this request.');
      }
    } catch {
      alert('Failed to load receipt screenshot.');
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [isAdmin]);

  const handleCopyUpi = (upi?: string) => {
    if (!upi) return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setScreenshotPreview(result);
        setScreenshotUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage('UTR Number must be exactly 12 numeric digits.');
      return;
    }

    if (!screenshotUrl && !screenshotPreview) {
      setErrorMessage('Payment receipt screenshot is required. Please upload screenshot.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await qrApi.submitPaymentRequest({
        amount: numAmount,
        utr_number: cleanUtr,
        mobile_number: mobileNumber,
        screenshot_url: screenshotUrl,
        qr_master_id: activeQr?.id
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Payment request submitted successfully!');
        setAmount('');
        setUtrNumber('');
        setScreenshotUrl('');
        setScreenshotPreview(null);
        fetchData();
      } else {
        setErrorMessage(res.message || 'Submission failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error submitting payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ATOMIC & IDEMPOTENT APPROVAL / REJECTION
  const handleProcessRequest = async (reqId: string, action: 'approved' | 'rejected', reason?: string) => {
    setProcessingId(reqId);
    try {
      const res = await qrApi.processPaymentRequest(reqId, action, reason);
      if (res.success) {
        setSuccessMessage(res.message);
        setRejectingReq(null);
        setRejectionReason('');
        fetchData();
      } else {
        alert(res.message || 'Operation failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing payment request.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requestsList.filter(r => {
    const matchesSearch = (r.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.utr_number || '').includes(searchTerm) ||
                          (r.mobile_number || '').includes(searchTerm) ||
                          (r.firm_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requestsList.filter(r => r.status === 'pending').length;
  const approvedCount = requestsList.filter(r => r.status === 'approved').length;
  const totalApprovedAmount = requestsList
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.net_amount || 0), 0);

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER / ACTIONS */}
      {!isAdmin ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <QrCode className="w-7 h-7 text-purple-400" /> 
              QR Code Instant Add Money
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Scan active QR code, transfer funds, enter 12-digit UTR and request instant credit.
            </p>
          </div>

          <button
            onClick={() => fetchData(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Realtime Sync</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end">
          <button
            onClick={() => fetchData(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-2 text-xs font-bold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Realtime Sync</span>
          </button>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* RETAILER VIEW (WHEN REQUEST SECTION IS DISABLED) */}
      {!isAdmin && !qrRequestSectionEnabled && (
        <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-white">QR Payment Request Service Offline</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              QR Add Money and UTR payment request submissions are currently turned OFF / disabled by Admin. New load requests are temporarily paused.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
            <span>Status: Disabled by Admin</span>
          </div>
        </div>
      )}

      {/* RETAILER VIEW (LEFT: ACTIVE QR DISPLAY 65%, RIGHT: SUBMISSION FORM 35%) */}
      {!isAdmin && qrRequestSectionEnabled && (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* LEFT SIDE: ACTIVE QR CODE & UPI DETAILS (65%) */}
          <div className="w-full lg:w-[65%] bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-7 shadow-2xl flex flex-col items-center text-center justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* TOP HEADER: BADGE */}
            <div className="z-10 flex flex-col items-center text-center">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Official Target QR Code
              </span>
            </div>

            {/* THICKER GLOWING GRADIENT BORDER QR CODE IMAGE */}
            <div className="relative group z-10 my-1">
              <div className={`absolute -inset-1.5 rounded-[32px] blur-lg opacity-50 group-hover:opacity-85 transition duration-500 ${
                !userQrVisible
                  ? 'bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600'
              }`}></div>
              <div className={`relative p-3.5 rounded-[30px] shadow-2xl transition-colors duration-500 ${
                !userQrVisible
                  ? 'bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-600 shadow-rose-950/70'
                  : 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-purple-600 shadow-purple-950/70'
              }`}>
                <div className={`rounded-[18px] overflow-hidden transition-colors duration-300 ${!userQrVisible ? 'p-0 bg-slate-950' : 'p-3 bg-white'}`}>
                  {!userQrVisible ? (
                    <div className="w-64 h-64 relative rounded-[18px] overflow-hidden group/inv flex items-center justify-center bg-slate-950">
                      <img
                        src="/qr_invisible.jpg?v=2"
                        alt="QR Display Hidden"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col items-center justify-end p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/30 backdrop-blur-md border border-purple-500/50 text-purple-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg mb-1">
                          <Lock className="w-3 h-3 text-amber-400" /> QR Code Hidden
                        </span>
                        <p className="text-[10px] font-extrabold text-white leading-tight">
                          Active QR code display is paused by Admin
                        </p>
                      </div>
                    </div>
                  ) : activeQr ? (
                    <img
                      src={activeQr.qr_image_url}
                      alt={activeQr.name}
                      className="w-60 h-60 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-60 h-60 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Clock className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                      <span>Loading Active QR...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QR NAME & UPI ID CENTERED BELOW QR BOX */}
            <div className="space-y-1.5 z-10 flex flex-col items-center text-center">
              <h3 className="text-2xl font-black text-white tracking-wide">
                {activeQr ? activeQr.name : 'Loading QR...'}
              </h3>

              {/* UPI ID & COPY BUTTON */}
              {activeQr && (
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner max-w-full">
                  <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider shrink-0">Merchant UPI ID:</span>
                  <span className="text-sm font-mono font-extrabold text-purple-300 truncate">{activeQr.upi_id}</span>
                  <button
                    onClick={() => handleCopyUpi(activeQr.upi_id)}
                    className="ml-1 px-3 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-bold border border-purple-500/30 transition flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-[11px] text-purple-300/90 font-medium flex items-center justify-center gap-1.5 w-full z-10 max-w-md mt-2">
              <span>💡 Scan QR from GooglePay, PhonePe, Paytm or BHIM UPI app to transfer funds.</span>
            </div>
          </div>

          {/* RIGHT SIDE: PAYMENT REQUEST FORM (35%) */}
          <div className="w-full lg:w-[35%] bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-7 shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div className="border-b border-slate-800/80 pb-3.5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" /> Submit QR Payment Verification
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your payment details and 12-digit UTR reference number for instant wallet load.
              </p>
            </div>

            <form onSubmit={handleUserSubmit} className="flex-1 flex flex-col justify-between space-y-5">
              
              {/* SINGLE COLUMN GRID FOR INPUT FIELDS */}
              <div className="grid grid-cols-1 gap-3.5">
                {/* AMOUNT */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    AMOUNT (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition shadow-inner"
                  />
                </div>

                {/* UTR NUMBER (12 DIGITS) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    12-DIGIT UTR / RRN NO <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit UTR number"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition shadow-inner"
                  />
                </div>

                {/* MOBILE NUMBER */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    PAYMENT SENDER MOBILE <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit Mobile Number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition shadow-inner"
                  />
                </div>

                {/* SCREENSHOT UPLOAD (MANDATORY TALL DROPZONE) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    PAYMENT SCREENSHOT <span className="text-rose-400">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-slate-950/90 border-2 border-dashed ${
                    screenshotPreview ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 hover:border-purple-500/70 hover:bg-purple-500/5'
                  } cursor-pointer transition-all duration-200 shadow-inner group text-center`}>
                    {screenshotPreview ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 animate-bounce" />
                    ) : (
                      <Upload className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                    )}
                    <div className="space-y-0.5">
                      <span className={`text-xs font-extrabold block ${screenshotPreview ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {screenshotPreview ? 'Receipt Screenshot Uploaded ✓' : 'Click to Upload Payment Screenshot *'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, JPEG receipts up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-purple-950/50 transition transform hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? 'Submitting Request...' : 'Submit Payment Request'}
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>
          </div>

        </div>
      )}

      {/* ADMIN STATS CARDS */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Approvals</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Approved Payments</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{approvedCount}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Net Credited</p>
              <p className="text-xl font-bold text-purple-300 mt-1">
                ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT REQUESTS HISTORY TABLE (ADMIN & USER) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        
        {/* TABLE SEARCH & FILTER HEADER */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            {isAdmin ? `All User QR Payment Requests (${requestsList.length})` : 'My Payment Requests History'}
          </h3>

          {isAdmin && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by User, Firm, QR Name, Mobile, or UTR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl p-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">User & Firm</th>
                <th className="p-4">Mobile Number</th>
                <th className="p-4">QR Name</th>
                <th className="p-4">12-Digit UTR</th>
                <th className="p-4">Requested Amt</th>
                <th className="p-4">Charge (%)</th>
                {isAdmin && <th className="p-4 text-amber-400">DS Comm</th>}
                {isAdmin && <th className="p-4 text-indigo-300">MS Comm</th>}
                {isAdmin && <th className="p-4 text-emerald-400">Admin Comm</th>}
                <th className="p-4">Net Credit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions / Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 9} className="p-8 text-center text-slate-500">
                    Loading QR payment requests...
                  </td>
                </tr>
              ) : (isAdmin ? filteredRequests : requestsList).length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 9} className="p-8 text-center text-slate-500">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                (isAdmin ? filteredRequests : requestsList).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* USER & FIRM */}
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-white">{r.user_name || 'Retailer User'}</p>
                        <p className="text-[10px] text-slate-400">{r.firm_name || 'N/A'}</p>
                      </div>
                    </td>

                    {/* MOBILE NUMBER */}
                    <td className="p-4 font-mono font-semibold text-slate-300">
                      {r.mobile_number || 'N/A'}
                    </td>

                    {/* QR NAME */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold text-xs inline-block">
                        {r.qr_name || 'Active QR'}
                      </span>
                    </td>

                    {/* UTR NUMBER */}
                    <td className="p-4 font-mono font-bold text-purple-300">
                      {r.utr_number}
                    </td>

                    {/* REQUESTED AMOUNT */}
                    <td className="p-4 font-bold text-white">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* CHARGE (%) */}
                    <td className="p-4 font-mono text-slate-400">
                      {r.charge_percent || 0.50}% (-₹{Number(r.charge_amount || 0).toFixed(2)})
                    </td>

                    {/* DS COMMISSION (ADMIN ONLY) */}
                    {isAdmin && (
                      <td className="p-4 font-mono font-bold text-amber-400">
                        +₹{Number(r.distributor_commission || 0).toFixed(2)}
                      </td>
                    )}

                    {/* MS COMMISSION (ADMIN ONLY) */}
                    {isAdmin && (
                      <td className="p-4 font-mono font-bold text-indigo-300">
                        +₹{Number(r.super_distributor_commission || 0).toFixed(2)}
                      </td>
                    )}

                    {/* ADMIN COMMISSION (ADMIN ONLY) */}
                    {isAdmin && (
                      <td className="p-4 font-mono font-bold text-emerald-400">
                        +₹{Number(
                          r.admin_commission !== undefined
                            ? r.admin_commission
                            : Math.max(0, (r.charge_amount || 0) - ((r.distributor_commission || 0) + (r.super_distributor_commission || 0)))
                        ).toFixed(2)}
                      </td>
                    )}

                    {/* NET CREDIT */}
                    <td className="p-4 font-extrabold text-emerald-400 font-mono">
                      ₹{Number(r.net_amount || (r.amount - (r.charge_amount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                        r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        r.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {r.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {r.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                        <span className="uppercase">{r.status}</span>
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* SCREENSHOT PREVIEW ICON */}
                        <button
                          onClick={() => handleOpenScreenshot(r)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title="View Receipt Screenshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* ADMIN APPROVE / REJECT BUTTONS */}
                        {isAdmin && r.status === 'pending' && (
                          <>
                            <button
                              disabled={processingId === r.id}
                              onClick={() => handleProcessRequest(r.id, 'approved')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{processingId === r.id ? 'Processing...' : 'Approve'}</span>
                            </button>

                            <button
                              disabled={processingId === r.id}
                              onClick={() => setRejectingReq(r)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {r.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}

                        {r.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[11px] inline-flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* REJECTION REASON MODAL */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Reject Payment Request
            </h3>
            <p className="text-xs text-slate-400">
              UTR: <strong className="text-white font-mono">{rejectingReq.utr_number}</strong> | User: <strong className="text-white">{rejectingReq.user_name}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Enter reason for rejection (e.g. Invalid UTR or Amount mismatch)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectingReq.id}
                onClick={() => handleProcessRequest(rejectingReq.id, 'rejected', rejectionReason)}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewScreenshot(null)}>
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center">
            <button
              onClick={() => setPreviewScreenshot(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3">Payment Receipt Screenshot</h4>
            <img src={previewScreenshot} alt="Receipt" className="max-h-[70vh] rounded-2xl object-contain border border-slate-700" />
          </div>
        </div>
      )}

    </div>
  );
};

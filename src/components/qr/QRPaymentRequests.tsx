import React, { useState, useEffect } from 'react';
import { qrApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { QrMaster, QrPaymentRequest } from '../../types/qr';
import { 
  QrCode, Copy, Check, Upload, ArrowRight, ShieldCheck, 
  AlertCircle, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  CheckCircle, X, Eye, FileText, Lock, Calendar, Hash, RotateCcw, Filter, Coins, Images,
  ZoomIn, ZoomOut, RotateCw, ExternalLink, Move
} from 'lucide-react';

export const QRPaymentRequests: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDistributor = user?.role === 'distributor';
  const isSuperDistributor = user?.role === 'super_distributor';
  const isChannelPartner = isDistributor || isSuperDistributor;

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
  const [previewRequest, setPreviewRequest] = useState<QrPaymentRequest | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [copiedModalUtr, setCopiedModalUtr] = useState<boolean>(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [utrFilter, setUtrFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const setRes = await qrApi.getSettings().catch(() => ({ success: false, settings: null }));
      if (setRes.success && setRes.settings) {
        setUserQrVisible(setRes.settings.user_qr_visible !== false);
        setQrRequestSectionEnabled(setRes.settings.qr_request_section_enabled !== false);
      }

      if (!isAdmin && !isChannelPartner) {
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

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoomLevel(prev => {
      const next = prev + delta;
      return Math.min(Math.max(0.5, next), 4);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCloseModal = () => {
    setPreviewScreenshot(null);
    setPreviewRequest(null);
    handleResetZoom();
  };

  const handleCopyModalUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedModalUtr(true);
    setTimeout(() => setCopiedModalUtr(false), 2000);
  };

  const handleOpenScreenshot = async (req: QrPaymentRequest) => {
    setPreviewRequest(req);
    handleResetZoom();
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
    const interval = setInterval(() => {
      fetchData(false);
    }, 3000);
    return () => clearInterval(interval);
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
        if (previewRequest?.id === reqId) {
          setPreviewRequest(prev => prev ? { ...prev, status: action, rejection_reason: reason } : null);
        }
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

  const isAnyFilterActive = Boolean(
    searchTerm.trim() ||
    utrFilter.trim() ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setUtrFilter('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const filteredRequests = requestsList.filter(r => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      const t = d.getTime();
      if (isNaN(t)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (dateFilter === 'TODAY') {
        if (t < startOfToday || t > endOfToday) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (t < startOfYesterday || t > endOfYesterday) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (t < startOf7Days || t > endOfToday) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (t < startOf30Days || t > endOfToday) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (t < startOfMonth || t > endOfToday) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const [sY, sM, sD] = customStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (t < startTime) return false;
        }
        if (customEndDate) {
          const [eY, eM, eD] = customEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (t > endTime) return false;
        }
      }
    }

    // 2. UTR Number Filter
    if (utrFilter.trim()) {
      const cleanUtr = utrFilter.trim().toLowerCase();
      if (!(r.utr_number || '').toLowerCase().includes(cleanUtr)) {
        return false;
      }
    }

    // 3. Status Filter
    if (statusFilter !== 'ALL') {
      if (r.status !== statusFilter) return false;
    }

    // 4. Admin & Channel Partner Search (User, Firm, Mobile, QR Name)
    if ((isAdmin || isChannelPartner) && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matches =
        (r.user_name || '').toLowerCase().includes(q) ||
        (r.mobile_number || '').includes(q) ||
        (r.firm_name || '').toLowerCase().includes(q) ||
        (r.qr_name || '').toLowerCase().includes(q) ||
        (r.utr_number || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  const pendingCount = requestsList.filter(r => r.status === 'pending').length;
  const approvedCount = requestsList.filter(r => r.status === 'approved').length;
  const totalApprovedAmount = requestsList
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.net_amount || 0), 0);

  const totalCommissionEarned = requestsList
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => {
      if (isSuperDistributor) {
        return sum + Number(r.super_distributor_commission || 0);
      }
      if (isDistributor) {
        return sum + Number(r.distributor_commission || 0);
      }
      return sum;
    }, 0);

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER / ACTIONS (REGULAR RETAILER) */}
      {!isAdmin && !isChannelPartner && (
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
        </div>
      )}

      {/* HEADER / ACTIONS (CHANNEL PARTNER: DISTRIBUTOR & SUPER DISTRIBUTOR) */}
      {isChannelPartner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl shadow-2xl">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
              {isSuperDistributor ? 'Super Distributor Downline' : 'Distributor Downline'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <QrCode className="w-7 h-7 text-purple-400" /> 
              Downline QR Payment History
            </h2>
            <p className="text-xs text-slate-400">
              Live tracking of QR payment requests and commission earnings across your mapped downstream network.
            </p>
          </div>
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
      {!isAdmin && !isChannelPartner && !qrRequestSectionEnabled && (
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
      {!isAdmin && !isChannelPartner && qrRequestSectionEnabled && (
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

      {/* ADMIN STATS CARDS & GALLERY SHORTCUT */}
      {isAdmin && (
        <>
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

          {/* QR PROOF GALLERY BANNER FOR ADMIN */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-md">
                <Images className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  Approved QR Proof Gallery
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                    10 Images per Folder
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect date-wise approved payment receipt screenshots categorized by QR codes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.history.pushState({ tab: 'qr_gallery' }, '', '/qr-gallery');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Open Proof Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* CHANNEL PARTNER (DISTRIBUTOR / SUPER DISTRIBUTOR) STATS CARDS */}
      {isChannelPartner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Downline Approved Volume</p>
              <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{approvedCount} Settled Payment(s)</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Approvals</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Under Admin Verification</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                {isSuperDistributor ? 'Your Commission (MS)' : 'Your Commission (DS)'}
              </p>
              <p className="text-xl font-bold text-purple-300 mt-1 font-mono">
                ₹{totalCommissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-purple-400/80 mt-0.5">Earned from Downline Loads</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT REQUESTS HISTORY TABLE (ADMIN, CHANNEL PARTNER, & USER) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        
        {/* TABLE SEARCH & FILTER HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                {isAdmin 
                  ? 'All User QR Payment Requests' 
                  : isChannelPartner 
                  ? 'Downline QR Payment Requests History' 
                  : 'My Payment Requests History'}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {filteredRequests.length}{filteredRequests.length !== requestsList.length ? ` / ${requestsList.length}` : ''}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isChannelPartner
                  ? 'Real-time record of all QR wallet reload requests made across your downstream retailers'
                  : 'Filter by date range, UTR number, or transaction status'}
              </p>
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* FILTERS BAR */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Date Range Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2 font-medium"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Time</option>
                <option value="TODAY" className="bg-slate-900 text-slate-200">Today</option>
                <option value="YESTERDAY" className="bg-slate-900 text-slate-200">Yesterday</option>
                <option value="LAST_7_DAYS" className="bg-slate-900 text-slate-200">Last 7 Days</option>
                <option value="LAST_30_DAYS" className="bg-slate-900 text-slate-200">Last 30 Days</option>
                <option value="THIS_MONTH" className="bg-slate-900 text-slate-200">This Month</option>
                <option value="CUSTOM" className="bg-slate-900 text-slate-200">Custom Range</option>
              </select>
            </div>

            {/* Custom Range Inputs (when dateFilter === 'CUSTOM') */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 font-mono"
                />
                <span className="text-[11px] text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            )}

            {/* UTR Number Filter Input */}
            <div className="relative min-w-[180px] sm:w-52">
              <Hash className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by UTR No..."
                value={utrFilter}
                onChange={(e) => setUtrFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
              {utrFilter && (
                <button
                  type="button"
                  onClick={() => setUtrFilter('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="rejected" className="bg-slate-900">Rejected</option>
            </select>

            {/* Admin & Channel Partner Search Bar (User, Firm, QR, Mobile) */}
            {(isAdmin || isChannelPartner) && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search user, firm, mobile..." : "Search downline retailer, firm, mobile..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">User & Firm</th>
                <th className="p-4">Mobile Number</th>
                <th className="p-4">QR Name</th>
                <th className="p-4">12-Digit UTR</th>
                <th className="p-4">Requested Amt</th>
                <th className="p-4">Charge (%)</th>
                {(isAdmin || isDistributor) && (
                  <th className="p-4 text-amber-400">{isDistributor ? 'Your Comm (DS)' : 'DS Comm'}</th>
                )}
                {(isAdmin || isSuperDistributor) && (
                  <th className="p-4 text-indigo-300">{isSuperDistributor ? 'Your Comm (MS)' : 'MS Comm'}</th>
                )}
                {isAdmin && <th className="p-4 text-emerald-400">Admin Comm</th>}
                <th className="p-4">Net Credit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions / Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 13 : isChannelPartner ? 11 : 10} className="p-8 text-center text-slate-500">
                    Loading QR payment requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 13 : isChannelPartner ? 11 : 10} className="p-8 text-center text-slate-500">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* DATE & TIME (1ST COLUMN) */}
                    <td className="p-4 whitespace-nowrap">
                      {r.created_at ? (
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="font-bold text-slate-200">
                            {new Date(r.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">N/A</span>
                      )}
                    </td>

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

                    {/* DS COMMISSION (ADMIN OR DISTRIBUTOR) */}
                    {(isAdmin || isDistributor) && (
                      <td className="p-4 font-mono font-bold text-amber-400">
                        +₹{Number(r.distributor_commission || 0).toFixed(2)}
                      </td>
                    )}

                    {/* MS COMMISSION (ADMIN OR SUPER DISTRIBUTOR) */}
                    {(isAdmin || isSuperDistributor) && (
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

      {/* REJECTION REASON MODAL (z-[60] so it appears on top of preview modal) */}
      {rejectingReq && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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

      {/* RICH SCREENSHOT PREVIEW & VERIFICATION MODAL */}
      {previewScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div 
            className="relative w-full max-w-5xl xl:max-w-6xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="px-5 py-3.5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Images className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white truncate">
                      Payment Receipt & Request Verification
                    </h3>
                    {previewRequest && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        previewRequest.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        previewRequest.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {previewRequest.status}
                      </span>
                    )}
                  </div>
                  {previewRequest && (
                    <p className="text-xs text-slate-400 truncate">
                      UTR: <span className="font-mono text-slate-200 font-bold">{previewRequest.utr_number}</span> • Amount: <span className="font-bold text-white">₹{Number(previewRequest.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* TOP HEADER CONTROLS */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="text-[11px] font-mono text-slate-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL BODY (SPLIT 2 COLUMNS ON LG) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: INTERACTIVE ZOOMABLE & DRAGGABLE IMAGE VIEWER */}
              <div 
                className={`${previewRequest ? 'lg:col-span-7' : 'lg:col-span-12'} h-full flex flex-col bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 relative select-none overflow-hidden`}
              >
                {/* INTERACTIVE STAGE */}
                <div 
                  className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={handleResetZoom}
                  title="Scroll to Zoom • Click & Drag to Move • Double click to Reset"
                >
                  <img
                    src={previewScreenshot}
                    alt="Payment Screenshot Receipt"
                    draggable={false}
                    className="max-h-[82%] max-w-[85%] object-contain rounded-xl shadow-2xl pointer-events-none select-none border border-slate-800"
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.12s ease-out'
                    }}
                  />

                  {/* FLOATING HELPER TIP */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 pointer-events-none flex items-center gap-1.5 shadow-lg">
                    <Move className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scroll to Zoom • Drag to Move • Double-click to Reset</span>
                  </div>

                  {/* FLOATING CONTROLS BAR (BOTTOM) */}
                  <div className="absolute bottom-3 inset-x-0 mx-auto w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl z-10">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-200 px-2 min-w-[50px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-750 mx-1" />
                    <button
                      onClick={handleRotate}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                      title="Reset Zoom & Position"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-750 mx-1" />
                    <a
                      href={previewScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                      title="Open Original Image in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: REQUEST DETAILS & VERIFICATION ACTIONS */}
              {previewRequest && (
                <div className="lg:col-span-5 h-full flex flex-col bg-slate-900 overflow-hidden">
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">

                    {/* 1. FINANCIAL SUMMARY CARD */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Breakdown</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-300">Requested Amount:</span>
                        <span className="text-xl font-black text-white font-mono">
                          ₹{Number(previewRequest.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">QR Charge ({previewRequest.charge_percent || 0.5}%):</span>
                        <span className="text-rose-400 font-mono font-bold">
                          -₹{Number(previewRequest.charge_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                        <span className="font-extrabold text-emerald-400">Net Wallet Credit:</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          ₹{Number(previewRequest.net_amount || (previewRequest.amount - (previewRequest.charge_amount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* 2. TRANSACTION IDENTIFICATION CARD */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Transaction Info</p>
                      
                      {/* UTR NUMBER WITH 1-CLICK COPY */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank UTR / Ref No</span>
                          <span className="font-mono font-black text-indigo-300 text-sm tracking-wide select-all truncate block">
                            {previewRequest.utr_number}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyModalUtr(previewRequest.utr_number)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedModalUtr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedModalUtr ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Assigned QR:</span>
                        <span className="font-bold text-white">{previewRequest.qr_name || 'Primary QR'}</span>
                      </div>
                      {previewRequest.upi_id && (
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Target UPI ID:</span>
                          <span className="font-mono text-slate-300">{previewRequest.upi_id}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Request Date & Time:</span>
                        <span className="font-mono text-slate-300">
                          {new Date(previewRequest.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </span>
                      </div>
                    </div>

                    {/* 3. RETAILER PROFILE CARD */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">User / Retailer Details</p>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">User Name:</span>
                        <span className="font-bold text-white">{previewRequest.user_name || 'Retailer'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Firm Name:</span>
                        <span className="font-bold text-slate-200">{previewRequest.firm_name || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Registered Mobile:</span>
                        <span className="font-mono text-indigo-300 font-bold">{previewRequest.mobile_number}</span>
                      </div>
                    </div>

                    {/* 4. ADMIN COMMISSION (IF ADMIN) */}
                    {isAdmin && (
                      <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">Platform Commission</p>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Admin Commission:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            +₹{Number(
                              previewRequest.admin_commission !== undefined
                                ? previewRequest.admin_commission
                                : Math.max(0, (previewRequest.charge_amount || 0) - ((previewRequest.distributor_commission || 0) + (previewRequest.super_distributor_commission || 0)))
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* REJECTION REASON IF REJECTED */}
                    {previewRequest.status === 'rejected' && previewRequest.rejection_reason && (
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejection Reason</p>
                        <p className="text-rose-200 mt-1">{previewRequest.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* MODAL BOTTOM ACTION BAR */}
                  <div className="p-4 bg-slate-950/95 border-t border-slate-800 shrink-0">
                    {isAdmin && previewRequest.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          disabled={processingId === previewRequest.id}
                          onClick={async () => {
                            await handleProcessRequest(previewRequest.id, 'approved');
                            setPreviewRequest(prev => prev ? { ...prev, status: 'approved' } : null);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{processingId === previewRequest.id ? 'Approving...' : `Approve (₹${Number(previewRequest.amount).toLocaleString('en-IN')})`}</span>
                        </button>

                        <button
                          disabled={processingId === previewRequest.id}
                          onClick={() => setRejectingReq(previewRequest)}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject Request</span>
                        </button>
                      </div>
                    ) : previewRequest.status === 'approved' ? (
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                        <span>Approved & Credited: ₹{Number(previewRequest.net_amount || (previewRequest.amount - (previewRequest.charge_amount || 0))).toFixed(2)} to wallet.</span>
                      </div>
                    ) : previewRequest.status === 'rejected' ? (
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                        <span>This payment request was Rejected.</span>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-400">
                        Status: <strong className="text-amber-400 uppercase">{previewRequest.status}</strong>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

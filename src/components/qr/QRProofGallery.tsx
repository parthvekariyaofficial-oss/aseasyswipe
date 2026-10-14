import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  Image as ImageIcon,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  Hash,
  ExternalLink,
  Layers
} from 'lucide-react';
import { qrApi } from '../../services/api';
import type { QrDateSummary, QrGroupSummary, QrProofGalleryItem } from '../../types/qr';

export const QRProofGallery: React.FC = () => {
  // Summary & metadata state
  const [datesSummary, setDatesSummary] = useState<QrDateSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Selected QR & Batch state
  const [selectedQrId, setSelectedQrId] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<number>(1);

  // Images state (current 10-image batch)
  const [images, setImages] = useState<QrProofGalleryItem[]>([]);
  const [totalImages, setTotalImages] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);

  // Lightbox / Gallery Modal state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Helper: Get today's date in IST YYYY-MM-DD
  const getTodayIstString = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch {
      return new Date().toISOString().substring(0, 10);
    }
  };

  // Helper: Get yesterday's date in IST YYYY-MM-DD
  const getYesterdayIstString = () => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    } catch {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().substring(0, 10);
    }
  };

  // Fetch summary on mount
  const fetchSummary = useCallback(async (preferredDate?: string) => {
    setLoadingSummary(true);
    try {
      const res = await qrApi.getGallerySummary();
      if (res && res.success) {
        const summaries: QrDateSummary[] = res.dates_summary || [];
        setDatesSummary(summaries);

        // Pick initial selected date
        if (preferredDate) {
          setSelectedDate(preferredDate);
        } else if (summaries.length > 0) {
          // If today exists in summary, choose it; else choose latest date
          const today = getTodayIstString();
          const matchToday = summaries.find(s => s.date === today);
          setSelectedDate(matchToday ? matchToday.date : summaries[0].date);
        } else {
          setSelectedDate(getTodayIstString());
        }
      }
    } catch (err) {
      console.error('Error fetching gallery summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch images whenever date, selected QR, or batch changes
  const fetchImages = useCallback(async (date: string, qrId: string, batch: number) => {
    if (!date) return;
    setLoadingImages(true);
    try {
      const res = await qrApi.getGalleryImages({
        date,
        qr_master_id: qrId === 'all' ? undefined : qrId,
        batch
      });
      if (res && res.success) {
        setImages(res.images || []);
        setTotalImages(res.total_images || 0);
        setTotalBatches(res.total_batches || 0);
      } else {
        setImages([]);
        setTotalImages(0);
        setTotalBatches(0);
      }
    } catch (err) {
      console.error('Error fetching gallery images:', err);
      setImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchImages(selectedDate, selectedQrId, selectedBatch);
    }
  }, [selectedDate, selectedQrId, selectedBatch, fetchImages]);

  // Find the summary object for the currently selected date
  const currentDaySummary = datesSummary.find(s => s.date === selectedDate);
  const activeQrBreakdown = currentDaySummary ? currentDaySummary.qr_breakdown : [];

  // Copy UTR helper
  const handleCopyUtr = (utr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images.length]);

  const activeLightboxItem = lightboxIndex !== null && images[lightboxIndex] ? images[lightboxIndex] : null;

  const todayStr = getTodayIstString();
  const yesterdayStr = getYesterdayIstString();

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved Payments Only
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" /> 10 Images per Folder
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <ImageIcon className="w-8 h-8 text-purple-400" />
              Approved QR Proof Gallery
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Date-wise & QR Name-wise verified payment screenshots. Check how much payment was approved in each QR code.
            </p>
          </div>

          {/* DATE SELECTOR & REFRESH */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl shrink-0">
            {/* Quick Pills */}
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                setSelectedBatch(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedDate === todayStr
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => {
                setSelectedDate(yesterdayStr);
                setSelectedBatch(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedDate === yesterdayStr
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              Yesterday
            </button>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white">
              <Calendar className="w-4 h-4 text-purple-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedBatch(1);
                }}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchSummary(selectedDate);
                fetchImages(selectedDate, selectedQrId, selectedBatch);
              }}
              disabled={loadingSummary || loadingImages}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSummary || loadingImages ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* DATE SUMMARY TOTAL METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" /> Selected Date
            </span>
            <p className="text-sm sm:text-base font-black text-white font-mono mt-1">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-emerald-500/20 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Total Approved Vol.
            </span>
            <p className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1">
              ₹{(currentDaySummary?.total_approved_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
              <Hash className="w-3 h-3 text-indigo-400" /> Approved Txns
            </span>
            <p className="text-sm sm:text-base font-black text-white font-mono mt-1">
              {currentDaySummary?.total_approved_count || 0} Payments
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Proof Screenshots
            </span>
            <p className="text-sm sm:text-base font-black text-purple-300 font-mono mt-1">
              {currentDaySummary?.total_screenshots || 0} Receipts
            </p>
          </div>

        </div>

      </div>

      {/* SECTION 1: QR NAME-WISE APPROVED PAYMENT BREAKDOWN (કયા QR માં કેટલું payment approve થયું) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              QR-Wise Approved Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Select a QR code below to inspect its approved payment volume and 10-image folders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedQrId('all');
                setSelectedBatch(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedQrId === 'all'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> All QR Codes
            </button>
          </div>
        </div>

        {activeQrBreakdown.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">No approved QR payments recorded for this date.</p>
            <p className="text-xs text-slate-600 mt-1">Try selecting another date from the calendar above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeQrBreakdown.map((qrItem: QrGroupSummary, idx: number) => {
              const isSelected = selectedQrId === (qrItem.qr_master_id || 'system_qr');
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedQrId(qrItem.qr_master_id || 'system_qr');
                    setSelectedBatch(1);
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-900 border-purple-500 shadow-xl shadow-purple-950/50 ring-2 ring-purple-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Bar: QR Name & UPI ID */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> QR Name
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-0.5">
                        {qrItem.qr_name}
                      </h3>
                      {qrItem.upi_id && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                          {qrItem.upi_id}
                        </p>
                      )}
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isSelected ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {qrItem.total_count} Approved
                    </span>
                  </div>

                  {/* Metrics: Approved Amount & Proofs */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Approved Volume</span>
                      <p className="text-lg font-black text-emerald-400 font-mono">
                        ₹{qrItem.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Proof Images</span>
                      <p className="text-lg font-black text-purple-300 font-mono flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        {qrItem.screenshot_count}
                      </p>
                    </div>
                  </div>

                  {/* Folder Batches (10 images per folder) */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                      Folders (10 Images per Folder):
                    </span>
                    {qrItem.batches_count === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">No receipt screenshots uploaded</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: qrItem.batches_count }).map((_, bIdx) => {
                          const batchNumber = bIdx + 1;
                          const isBatchActive = isSelected && selectedBatch === batchNumber;
                          return (
                            <button
                              key={batchNumber}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQrId(qrItem.qr_master_id || 'system_qr');
                                setSelectedBatch(batchNumber);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                isBatchActive
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              <Folder className="w-3 h-3 text-purple-400" />
                              Folder {batchNumber} ({(batchNumber - 1) * 10 + 1}-{Math.min(batchNumber * 10, qrItem.screenshot_count)})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: 10-IMAGE FOLDER GRID (IMAGES IN CURRENT BATCH) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        
        {/* Grid Header & Batch Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-purple-400" />
              <h3 className="text-base sm:text-lg font-black text-white">
                Folder {selectedBatch} Screenshots ({images.length} of {totalImages} Images)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing approved payment proofs for: <strong className="text-white">{selectedQrId === 'all' ? 'All QR Codes' : (activeQrBreakdown.find(q => (q.qr_master_id || 'system_qr') === selectedQrId)?.qr_name || 'Selected QR')}</strong>
            </p>
          </div>

          {/* Batch Selector Pills */}
          {totalBatches > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-bold">Folder:</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button
                  disabled={selectedBatch <= 1}
                  onClick={() => setSelectedBatch(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalBatches }).map((_, bIdx) => {
                  const bNum = bIdx + 1;
                  return (
                    <button
                      key={bNum}
                      onClick={() => setSelectedBatch(bNum)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedBatch === bNum
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {bNum}
                    </button>
                  );
                })}

                <button
                  disabled={selectedBatch >= totalBatches}
                  onClick={() => setSelectedBatch(prev => Math.min(totalBatches, prev + 1))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loadingImages ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading proof screenshot batch...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-500 space-y-2">
            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-400">No screenshot images available in this folder.</p>
            <p className="text-xs text-slate-600">Either no approved payments have screenshots or none match this filter.</p>
          </div>
        ) : (
          /* Grid of 10 images */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((item: QrProofGalleryItem, index: number) => (
              <div
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="group bg-slate-950 border border-slate-800 hover:border-purple-500/80 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
              >
                {/* Image Container with Hover Overlay */}
                <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.screenshot_url}
                    alt={`Proof ${item.utr_number}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top Bar Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-mono font-bold text-white">
                      #{index + 1 + (selectedBatch - 1) * 10}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 shadow">
                      <Check className="w-3 h-3" /> Approved
                    </span>
                  </div>

                  {/* Hover Overlay Icon */}
                  <div className="absolute inset-0 bg-purple-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                    <div className="p-3 rounded-full bg-white text-slate-950 shadow-xl">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Open Gallery
                    </span>
                  </div>
                </div>

                {/* BOTTOM DETAILS: UTR & AMOUNT AS EXPLICITLY REQUESTED */}
                <div className="p-3.5 space-y-2 bg-slate-950 border-t border-slate-800/80 flex-1 flex flex-col justify-between">
                  
                  {/* AMOUNT (LARGE & BOLD) */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
                      <p className="text-base font-black text-emerald-400 font-mono">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Time</span>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                      </span>
                    </div>
                  </div>

                  {/* UTR NUMBER (WITH 1-CLICK COPY) */}
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-1">
                    <div className="truncate">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">12-Digit UTR</span>
                      <span className="text-xs font-mono font-bold text-white tracking-wider truncate block">
                        {item.utr_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyUtr(item.utr_number, e)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0 cursor-pointer"
                      title="Copy UTR Number"
                    >
                      {copiedUtr === item.utr_number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* USER & QR INFO */}
                  <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-slate-900">
                    <span className="font-semibold text-slate-300">{item.user_name}</span>
                    {item.firm_name && item.firm_name !== 'N/A' && (
                      <span className="text-slate-500"> ({item.firm_name})</span>
                    )}
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* FULLSCREEN LIGHTBOX / IMAGE GALLERY VIEW (SLIDER MODAL) */}
      {lightboxIndex !== null && activeLightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black">
                Image {lightboxIndex + 1} of {images.length}
              </span>
              <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                {activeLightboxItem.qr_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1">
                <Check className="w-3 h-3" /> Approved
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeLightboxItem.screenshot_url}
                target="_blank"
                rel="noreferrer"
                download={`receipt_${activeLightboxItem.utr_number}.png`}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Download / Open Original"
              >
                <Download className="w-4 h-4" />
              </a>

              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition cursor-pointer"
                title="Close Gallery (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Middle Stage: Image & Left/Right Navigation */}
          <div
            className="flex-1 flex items-center justify-between p-4 sm:p-8 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              onClick={() => setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1))}
              className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:bg-purple-600 text-white transition-all shadow-2xl cursor-pointer shrink-0 z-20"
              title="Previous Image (← Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>

            {/* Central Screenshot Image */}
            <div className="max-h-[68vh] max-w-2xl w-full flex items-center justify-center p-2">
              <img
                src={activeLightboxItem.screenshot_url}
                alt={`Proof ${activeLightboxItem.utr_number}`}
                className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800 select-none"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0))}
              className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:bg-purple-600 text-white transition-all shadow-2xl cursor-pointer shrink-0 z-20"
              title="Next Image (→ Right Arrow)"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>

          {/* Bottom Bar: UTR and Amount Info Card as Requested */}
          <div
            className="p-4 sm:p-6 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              
              {/* UTR & Amount Details */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                
                {/* AMOUNT */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Amount</span>
                  <p className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{activeLightboxItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* UTR */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">12-Digit UTR Number</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-black font-mono text-white tracking-widest bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                      {activeLightboxItem.utr_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(activeLightboxItem.utr_number)}
                      className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                    >
                      {copiedUtr === activeLightboxItem.utr_number ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* USER & QR */}
                <div className="hidden md:block">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">User / Firm</span>
                  <p className="text-sm font-bold text-white">
                    {activeLightboxItem.user_name}
                    {activeLightboxItem.firm_name && activeLightboxItem.firm_name !== 'N/A' && (
                      <span className="text-slate-400 font-normal"> ({activeLightboxItem.firm_name})</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{activeLightboxItem.mobile_number}</p>
                </div>

              </div>

              {/* Timestamp & Keyboard Hint */}
              <div className="text-right text-xs text-slate-400">
                <span className="block font-mono text-slate-300">
                  {activeLightboxItem.created_at ? new Date(activeLightboxItem.created_at).toLocaleString('en-IN') : ''}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Use ⬅️ and ➡️ keys to navigate images
                </span>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};

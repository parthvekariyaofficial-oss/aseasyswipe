import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { qrApi, billRequestApi, b2bApi, payoutApi } from '../../services/api';
import type { QrPaymentRequest } from '../../types/qr';
import type { CreditCardBillRequest } from '../../types/billRequest';
import type { PayoutTransaction } from '../../types/payout';
import { 
  ShieldCheck, User, Store, Phone, CheckCircle2, 
  ArrowUpRight, RefreshCw, Coins, Zap, CreditCard, Receipt, 
  ArrowRightLeft, IndianRupee, Calendar, RotateCcw, Filter, QrCode
} from 'lucide-react';

export const RetailerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [billRequestsList, setBillRequestsList] = useState<CreditCardBillRequest[]>([]);
  const [liveHistoryList, setLiveHistoryList] = useState<any[]>([]);
  const [payoutTxnsList, setPayoutTxnsList] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State (Default: TODAY as requested)
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [reqRes, billRes, b2bRes, payoutRes] = await Promise.all([
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        b2bApi.getHistory().catch(() => ({ status: 'error', data: [] })),
        payoutApi.getHistory().catch(() => ({ success: false, transactions: [] }))
      ]);

      if (reqRes.success && reqRes.payment_requests) {
        setRequestsList(reqRes.payment_requests);
      }
      if (billRes.success && billRes.requests) {
        setBillRequestsList(billRes.requests);
      }
      if (b2bRes && (b2bRes.status === 'success' || b2bRes.success) && Array.isArray(b2bRes.data)) {
        setLiveHistoryList(b2bRes.data);
      }
      if (payoutRes.success && Array.isArray(payoutRes.transactions)) {
        setPayoutTxnsList(payoutRes.transactions);
      }
    } catch (err) {
      console.error('Fetch User Dashboard Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Helper to check if a record matches the selected date filter
  const isWithinDateFilter = (createdAt?: string | null) => {
    if (dateFilter === 'ALL') return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    const t = d.getTime();
    if (isNaN(t)) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    if (dateFilter === 'TODAY') {
      return t >= startOfToday && t <= endOfToday;
    } else if (dateFilter === 'YESTERDAY') {
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const endOfYesterday = startOfToday - 1;
      return t >= startOfYesterday && t <= endOfYesterday;
    } else if (dateFilter === 'LAST_7_DAYS') {
      const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
      return t >= startOf7Days && t <= endOfToday;
    } else if (dateFilter === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      return t >= startOfMonth && t <= endOfToday;
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
      return true;
    }
    return true;
  };

  // 1 & 2: QR Add Money (Approved requests & charges)
  const filteredQrRequests = requestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedQrRequests = filteredQrRequests.filter(r => r.status === 'approved');
  const totalApprovedQrAmount = approvedQrRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalQrCharges = approvedQrRequests.reduce((acc, r) => {
    const charge = r.charge_amount !== undefined 
      ? Number(r.charge_amount) 
      : (Number(r.amount || 0) * (Number(r.charge_percent || 0.5) / 100));
    return acc + charge;
  }, 0);

  // 3 & 4: Offline Credit Card Bill (Volume & Charges)
  const filteredBillRequests = billRequestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedBillRequests = filteredBillRequests.filter(r => r.status === 'approved');
  const totalCcBillVolume = approvedBillRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalCcBillCharges = approvedBillRequests.reduce((acc, r) => acc + Number(r.service_charge || 0), 0);

  // 5 & 6: Live BBPS Bill Pay (Volume & Charges)
  const filteredLiveHistory = liveHistoryList.filter(r => isWithinDateFilter(r.created_at || r.createdAt || r.date || r.timestamp));
  const successfulLivePayments = filteredLiveHistory.filter(r => r.status === 'success' || r.status === 'approved');
  const totalLiveBillVolume = successfulLivePayments.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalLiveBillCharges = successfulLivePayments.reduce((acc, r) => {
    return acc + Number(r.service_charge || r.charge_amount || r.charge || 0);
  }, 0);

  // 7 & 8: Instant Payout (Volume & Charges)
  const filteredPayoutTxns = payoutTxnsList.filter(t => isWithinDateFilter(t.created_at || (t as any).createdAt));
  const successfulPayouts = filteredPayoutTxns.filter(t => t.status === 'success');
  const totalPayoutVolume = successfulPayouts.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalPayoutCharges = successfulPayouts.reduce((acc, t) => acc + Number(t.slab_charge || 0), 0);

  // Calculate First Name & Middle Name only for greeting
  const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
  const displayName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : (user?.name || 'Retailer');

  return (
    <div className="space-y-6 w-full pb-10 animate-in fade-in duration-300">
      {/* CLEAN HEADER GREETING (NO BOX BG) */}
      <div className="space-y-1 pt-1">
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider inline-block">
          Retailer Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Welcome, {displayName}
        </h1>
      </div>


      {/* SECTION HEADER & TOP-RIGHT CORNER FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Performance & Volume Metrics
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                {dateFilter === 'TODAY' && 'Today'}
                {dateFilter === 'YESTERDAY' && 'Yesterday'}
                {dateFilter === 'LAST_7_DAYS' && 'Last 7 Days'}
                {dateFilter === 'THIS_MONTH' && 'This Month'}
                {dateFilter === 'ALL' && 'All Time'}
                {dateFilter === 'CUSTOM' && 'Custom Range'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Aggregated live business metrics across your services</p>
          </div>
        </div>

        {/* Top Right Corner Date Range Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs transition shadow-sm">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1 font-semibold"
            >
              <option value="TODAY" className="bg-slate-900 text-slate-200">Today</option>
              <option value="YESTERDAY" className="bg-slate-900 text-slate-200">Yesterday</option>
              <option value="LAST_7_DAYS" className="bg-slate-900 text-slate-200">Last 7 Days</option>
              <option value="THIS_MONTH" className="bg-slate-900 text-slate-200">This Month</option>
              <option value="ALL" className="bg-slate-900 text-slate-200">All Time</option>
              <option value="CUSTOM" className="bg-slate-900 text-slate-200">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs animate-in fade-in">
              <span className="text-[11px] text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-400 font-mono"
              />
              <span className="text-[11px] text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          )}

          {/* Reset button if not TODAY */}
          {dateFilter !== 'TODAY' && (
            <button
              onClick={() => {
                setDateFilter('TODAY');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition border border-slate-700 shadow-sm"
              title="Reset filter to Today"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Refresh Data button */}
          <button
            onClick={fetchUserData}
            disabled={loading}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 8 PRIMARY USER STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* CARD 1: APPROVED QR PAYMENT */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-emerald-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-emerald-400 tracking-wider">Approved QR Payment</span>
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalApprovedQrAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{approvedQrRequests.length} Approved Requests</span>
          </div>
        </div>

        {/* CARD 2: QR CHARGES */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-indigo-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-indigo-400 tracking-wider">QR Charges</span>
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalQrCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-indigo-300/80 font-medium">
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>QR Add Money Fees</span>
          </div>
        </div>

        {/* CARD 3: TOTAL CC BILL VOLUME */}
        <div className="bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-cyan-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-cyan-300 tracking-wider">Total CC Bill Volume</span>
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalCcBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-cyan-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>{approvedBillRequests.length} Settled Requests</span>
          </div>
        </div>

        {/* CARD 4: TOTAL CC BILL CHARGES */}
        <div className="bg-gradient-to-br from-pink-950/80 via-slate-900 to-slate-900 border border-pink-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-pink-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-pink-300 tracking-wider">Total CC Bill Charges</span>
            <div className="p-3 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalCcBillCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-pink-300/80 font-medium">
            <Coins className="w-3.5 h-3.5 text-pink-400" />
            <span>CC Bill Pay Fees</span>
          </div>
        </div>

        {/* CARD 5: LIVE BILL PAY VOLUME */}
        <div className="bg-gradient-to-br from-violet-950/80 via-slate-900 to-slate-900 border border-violet-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-violet-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-violet-300 tracking-wider">Live Bill Pay Volume</span>
            <div className="p-3 rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalLiveBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-violet-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />
            <span>{successfulLivePayments.length} Successful Payments</span>
          </div>
        </div>

        {/* CARD 6: LIVE BILL PAY CHARGES */}
        <div className="bg-gradient-to-br from-fuchsia-950/80 via-slate-900 to-slate-900 border border-fuchsia-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-fuchsia-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-fuchsia-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-fuchsia-300 tracking-wider">Live Bill Pay Charges</span>
            <div className="p-3 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalLiveBillCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-fuchsia-300/80 font-medium">
            <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Live BBPS Fees</span>
          </div>
        </div>

        {/* CARD 7: PAYOUT VOLUME */}
        <div className="bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border border-blue-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-blue-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-blue-300 tracking-wider">Payout Volume</span>
            <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalPayoutVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-blue-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            <span>{successfulPayouts.length} Settled Transfers</span>
          </div>
        </div>

        {/* CARD 8: PAYOUT CHARGES */}
        <div className="bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-900 border border-teal-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-teal-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-teal-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-teal-300 tracking-wider">Payout Charges</span>
            <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalPayoutCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-teal-300/80 font-medium">
            <Coins className="w-3.5 h-3.5 text-teal-400" />
            <span>Instant Payout Slabs Fees</span>
          </div>
        </div>

      </div>

      {/* ACCOUNT DETAILS CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" /> Account Security & Status Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</p>
            <p className="text-sm font-bold text-white">{user?.name}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Merchant Outlet</p>
            <p className="text-sm font-bold text-white">{user?.firm_name}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Registered Mobile</p>
            <p className="text-sm font-bold text-white font-mono">{user?.mobile_number}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">Account Status</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {user?.status || 'Active'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">KYC Status</p>
            <span className="inline-block px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
              {user?.kyc_status || 'Verified'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">Role Tier</p>
            <span className="inline-block px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

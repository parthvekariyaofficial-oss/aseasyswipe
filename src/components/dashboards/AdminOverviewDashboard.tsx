import React, { useState, useEffect } from 'react';
import { qrApi, userApi, billRequestApi, b2bApi, payoutApi } from '../../services/api';
import type { QrPaymentRequest } from '../../types/qr';
import type { UserProfile } from '../../types/auth';
import type { CreditCardBillRequest } from '../../types/billRequest';
import type { PayoutTransaction } from '../../types/payout';
import { UsePayBalanceWidget } from './UsePayBalanceWidget';
import { 
  CheckCircle2, ShieldCheck, Users, Building2, Wallet, 
  ArrowUpRight, Clock, RefreshCw, Coins, Award, Zap, CreditCard, Receipt,
  ArrowRightLeft, IndianRupee, Calendar, RotateCcw, Filter
} from 'lucide-react';

export const AdminOverviewDashboard: React.FC = () => {
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [billRequestsList, setBillRequestsList] = useState<CreditCardBillRequest[]>([]);
  const [liveHistoryList, setLiveHistoryList] = useState<any[]>([]);
  const [payoutTxnsList, setPayoutTxnsList] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State (Default: TODAY)
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, userRes, billRes, b2bRes, payoutRes] = await Promise.all([
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] })),
        userApi.getHierarchy().catch(() => ({ success: false, users: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        b2bApi.getHistory().catch(() => ({ status: 'error', data: [] })),
        payoutApi.getHistory().catch(() => ({ success: false, transactions: [] }))
      ]);

      if (reqRes.success && reqRes.payment_requests) {
        setRequestsList(reqRes.payment_requests);
      }
      if (userRes.success && userRes.users) {
        setUsersList(userRes.users);
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
      console.error('Fetch Overview Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // Filter QR requests with date filter
  const filteredQrRequests = requestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedRequests = filteredQrRequests.filter(r => r.status === 'approved');
  const pendingRequests = filteredQrRequests.filter(r => r.status === 'pending');

  // Filter offline bill requests with date filter
  const filteredBillRequests = billRequestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedBillRequests = filteredBillRequests.filter(r => r.status === 'approved');
  const pendingBillRequests = filteredBillRequests.filter(r => r.status === 'pending');

  // Filter live BBPS payments with date filter
  const filteredLiveHistory = liveHistoryList.filter(r => isWithinDateFilter(r.created_at || r.createdAt || r.date || r.timestamp));
  const successfulLivePayments = filteredLiveHistory.filter(r => r.status === 'success' || r.status === 'approved');

  // Filter payout transactions with date filter
  const filteredPayoutTxns = payoutTxnsList.filter(t => isWithinDateFilter(t.created_at || (t as any).createdAt));
  const successfulPayouts = filteredPayoutTxns.filter(t => t.status === 'success');
  const pendingPayouts = filteredPayoutTxns.filter(t => t.status === 'pending');

  // 1. Total Approved QR Amount
  const totalApprovedAmount = approvedRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  // 2. Total Admin QR Charge Commission
  const totalAdminCommission = approvedRequests.reduce((acc, r) => {
    const chargeAmt = r.charge_amount || (Number(r.amount) * (Number(r.charge_percent || 0.5) / 100));
    const dsComm = Number(r.distributor_commission || 0);
    const msComm = Number(r.super_distributor_commission || 0);
    const adminComm = r.admin_commission !== undefined 
      ? Number(r.admin_commission) 
      : Math.max(0, chargeAmt - (dsComm + msComm));
    return acc + adminComm;
  }, 0);

  // 3. Total Distributor Earning (DS)
  const totalDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.distributor_commission || 0);
  }, 0);

  // 4. Total Master Distributor Earning (MS)
  const totalMasterDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.super_distributor_commission || 0);
  }, 0);

  // 5. CC Bill Service Charges Breakdown (Offline + Live BBPS)
  const offlineBillServiceCharge = approvedBillRequests.reduce((acc, r) => acc + Number(r.service_charge || 0), 0);
  const liveBillServiceCharge = successfulLivePayments.reduce((acc, r) => acc + Number(r.service_charge || r.charge_amount || r.charge || 0), 0);
  const totalBillServiceCharge = offlineBillServiceCharge + liveBillServiceCharge;

  // 6. CC Bill Volume Breakdown (Offline + Live BBPS)
  const offlineBillVolume = approvedBillRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const liveBillVolume = successfulLivePayments.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalApprovedBillAmount = offlineBillVolume + liveBillVolume;

  // 7. Total Payout Volume
  const totalPayoutVolume = successfulPayouts.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 8. Total Payout Charges
  const totalPayoutCharges = successfulPayouts.reduce((acc, t) => acc + Number(t.slab_charge || 0), 0);

  // Platform wallet stats
  const totalSystemBalance = usersList.reduce((acc, u) => acc + Number(u.wallet_balance || 0), 0);
  const activeUserCount = usersList.filter(u => u.status === 'Active').length;

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
      
      {/* TOP HEADER & DATE RANGE FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Dashboard Metrics
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                {dateFilter === 'TODAY' && 'Today'}
                {dateFilter === 'YESTERDAY' && 'Yesterday'}
                {dateFilter === 'LAST_7_DAYS' && 'Last 7 Days'}
                {dateFilter === 'THIS_MONTH' && 'This Month'}
                {dateFilter === 'ALL' && 'All Time'}
                {dateFilter === 'CUSTOM' && 'Custom Range'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Filtered financial volumes and revenue reports</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 hover:border-purple-500/50 rounded-xl px-3 py-2 text-xs transition shadow-sm">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
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
            <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs animate-in fade-in">
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
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* USEPAY B2B AGENT API BALANCE INTEGRATION WIDGET */}
      <UsePayBalanceWidget />

      {/* ALL PRIMARY STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

        {/* CARD 1: TOTAL APPROVED QR AMOUNT */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-emerald-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-emerald-400 tracking-wider">Total Approved QR Amt</span>
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{approvedRequests.length} Successful QR Load(s)</span>
          </div>
        </div>

        {/* CARD 2: TOTAL ADMIN QR CHARGE COMMISSION */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-indigo-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-indigo-400 tracking-wider">Admin QR Commission</span>
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalAdminCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-indigo-300/80 font-medium">
            <Coins className="w-3.5 h-3.5 text-indigo-400" />
            <span>Net Platform Revenue Margin</span>
          </div>
        </div>

        {/* CARD 3: TOTAL DISTRIBUTOR EARNING - DS */}
        <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-amber-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-amber-400 tracking-wider">Distributor Earning (DS)</span>
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-300/80 font-medium">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Total DS Markup Payouts</span>
          </div>
        </div>

        {/* CARD 4: TOTAL MASTER DISTRIBUTOR EARNING - MS */}
        <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-purple-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-purple-400 tracking-wider">Master Dist Earning (MS)</span>
            <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalMasterDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-purple-300/80 font-medium">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Total MS Hierarchy Payouts</span>
          </div>
        </div>

        {/* CARD 5: TOTAL CC BILL SERVICE CHARGE (OFFLINE + LIVE BREAKDOWN) */}
        <div className="bg-gradient-to-br from-pink-950/80 via-slate-900 to-slate-900 border border-pink-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-pink-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-extrabold text-pink-300 tracking-wider">CC Bill Service Charge</span>
            <div className="p-3 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          
          {/* OFFLINE VS LIVE SERVICE CHARGE BREAKDOWN */}
          <div className="mt-4 pt-3 border-t border-pink-500/20 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-pink-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Offline Charges</p>
              <p className="font-bold font-mono text-pink-300 mt-0.5">
                ₹{offlineBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-pink-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Live BBPS Charges</p>
              <p className="font-bold font-mono text-emerald-400 mt-0.5">
                ₹{liveBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 6: TOTAL CC BILL VOLUME (OFFLINE + LIVE BREAKDOWN) */}
        <div className="bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-cyan-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-extrabold text-cyan-300 tracking-wider">Total CC Bill Volume</span>
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalApprovedBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {/* OFFLINE VS LIVE VOLUME BREAKDOWN */}
          <div className="mt-4 pt-3 border-t border-cyan-500/20 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-cyan-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Offline Volume</p>
              <p className="font-bold font-mono text-cyan-300 mt-0.5">
                ₹{offlineBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-cyan-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Live BBPS Volume</p>
              <p className="font-bold font-mono text-emerald-400 mt-0.5">
                ₹{liveBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 7: TOTAL PAYOUT VOLUME */}
        <div className="bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 border border-blue-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-blue-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-blue-300 tracking-wider">Total Payout Volume</span>
            <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalPayoutVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-blue-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            <span>{successfulPayouts.length} Settled Bank Transfer(s)</span>
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
            <span>Instant Transfer Slabs Revenue</span>
          </div>
        </div>

      </div>

      {/* SECONDARY PLATFORM METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {pendingRequests.length} QR / {pendingBillRequests.length} CC{pendingPayouts.length > 0 ? ` / ${pendingPayouts.length} Payout` : ''}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total User Live Wallet Balance</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              ₹{totalSystemBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Active Accounts</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{activeUserCount} / {usersList.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

    </div>
  );
};

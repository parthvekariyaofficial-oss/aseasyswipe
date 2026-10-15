import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import { 
  Clock, Search, RefreshCw, CheckCircle2, AlertCircle, 
  Receipt, Landmark, ShieldCheck, UserCheck, ArrowUpRight,
  X, RotateCcw, Activity, Zap, Check, Calendar, Filter,
  Building2, CreditCard
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * Safely extract the last 4 digits of the card number from the transaction item
 */
const getCardLast4 = (item: any): string => {
  if (!item) return '';

  if (item.card_last4) {
    const clean = String(item.card_last4).replace(/\D/g, '');
    if (clean.length >= 4) return clean.slice(-4);
    if (clean.length > 0) return clean;
    return String(item.card_last4).trim().slice(-4);
  }

  let params = item.customer_params || item.customerParams;
  if (typeof params === 'string') {
    try {
      params = JSON.parse(params);
    } catch {
      params = [];
    }
  }

  if (Array.isArray(params)) {
    // 1st Priority: Param name explicitly mentions card / credit / last 4
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    // 2nd Priority: Param name mentions account / number (excluding mobile, phone, pan)
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      if (name.includes('account') || name.includes('acc') || name.includes('num')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    // 3rd Priority: Any 4-digit or 12-19 digit numeric param that is not 10-digit mobile
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      const digits = val.replace(/\D/g, '');
      if (digits.length === 4) return digits;
      if (digits.length >= 12 && digits.length <= 19 && digits.length !== 10) {
        return digits.slice(-4);
      }
    }
  } else if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      const name = k.toLowerCase();
      const val = String(v ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4') || name.includes('account')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }
  }

  const addInfo = item.additional_info || item.additionalInfo || item.biller_response_info || item.billerResponseInfo;
  if (addInfo) {
    const str = typeof addInfo === 'string' ? addInfo : JSON.stringify(addInfo);
    const cardMatch = str.match(/card[^\d]*(\d{4})/i) || str.match(/account[^\d]*(\d{4})/i);
    if (cardMatch && cardMatch[1]) return cardMatch[1];
  }

  return '';
};

/**
 * Safely compute service charge according to official charge slabs
 */
export const getServiceCharge = (item: any): number => {
  const charge = Number(item?.service_charge ?? item?.charge_amount ?? item?.charge ?? 0);
  if (charge > 0) return charge;
  const amt = Number(item?.amount || 0);
  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  if (amt <= 150000) return 75;
  return 100;
};

export const AdminLiveBillPayHistory: React.FC = () => {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{
    item: any;
    data: any;
  } | null>(null);

  const { liveBillPayEnabled, toggleLiveBillPay, fetchSettings: fetchLiveBillSettings } = useSettingsStore();
  const [isTogglingLiveBill, setIsTogglingLiveBill] = useState(false);
  const [toggleAlert, setToggleAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAdminHistory = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await b2bApi.getHistory();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin live bill pay history:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminHistory(true);
    fetchLiveBillSettings();
    const interval = setInterval(() => {
      fetchAdminHistory(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveBillSettings]);

  const handleToggleLiveBill = async () => {
    setIsTogglingLiveBill(true);
    setToggleAlert(null);
    try {
      const res = await toggleLiveBillPay();
      if (res.success) {
        setToggleAlert({
          type: 'success',
          message: res.enabled 
            ? '✅ Live Bill Pay enabled! Retailer portal menu is now VISIBLE and route is ACCESSIBLE.' 
            : '🔒 Live Bill Pay disabled! Retailer portal menu is now HIDDEN and direct route URL is BLOCKED.'
        });
      } else {
        setToggleAlert({
          type: 'error',
          message: res.message || 'Failed to update Live Bill Pay toggle.'
        });
      }
    } catch (err: any) {
      setToggleAlert({
        type: 'error',
        message: err.message || 'An unexpected error occurred while toggling Live Bill Pay.'
      });
    } finally {
      setIsTogglingLiveBill(false);
    }
  };

  const handleCheckStatus = async (item: any) => {
    const txnId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
    if (!txnId) return;
    setCheckingStatusId(txnId);
    try {
      const res = await b2bApi.checkStatus(txnId);
      setStatusModal({
        item,
        data: res
      });
      fetchAdminHistory();
    } catch (err: any) {
      setStatusModal({
        item,
        data: {
          status: 'failed',
          payment_status: 'failed',
          message: err.response?.data?.message || err.message || 'Unable to check live transaction status'
        }
      });
    } finally {
      setCheckingStatusId(null);
    }
  };

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'all' ||
    dateFilter !== 'ALL' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Filter Logic
  const filteredHistory = historyList.filter(item => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
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

    // 2. Status Filter
    const itemStatus = (item.status || '').toLowerCase();
    const isSuccess = itemStatus === 'success' || itemStatus === 'approved';
    const isPending = itemStatus === 'pending';
    const isFailed = itemStatus === 'failed' || itemStatus === 'rejected';

    if (statusFilter === 'success' && !isSuccess) return false;
    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'failed' && !isFailed) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const card4 = getCardLast4(item);
      const matchesSearch = 
        (item.biller_name || '').toLowerCase().includes(q) ||
        (item.biller_id || '').toLowerCase().includes(q) ||
        (item.customer_name || '').toLowerCase().includes(q) ||
        (item.customer_mobile || '').toLowerCase().includes(q) ||
        (item.client_transaction_id || '').toLowerCase().includes(q) ||
        (item.bbps_txn_ref_id || '').toLowerCase().includes(q) ||
        (item.user_id || '').toLowerCase().includes(q) ||
        (item.firm_name || '').toLowerCase().includes(q) ||
        (item.user_name || '').toLowerCase().includes(q) ||
        card4.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalVolume = historyList
    .filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const successCount = historyList.filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved').length;
  const pendingCount = historyList.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const failedCount = historyList.filter(i => (i.status || '').toLowerCase() === 'failed' || (i.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      


      {/* TOP HEADER WITH LIVE BILL PAY TOGGLE SWITCH IN TOP RIGHT CORNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                LiveBillPay Monitoring & Gateway Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Monitor live BBPS transactions and control Retailer panel Live Bill Pay menu & route access
              </p>
            </div>
          </div>
        </div>

        {/* TOP RIGHT CORNER: TOGGLE SWITCH */}
        <div className="flex items-center self-end sm:self-auto gap-3.5 bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-2xl shadow-inner">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Zap className={`w-3.5 h-3.5 ${liveBillPayEnabled ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-500'}`} />
              <span className="text-xs font-black text-white">Live Bill Pay Menu</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                liveBillPayEnabled 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {liveBillPayEnabled ? 'ACTIVE / VISIBLE' : 'OFF / BLOCKED'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {liveBillPayEnabled 
                ? 'User panel menu is visible & route accessible' 
                : 'User menu is hidden & route URL blocked'}
            </p>
          </div>

          {/* TOGGLE BUTTON */}
          <button
            type="button"
            role="switch"
            aria-checked={liveBillPayEnabled}
            disabled={isTogglingLiveBill}
            onClick={handleToggleLiveBill}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-inner ${
              liveBillPayEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
            } ${isTogglingLiveBill ? 'opacity-70 cursor-not-allowed' : ''}`}
            title={liveBillPayEnabled ? 'Click to Turn OFF Live Bill Pay on User Panel' : 'Click to Turn ON Live Bill Pay on User Panel'}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center`}
            >
              {isTogglingLiveBill ? (
                <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
              ) : liveBillPayEnabled ? (
                <Check className="w-3 h-3 text-emerald-600 font-bold" />
              ) : (
                <X className="w-3 h-3 text-slate-500" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {toggleAlert && (
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          toggleAlert.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {toggleAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toggleAlert.message}</span>
          </div>
          <button onClick={() => setToggleAlert(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL VOLUME */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Live BBPS Volume</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">
            ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Approved Settlement Volume
          </p>
        </div>

        {/* SUCCESSFUL PAYMENTS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Successful Transactions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{successCount}</p>
          <p className="text-[11px] text-slate-400 font-medium">Completed via BBPS Gateway</p>
        </div>

        {/* PENDING TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending / Processing</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{pendingCount}</p>
          <p className="text-[11px] text-amber-400 font-medium">Processing at Biller Network</p>
        </div>

        {/* FAILED TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Failed / Rejected</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{failedCount}</p>
          <p className="text-[11px] text-rose-400 font-medium">Gateway Error / Network Rejection</p>
        </div>

      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Filter Records
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              {filteredHistory.length}{filteredHistory.length !== historyList.length ? ` / ${historyList.length}` : ''}
            </span>
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SEARCH BOX */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search User / Mobile / Biller / Txn ID / Ref ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DATE RANGE DROPDOWN */}
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

          {/* CUSTOM DATE RANGE INPUTS */}
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

          {/* STATUS DROPDOWN (CONVERTED FROM PILL BUTTONS) */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Records ({historyList.length})</option>
              <option value="success" className="bg-slate-900 text-slate-200">Success ({successCount})</option>
              <option value="pending" className="bg-slate-900 text-slate-200">Pending ({pendingCount})</option>
              <option value="failed" className="bg-slate-900 text-slate-200">Failed ({failedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* MASTER HISTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-400" />
            Showing {filteredHistory.length} Live Bill Pay Records
          </h2>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Merchant / Firm Name</th>
                  <th className="p-3.5">Biller Bank</th>
                  <th className="p-3.5">Card (Last 4)</th>
                  <th className="p-3.5">Customer Name & Mobile</th>
                  <th className="p-3.5">Bill Amount (₹)</th>
                  <th className="p-3.5">Charge (₹)</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Transaction Ref IDs</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistory.map((item, idx) => {
                  const itemId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
                  const isCheckingThis = checkingStatusId === itemId;
                  const cardLast4 = getCardLast4(item);

                  return (
                    <tr key={itemId || idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 text-slate-400 font-sans whitespace-nowrap">
                        {new Date(item.created_at || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-white text-xs flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{item.firm_name || 'Retailer Firm'}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.user_id || 'System User'}</span>
                            {item.user_name && item.user_name !== item.user_id && (
                              <span className="text-slate-500 font-sans text-[10px]">({item.user_name})</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-white font-sans">{item.biller_name || item.biller_id}</p>
                        <span className="text-[10px] text-indigo-400 font-mono">{item.biller_id}</span>
                      </td>
                      <td className="p-3.5 font-sans whitespace-nowrap">
                        {cardLast4 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 font-mono text-xs font-bold tracking-wider shadow-sm">
                            <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            •••• {cardLast4}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">•••• ----</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <p className="font-bold text-white">{item.customer_name || 'VALUED CARD HOLDER'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.customer_mobile || item.mobile}</p>
                      </td>
                      <td className="p-3.5 font-black text-white text-xs font-mono">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-bold text-pink-400 text-xs font-mono">
                        +₹{getServiceCharge(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {item.status === 'success' || item.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Success
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        <p className="text-slate-300 font-bold">{item.client_transaction_id || item.id}</p>
                        {item.bbps_txn_ref_id && (
                          <p className="text-emerald-400 text-[10px]">BBPS: {item.bbps_txn_ref_id}</p>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <button
                          onClick={() => handleCheckStatus(item)}
                          disabled={isCheckingThis}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isCheckingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <Activity className="w-3.5 h-3.5 text-purple-200" />
                              <span>Check Status</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No live credit card bill pay records found matching your filters.
          </div>
        )}
      </div>

      {/* LIVE STATUS RESULT MODAL */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Live Biller Status Check</h3>
                  <p className="text-[11px] text-slate-400">Direct query response from UsePay BBPS Biller Network</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const resData = statusModal.data?.data || statusModal.data || {};
              const mainStatus = (statusModal.data?.status || resData.status || resData.current_status || 'unknown').toLowerCase();
              const isSuccess = mainStatus === 'success';
              const isPending = mainStatus === 'pending';
              const isFailed = mainStatus === 'failed';

              return (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    isSuccess 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : isPending 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                    {isPending && <Clock className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />}
                    {isFailed && <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        {isSuccess && 'Payment Confirmed by Biller (HTTP 200)'}
                        {isPending && 'Processing at Biller (HTTP 202)'}
                        {isFailed && 'Payment Failed / Auto-Refunded'}
                      </h4>
                      <p className="text-xs font-mono mt-0.5 opacity-90">
                        BBPS Status: <span className="font-bold">{resData.bbps_status || resData.current_status || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Failure / Refund Info Message */}
                  {(resData.message || resData.refund_status) && (
                    <div className="bg-rose-950/30 border border-rose-800/40 p-3.5 rounded-2xl text-xs space-y-1">
                      {resData.message && <p className="text-rose-200 font-medium">{resData.message}</p>}
                      {resData.refund_status && (
                        <div className="flex items-center gap-2 text-rose-400 font-bold pt-1 font-mono">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund Status: {resData.refund_status}</span>
                          {resData.refunded_amount && (
                            <span className="text-white"> (₹{resData.refunded_amount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transaction Details Grid */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-xs font-mono space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Merchant / Firm:</span>
                      <span className="font-bold text-white font-sans text-right">
                        {statusModal.item.firm_name ? `${statusModal.item.firm_name} (${statusModal.item.user_id})` : (statusModal.item.user_id || 'N/A')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Card (Last 4):</span>
                      <span className="font-bold text-purple-300 font-mono">
                        {getCardLast4(statusModal.item) ? `•••• ${getCardLast4(statusModal.item)}` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Biller:</span>
                      <span className="font-bold text-white font-sans">{statusModal.item.biller_name || statusModal.item.biller_id}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Customer / Card Holder:</span>
                      <span className="font-bold text-white font-sans">{statusModal.item.customer_name || 'VALUED CARD HOLDER'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Amount:</span>
                      <span className="font-black text-emerald-400 text-sm">₹{Number(statusModal.item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Service Charge (Slab):</span>
                      <span className="font-bold text-pink-400 font-mono">+₹{getServiceCharge(statusModal.item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Total Deducted:</span>
                      <span className="font-black text-white font-mono">₹{(Number(statusModal.item.amount || 0) + getServiceCharge(statusModal.item)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Client Txn ID:</span>
                      <span className="font-bold text-slate-200">{resData.client_transaction_id || statusModal.item.client_transaction_id || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">BBPS Txn Ref ID:</span>
                      <span className="font-bold text-indigo-300">{resData.bbps_txn_ref_id || resData.transaction_id || statusModal.item.bbps_txn_ref_id || 'N/A'}</span>
                    </div>

                    {resData.approval_ref_number && (
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400 font-sans">Approval Ref No:</span>
                        <span className="font-bold text-emerald-300">{resData.approval_ref_number}</span>
                      </div>
                    )}

                    {resData.polled_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-sans">Polled At:</span>
                        <span className="text-slate-400 text-[11px]">{new Date(resData.polled_at).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStatusModal(null)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
              >
                Close & Refresh
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


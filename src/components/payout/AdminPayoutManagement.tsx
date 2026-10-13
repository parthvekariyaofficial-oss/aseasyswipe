import React, { useState, useEffect } from 'react';
import { payoutApi } from '../../services/api';
import type { PayoutSlab, PayoutTransaction } from '../../types/payout';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import {
  Layers, Plus, Trash2, Edit2, CheckCircle2,
  AlertTriangle, RefreshCw, Clock, Search,
  ExternalLink, Building2, Check, Copy, Percent, IndianRupee,
  Sliders, ShieldCheck, ArrowRightLeft, X, AlertCircle,
  Calendar, RotateCcw, Filter
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const AdminPayoutManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'slabs'>('transactions');

  const { instantPayoutEnabled, toggleInstantPayout, fetchSettings: fetchPayoutSettings } = useSettingsStore();
  const [isTogglingPayout, setIsTogglingPayout] = useState<boolean>(false);
  const [toggleAlert, setToggleAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Slabs State
  const [slabs, setSlabs] = useState<PayoutSlab[]>([]);
  const [slabsLoading, setSlabsLoading] = useState<boolean>(false);
  const [showSlabModal, setShowSlabModal] = useState<boolean>(false);
  const [editingSlab, setEditingSlab] = useState<PayoutSlab | null>(null);

  // Slab Form
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [chargeType, setChargeType] = useState<'flat' | 'percentage'>('flat');
  const [chargeValue, setChargeValue] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [slabModalError, setSlabModalError] = useState<string>('');
  const [savingSlab, setSavingSlab] = useState<boolean>(false);

  // Transactions State
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [txnsLoading, setTxnsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Receipt Modal
  const [receiptTxn, setReceiptTxn] = useState<PayoutTransaction | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // Fetch Slabs
  const fetchSlabs = async () => {
    setSlabsLoading(true);
    try {
      const res = await payoutApi.getSlabs();
      if (res.success && Array.isArray(res.slabs)) {
        setSlabs(res.slabs);
      }
    } catch (err) {
      console.error('Fetch slabs error:', err);
    } finally {
      setSlabsLoading(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async () => {
    setTxnsLoading(true);
    try {
      const res = await payoutApi.getHistory();
      if (res.success && Array.isArray(res.transactions)) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setTxnsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSlabs();
    fetchPayoutSettings();
  }, [fetchPayoutSettings]);

  const handleTogglePayout = async () => {
    setIsTogglingPayout(true);
    setToggleAlert(null);
    try {
      const res = await toggleInstantPayout();
      if (res.success) {
        setToggleAlert({
          type: 'success',
          message: res.enabled
            ? '✅ Instant Payout enabled! User panel menu is now VISIBLE and route is ACCESSIBLE.'
            : '🔒 Instant Payout disabled! User panel menu is now HIDDEN and direct route URL is BLOCKED.'
        });
      } else {
        setToggleAlert({
          type: 'error',
          message: res.message || 'Failed to update Instant Payout toggle.'
        });
      }
    } catch (err: any) {
      setToggleAlert({
        type: 'error',
        message: err.message || 'An unexpected error occurred while toggling Instant Payout.'
      });
    } finally {
      setIsTogglingPayout(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const openAddSlabModal = () => {
    setEditingSlab(null);
    setMinAmount('');
    setMaxAmount('');
    setChargeType('flat');
    setChargeValue('');
    setIsActive(true);
    setSlabModalError('');
    setShowSlabModal(true);
  };

  const openEditSlabModal = (slab: PayoutSlab) => {
    setEditingSlab(slab);
    setMinAmount(String(slab.min_amount));
    setMaxAmount(String(slab.max_amount));
    setChargeType(slab.charge_type);
    setChargeValue(String(slab.charge_value));
    setIsActive(slab.is_active);
    setSlabModalError('');
    setShowSlabModal(true);
  };

  const handleSaveSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlabModalError('');

    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const val = parseFloat(chargeValue);

    if (isNaN(min) || isNaN(max) || isNaN(val) || min < 0 || max <= min || val < 0) {
      setSlabModalError('Please enter valid numeric values. Max amount must be greater than min amount.');
      return;
    }

    setSavingSlab(true);
    try {
      if (editingSlab) {
        const res = await payoutApi.updateSlab(editingSlab.id, {
          min_amount: min,
          max_amount: max,
          charge_type: chargeType,
          charge_value: val,
          is_active: isActive
        });
        if (res.success) {
          setShowSlabModal(false);
          fetchSlabs();
        } else {
          setSlabModalError(res.message || 'Failed to update slab');
        }
      } else {
        const res = await payoutApi.createSlab({
          min_amount: min,
          max_amount: max,
          charge_type: chargeType,
          charge_value: val,
          is_active: isActive
        });
        if (res.success) {
          setShowSlabModal(false);
          fetchSlabs();
        } else {
          setSlabModalError(res.message || 'Failed to create slab');
        }
      }
    } catch (err: any) {
      setSlabModalError(err.response?.data?.message || err.message || 'Failed to save slab');
    } finally {
      setSavingSlab(false);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payout slab?')) return;
    try {
      const res = await payoutApi.deleteSlab(id);
      if (res.success) {
        fetchSlabs();
      }
    } catch (err: any) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCheckStatus = async (orderId: string) => {
    setCheckingOrderId(orderId);
    try {
      const res = await payoutApi.checkStatus(orderId);
      if (res.success) {
        fetchTransactions();
      }
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setCheckingOrderId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const isAnyFilterActive = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'all' ||
    dateFilter !== 'ALL' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const filteredTxns = transactions.filter((t) => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      const time = d.getTime();
      if (isNaN(time)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (dateFilter === 'TODAY') {
        if (time < startOfToday || time > endOfToday) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (time < startOfYesterday || time > endOfYesterday) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (time < startOf7Days || time > endOfToday) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (time < startOf30Days || time > endOfToday) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (time < startOfMonth || time > endOfToday) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const [sY, sM, sD] = customStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (time < startTime) return false;
        }
        if (customEndDate) {
          const [eY, eM, eD] = customEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (time > endTime) return false;
        }
      }
    }

    // 2. Status Filter
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    if (!matchesStatus) return false;

    // 3. Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        (t.client_order_id || '').toLowerCase().includes(q) ||
        (t.utr || '').toLowerCase().includes(q) ||
        (t.beneficiary_name || '').toLowerCase().includes(q) ||
        (t.account_number || '').includes(q) ||
        (t.user_name || '').toLowerCase().includes(q) ||
        (t.firm_name || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const successTxnCount = transactions.filter(t => t.status === 'success').length;
  const pendingTxnCount = transactions.filter(t => t.status === 'pending').length;
  const failedTxnCount = transactions.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* TOP HEADER WITH INSTANT PAYOUT TOGGLE SWITCH IN TOP RIGHT CORNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Payout Slabs & Dynamic Transactions Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Manage dynamic commission/charge slabs and control User Portal Instant Payout menu & route access
              </p>
            </div>
          </div>
        </div>

        {/* TOP RIGHT CORNER: TOGGLE SWITCH */}
        <div className="flex items-center self-end sm:self-auto gap-3.5 bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-2xl shadow-inner">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <ArrowRightLeft className={`w-3.5 h-3.5 ${instantPayoutEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-xs font-black text-white">Instant Payout Menu</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                instantPayoutEnabled 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {instantPayoutEnabled ? 'ACTIVE / VISIBLE' : 'OFF / BLOCKED'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {instantPayoutEnabled 
                ? 'User panel menu is visible & route accessible' 
                : 'User menu is hidden & route URL blocked'}
            </p>
          </div>

          {/* TOGGLE BUTTON */}
          <button
            type="button"
            role="switch"
            aria-checked={instantPayoutEnabled}
            disabled={isTogglingPayout}
            onClick={handleTogglePayout}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-inner ${
              instantPayoutEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
            } ${isTogglingPayout ? 'opacity-70 cursor-not-allowed' : ''}`}
            title={instantPayoutEnabled ? 'Click to Turn OFF Instant Payout on User Panel' : 'Click to Turn ON Instant Payout on User Panel'}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center`}
            >
              {isTogglingPayout ? (
                <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
              ) : instantPayoutEnabled ? (
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

      {/* TOP CONTROL BAR: TABS & ACTION BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Payout Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'slabs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" /> Dynamic Slabs ({slabs.length})
          </button>
        </div>

        {/* ACTION BUTTON */}
        <div className="flex items-center gap-2">
          {activeTab === 'slabs' && (
            <button
              onClick={openAddSlabModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Slab
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SLABS MANAGEMENT */}
      {activeTab === 'slabs' && (
        <div className="space-y-6">
          
          {/* Main Slabs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Active Payout Charge Slabs
              </h2>
              <span className="text-xs text-slate-400">
                Applied automatically when user requests payout
              </span>
            </div>

            {slabsLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading payout slabs...
              </div>
            ) : slabs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-300">No payout slabs configured yet</p>
                <p className="text-[11px] text-slate-500">Click "Create New Slab" to add your first charge slab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <th className="py-3 px-4">Slab Range (Min - Max)</th>
                      <th className="py-3 px-4">Charge Calculation</th>
                      <th className="py-3 px-4">Charge Value</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {slabs.map((slab) => (
                      <tr key={slab.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          ₹{Number(slab.min_amount).toLocaleString('en-IN')} - ₹{Number(slab.max_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {slab.charge_type === 'percentage' ? (
                              <><Percent className="w-3 h-3" /> Percentage (%)</>
                            ) : (
                              <><IndianRupee className="w-3 h-3" /> Flat Fee (₹)</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-amber-400 text-sm">
                          {slab.charge_type === 'percentage' ? `${slab.charge_value}%` : `₹${slab.charge_value.toFixed(2)}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            slab.is_active !== false
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" /> {slab.is_active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => openEditSlabModal(slab)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit Slab"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlab(slab.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Slab"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" /> All Bank Payout Transactions
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredTxns.length}{filteredTxns.length !== transactions.length ? ` / ${transactions.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Real-time settlement history of merchant bank transfers</p>
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, UTR, account..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-slate-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
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

            {/* Custom Date Inputs */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
                <span className="text-[11px] text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>
            )}

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Status ({transactions.length})</option>
                <option value="success" className="bg-slate-900 text-slate-200">Success ({successTxnCount})</option>
                <option value="pending" className="bg-slate-900 text-slate-200">Pending ({pendingTxnCount})</option>
                <option value="failed" className="bg-slate-900 text-slate-200">Failed / Refunded ({failedTxnCount})</option>
              </select>
            </div>
          </div>

          {txnsLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading payout transactions...
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">No matching transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Merchant User</th>
                    <th className="py-3 px-4">Beneficiary & Bank</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Slab Fee</th>
                    <th className="py-3 px-4">Total Debited</th>
                    <th className="py-3 px-4">Bank UTR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTxns.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.user_name || 'Merchant'}</div>
                        <div className="text-[11px] text-slate-400">{item.firm_name || item.user_mobile}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.beneficiary_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.account_number} • <span className="text-indigo-400">{item.ifsc_code}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-black text-white">
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-amber-400 font-bold">
                        ₹{Number(item.slab_charge || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-200">
                        ₹{Number(item.total_deducted || item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.utr ? (
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                            <span>{item.utr}</span>
                            <button
                              onClick={() => copyToClipboard(item.utr || '', item.id)}
                              className="text-slate-500 hover:text-white"
                              title="Copy UTR"
                            >
                              {copiedUtr === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.status}
                        </span>
                        {item.refunded_to_wallet && (
                          <span className="block text-[10px] text-emerald-400 mt-0.5">Refunded</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleCheckStatus(item.client_order_id)}
                            disabled={checkingOrderId === item.client_order_id}
                            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Verify Bank Status"
                          >
                            {checkingOrderId === item.client_order_id ? 'Checking...' : 'Check Status'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setReceiptTxn(item);
                            setShowReceipt(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT SLAB MODAL */}
      {showSlabModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                {editingSlab ? 'Edit Payout Slab' : 'Create New Payout Slab'}
              </h3>
              <button
                onClick={() => setShowSlabModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {slabModalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {slabModalError}
              </div>
            )}

            <form onSubmit={handleSaveSlab} className="space-y-4">
              
              {/* Range Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Max Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Charge Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Charge Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeType('flat')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      chargeType === 'flat'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flat Fee (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeType('percentage')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      chargeType === 'percentage'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Percentage (%)
                  </button>
                </div>
              </div>

              {/* Charge Value Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Charge Value ({chargeType === 'percentage' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={chargeValue}
                  onChange={(e) => setChargeValue(e.target.value)}
                  placeholder={chargeType === 'percentage' ? 'e.g. 0.50' : 'e.g. 15.00'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="slabActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="slabActive" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Activate this slab immediately
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSlabModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlab}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {savingSlab ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Slab'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <PayoutReceiptModal
        transaction={receiptTxn}
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
      />

    </div>
  );
};

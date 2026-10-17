import React, { useState, useEffect } from 'react';
import { payoutApi } from '../../services/api';
import type { PayoutSlab, PayoutTransaction, PayoutVerification, VerificationStats } from '../../types/payout';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import {
  Layers, Plus, Trash2, Edit2, CheckCircle2,
  AlertTriangle, RefreshCw, Clock, Search,
  ExternalLink, Building2, Check, Copy, Percent, IndianRupee,
  Sliders, ShieldCheck, ArrowRightLeft, X, AlertCircle,
  Calendar, RotateCcw, Filter, Save, UserCheck, CheckCheck
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const AdminPayoutManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'verifications' | 'slabs'>('transactions');

  const { instantPayoutEnabled, toggleInstantPayout, fetchSettings: fetchPayoutSettings } = useSettingsStore();
  const [isTogglingPayout, setIsTogglingPayout] = useState<boolean>(false);
  const [toggleAlert, setToggleAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bank Verifications (Penny Drop) State
  const [verifications, setVerifications] = useState<PayoutVerification[]>([]);
  const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);
  const [verificationsLoading, setVerificationsLoading] = useState<boolean>(false);
  const [verifSearchTerm, setVerifSearchTerm] = useState<string>('');
  const [verifStatusFilter, setVerifStatusFilter] = useState<string>('all');
  const [verifDateFilter, setVerifDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [verifCustomStartDate, setVerifCustomStartDate] = useState<string>('');
  const [verifCustomEndDate, setVerifCustomEndDate] = useState<string>('');

  // Verification Settings State
  const [payoutVerificationCharge, setPayoutVerificationCharge] = useState<number>(5.00);
  const [payoutVerificationGatewayCost, setPayoutVerificationGatewayCost] = useState<number>(3.00);
  const [payoutVerificationEnabled, setPayoutVerificationEnabled] = useState<boolean>(true);
  const [savingVerifSettings, setSavingVerifSettings] = useState<boolean>(false);

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

  // Reconciliation Modal & Action Feedback State
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [reconcileTxn, setReconcileTxn] = useState<PayoutTransaction | null>(null);
  const [reconcileAction, setReconcileAction] = useState<'mark_success' | 'mark_failed'>('mark_success');
  const [reconcileUtr, setReconcileUtr] = useState<string>('');
  const [reconcileNote, setReconcileNote] = useState<string>('');
  const [reconcileLoading, setReconcileLoading] = useState<boolean>(false);
  const [reconcileError, setReconcileError] = useState<string>('');
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Bank Status Modal State
  const [showLiveStatusModal, setShowLiveStatusModal] = useState<boolean>(false);
  const [liveBankResult, setLiveBankResult] = useState<any>(null);
  const [directQueryInput, setDirectQueryInput] = useState<string>('');
  const [directQueryLoading, setDirectQueryLoading] = useState<boolean>(false);

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
  const fetchTransactions = async (isInitial = false) => {
    if (isInitial) setTxnsLoading(true);
    try {
      const res = await payoutApi.getHistory();
      if (res.success && Array.isArray(res.transactions)) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      if (isInitial) setTxnsLoading(false);
    }
  };

  // Fetch Verifications (Penny Drop)
  const fetchVerifications = async (isInitial = false) => {
    if (isInitial) setVerificationsLoading(true);
    try {
      const res = await payoutApi.getAdminVerifications();
      if (res.success && Array.isArray(res.verifications)) {
        setVerifications(res.verifications);
        setVerificationStats(res.stats || null);
      }
    } catch (err) {
      console.error('Fetch verifications error:', err);
    } finally {
      if (isInitial) setVerificationsLoading(false);
    }
  };

  // Fetch Payout & Verification Settings
  const fetchPayoutGlobalSettings = async () => {
    try {
      const res = await payoutApi.getSettings();
      if (res.success && res.settings) {
        if (res.settings.payout_verification_charge !== undefined) {
          setPayoutVerificationCharge(Number(res.settings.payout_verification_charge));
        }
        if (res.settings.payout_verification_gateway_cost !== undefined) {
          setPayoutVerificationGatewayCost(Number(res.settings.payout_verification_gateway_cost));
        }
        if (res.settings.payout_verification_enabled !== undefined) {
          setPayoutVerificationEnabled(Boolean(res.settings.payout_verification_enabled));
        }
      }
    } catch (err) {
      console.error('Fetch payout settings error:', err);
    }
  };

  const handleSaveVerifSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingVerifSettings(true);
    try {
      const res = await payoutApi.updateSettings({
        payout_verification_charge: Number(payoutVerificationCharge),
        payout_verification_gateway_cost: Number(payoutVerificationGatewayCost),
        payout_verification_enabled: Boolean(payoutVerificationEnabled)
      });
      if (res.success) {
        setActionAlert({
          type: 'success',
          message: `✅ Penny Drop Verification settings saved: ₹${Number(payoutVerificationCharge).toFixed(2)} user fee, ₹${Number(payoutVerificationGatewayCost).toFixed(2)} wholesale cost (${payoutVerificationEnabled ? 'Active' : 'Disabled'}).`
        });
      } else {
        setActionAlert({
          type: 'error',
          message: res.message || 'Failed to save verification settings'
        });
      }
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error saving verification settings'
      });
    } finally {
      setSavingVerifSettings(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
    fetchVerifications(true);
    fetchSlabs();
    fetchPayoutSettings();
    fetchPayoutGlobalSettings();
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
      fetchTransactions(false);
      const interval = setInterval(() => {
        fetchTransactions(false);
      }, 3500);
      return () => clearInterval(interval);
    } else if (activeTab === 'verifications') {
      fetchVerifications(false);
      const interval = setInterval(() => {
        fetchVerifications(false);
      }, 4000);
      return () => clearInterval(interval);
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
    if (!orderId) return;
    setCheckingOrderId(orderId);
    setActionAlert(null);
    try {
      const res = await payoutApi.checkStatus(orderId);
      if (res.success && res.data) {
        setLiveBankResult({
          query_id: orderId,
          data: res.data,
          localRecord: res.localRecord,
          message: res.message
        });
        setShowLiveStatusModal(true);
        fetchTransactions();
      } else {
        setActionAlert({
          type: 'error',
          message: res.message || 'Unable to update status from bank gateway.'
        });
      }
    } catch (err: any) {
      console.error('Check status error:', err);
      setActionAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error checking status from bank gateway.'
      });
    } finally {
      setCheckingOrderId(null);
    }
  };

  const handleDirectQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = directQueryInput.trim();
    if (!id) return;
    setDirectQueryLoading(true);
    await handleCheckStatus(id);
    setDirectQueryLoading(false);
  };

  const handleOpenReconcile = (txn: PayoutTransaction) => {
    setReconcileTxn(txn);
    setReconcileAction('mark_success');
    setReconcileUtr(txn.utr || '');
    setReconcileNote('');
    setReconcileError('');
    setShowReconcileModal(true);
  };

  const handleExecuteReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTxn) return;
    setReconcileLoading(true);
    setReconcileError('');
    try {
      const res = await payoutApi.reconcile(reconcileTxn.id, {
        action: reconcileAction,
        utr_number: reconcileUtr.trim() || undefined,
        note: reconcileNote.trim() || undefined
      });
      if (res.success) {
        setShowReconcileModal(false);
        setActionAlert({
          type: 'success',
          message: res.message || 'Transaction reconciled successfully.'
        });
        fetchTransactions();
      } else {
        setReconcileError(res.message || 'Reconciliation failed.');
      }
    } catch (err: any) {
      setReconcileError(err.response?.data?.message || err.message || 'Failed to reconcile transaction.');
    } finally {
      setReconcileLoading(false);
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

  const isAnyVerifFilterActive = Boolean(
    verifSearchTerm.trim() ||
    verifStatusFilter !== 'all' ||
    verifDateFilter !== 'ALL' ||
    verifCustomStartDate ||
    verifCustomEndDate
  );

  const handleClearVerifFilters = () => {
    setVerifSearchTerm('');
    setVerifStatusFilter('all');
    setVerifDateFilter('ALL');
    setVerifCustomStartDate('');
    setVerifCustomEndDate('');
  };

  const filteredVerifications = verifications.filter((v) => {
    // 1. Date Filter
    if (verifDateFilter !== 'ALL') {
      if (!v.created_at) return false;
      const d = new Date(v.created_at);
      const time = d.getTime();
      if (isNaN(time)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (verifDateFilter === 'TODAY') {
        if (time < startOfToday || time > endOfToday) return false;
      } else if (verifDateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (time < startOfYesterday || time > endOfYesterday) return false;
      } else if (verifDateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (time < startOf7Days || time > endOfToday) return false;
      } else if (verifDateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (time < startOf30Days || time > endOfToday) return false;
      } else if (verifDateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (time < startOfMonth || time > endOfToday) return false;
      } else if (verifDateFilter === 'CUSTOM') {
        if (verifCustomStartDate) {
          const [sY, sM, sD] = verifCustomStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (time < startTime) return false;
        }
        if (verifCustomEndDate) {
          const [eY, eM, eD] = verifCustomEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (time > endTime) return false;
        }
      }
    }

    // 2. Status Filter
    if (verifStatusFilter !== 'all' && v.status !== verifStatusFilter) return false;

    // 3. Search Term
    if (verifSearchTerm.trim()) {
      const q = verifSearchTerm.trim().toLowerCase();
      const match =
        (v.account_number || '').includes(q) ||
        (v.ifsc_code || '').toLowerCase().includes(q) ||
        (v.name_at_bank || '').toLowerCase().includes(q) ||
        (v.bank_name || '').toLowerCase().includes(q) ||
        (v.user_name || '').toLowerCase().includes(q) ||
        (v.user_mobile || '').includes(q) ||
        (v.utr || '').toLowerCase().includes(q) ||
        (v.reference_id || '').toLowerCase().includes(q) ||
        (v.client_reference_id || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const successVerifsCount = verifications.filter(v => v.status === 'success').length;
  const failedVerifsCount = verifications.filter(v => v.status === 'failed').length;
  const totalVerifsFee = verifications.reduce((acc, curr) => acc + Number(curr.charge_deducted || 0), 0);
  const totalVerifsCost = verifications.reduce((acc, curr) => acc + (curr.status === 'success' ? Number(curr.gateway_charge !== undefined && curr.gateway_charge !== null ? curr.gateway_charge : payoutVerificationGatewayCost) : 0), 0);
  const totalVerifsProfit = Number((totalVerifsFee - totalVerifsCost).toFixed(2));

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
        </div>
      )}

      {/* ACTION FEEDBACK ALERT */}
      {actionAlert && (
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          actionAlert.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
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
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'verifications'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Bank Verifications ({verifications.length})
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

            {/* Direct Bank Status Query Input */}
            <form onSubmit={handleDirectQuery} className="flex items-center gap-1.5 bg-slate-950 border border-indigo-500/40 rounded-xl px-2.5 py-1.5 text-xs">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="text"
                value={directQueryInput}
                onChange={(e) => setDirectQueryInput(e.target.value)}
                placeholder="Query Order ID in Bank..."
                className="bg-transparent text-slate-200 text-xs focus:outline-none placeholder-slate-500 w-36 sm:w-48 font-mono"
              />
              <button
                type="submit"
                disabled={directQueryLoading || !directQueryInput.trim()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="Query Real-Time Bank Status & UTR"
              >
                {directQueryLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                <span>Check Bank</span>
              </button>
            </form>
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
                        <button
                          onClick={() => handleCheckStatus(item.client_order_id || item.api_order_id || '')}
                          disabled={checkingOrderId === (item.client_order_id || item.api_order_id)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Query live real-time status & UTR from bank gateway"
                        >
                          <RefreshCw className={`w-3 h-3 ${checkingOrderId === (item.client_order_id || item.api_order_id) ? 'animate-spin' : ''}`} />
                          {checkingOrderId === (item.client_order_id || item.api_order_id) ? 'Checking...' : 'Check Status'}
                        </button>
                        <button
                          onClick={() => handleOpenReconcile(item)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Reconcile Transaction"
                        >
                          <Sliders className="w-3 h-3" /> Reconcile
                        </button>
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

      {/* TAB 3: BANK ACCOUNT VERIFICATIONS (PENNY DROP) */}
      {activeTab === 'verifications' && (
        <div className="space-y-6">

          {/* TOP SETTINGS & MARGIN CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> NPCI Penny Drop API Configuration
                </div>
                <h3 className="text-lg font-black text-white">Bank Account Validation & Pricing Controls</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Validate beneficiary bank accounts and fetch real-time registered account holder names directly from the bank. 
                  Charges are deducted from the user's wallet <strong>ONLY upon successful verification</strong> (₹0 on failure).
                </p>
              </div>

              {/* Fee & Toggle Controls */}
              <form onSubmit={handleSaveVerifSettings} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    User Wallet Debit Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={payoutVerificationCharge}
                      onChange={(e) => setPayoutVerificationCharge(parseFloat(e.target.value) || 0)}
                      className="w-28 pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-indigo-500 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Gateway Wholesale (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={payoutVerificationGatewayCost}
                      onChange={(e) => setPayoutVerificationGatewayCost(parseFloat(e.target.value) || 0)}
                      className="w-28 pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-indigo-500 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <span className="text-[10px] text-emerald-400 mb-1 font-bold">Platform Margin</span>
                  <div className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                    payoutVerificationCharge >= payoutVerificationGatewayCost
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {payoutVerificationCharge >= payoutVerificationGatewayCost ? '+' : ''}₹{(payoutVerificationCharge - payoutVerificationGatewayCost).toFixed(2)} <span className="text-[10px] font-normal">profit</span>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <span className="text-[10px] text-slate-400 mb-1">Service Status</span>
                  <button
                    type="button"
                    onClick={() => setPayoutVerificationEnabled(!payoutVerificationEnabled)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      payoutVerificationEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {payoutVerificationEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                    {payoutVerificationEnabled ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>

                <div className="flex flex-col justify-end pt-2 sm:pt-0">
                  <span className="text-[10px] text-transparent hidden sm:block mb-1">Save</span>
                  <button
                    type="submit"
                    disabled={savingVerifSettings}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {savingVerifSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Settings</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 5 METRIC CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-6">
              <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Total Verifications</span>
                <span className="text-xl font-black text-white font-mono">
                  {verificationStats?.total_verifications ?? verifications.length}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">All time attempts</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1">Successful (Penny Drop)</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {verificationStats?.success_count ?? successVerifsCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Active bank accounts</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-rose-400 block mb-1">Failed / Invalid</span>
                <span className="text-xl font-black text-rose-400 font-mono">
                  {verificationStats?.failed_count ?? failedVerifsCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">₹0 fee deducted</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-400 block mb-1">Total Collected</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  ₹{(verificationStats?.total_collected ?? totalVerifsFee).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">From user wallets</span>
              </div>

              <div className="bg-slate-950/70 border border-emerald-500/20 bg-emerald-500/[0.02] p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-300 block mb-1">Net Platform Profit</span>
                <span className="text-xl font-black text-emerald-300 font-mono">
                  ₹{(verificationStats?.net_profit ?? totalVerifsProfit).toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-500/80 block mt-0.5">After ₹{payoutVerificationGatewayCost.toFixed(2)}/verif cost</span>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Bank Verification History (Penny Drop)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                    {filteredVerifications.length}{filteredVerifications.length !== verifications.length ? ` / ${verifications.length}` : ''}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Complete audit log of real-time account name validations</p>
              </div>

              {isAnyVerifFilterActive && (
                <button
                  type="button"
                  onClick={handleClearVerifFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* FILTERS BAR */}
            <div className="flex flex-col lg:flex-row gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={verifSearchTerm}
                  onChange={(e) => setVerifSearchTerm(e.target.value)}
                  placeholder="Search by Merchant, Name, Account, IFSC, or UTR..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVerifStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    verifStatusFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({verifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerifStatusFilter('success')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    verifStatusFilter === 'success' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verified ({successVerifsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setVerifStatusFilter('failed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    verifStatusFilter === 'failed' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Failed ({failedVerifsCount})
                </button>
              </div>

              {/* Date Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'THIS_MONTH', 'CUSTOM'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVerifDateFilter(mode)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      verifDateFilter === mode ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Time' : mode === 'TODAY' ? 'Today' : mode === 'YESTERDAY' ? 'Yesterday' : mode === 'LAST_7_DAYS' ? '7 Days' : mode === 'THIS_MONTH' ? 'Month' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers */}
            {verifDateFilter === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-bold">Custom Range:</span>
                <input
                  type="date"
                  value={verifCustomStartDate}
                  onChange={(e) => setVerifCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={verifCustomEndDate}
                  onChange={(e) => setVerifCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
              </div>
            )}

            {/* Table */}
            {verificationsLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                Loading verification records...
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-300">No bank verification records found</p>
                <p className="text-[11px] text-slate-500">
                  {isAnyVerifFilterActive ? 'Try adjusting your filters.' : 'When users verify their bank accounts, verification logs will appear here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Merchant</th>
                      <th className="py-3 px-4">Account & IFSC</th>
                      <th className="py-3 px-4">Registered Name at Bank</th>
                      <th className="py-3 px-4">Bank & Branch</th>
                      <th className="py-3 px-4">Bank UTR / Ref</th>
                      <th className="py-3 px-4">Fee Deducted</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredVerifications.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(v.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{v.user_name || 'Merchant'}</div>
                          <div className="text-[11px] text-slate-400">{v.user_mobile || v.user_id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white">{v.account_number}</div>
                          <div className="text-[11px] text-indigo-400 font-mono font-bold">{v.ifsc_code}</div>
                        </td>
                        <td className="py-3 px-4">
                          {v.name_at_bank ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold uppercase text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              {v.name_at_bank}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Not retrieved</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-300">{v.bank_name || 'Bank'}</div>
                          {v.branch && <div className="text-[11px] text-slate-500">{v.branch}</div>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {v.utr || v.reference_id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-emerald-400 text-xs">
                                {v.utr || v.reference_id}
                              </span>
                              <button
                                onClick={() => copyToClipboard(v.utr || v.reference_id || '', v.id)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                                title="Copy UTR"
                              >
                                {copiedUtr === v.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">{v.client_reference_id || '—'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold">
                          {Number(v.charge_deducted || 0) > 0 ? (
                            <span className="text-amber-400 font-mono">₹{Number(v.charge_deducted).toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-500 font-mono">₹0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {v.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> Failed
                              </span>
                              {v.failure_reason && (
                                <p className="text-[10px] text-rose-400/80 max-w-xs truncate" title={v.failure_reason}>
                                  {v.failure_reason}
                                </p>
                              )}
                            </div>
                          )}
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

      {/* RECONCILE MODAL */}
      {showReconcileModal && reconcileTxn && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Manual Reconciliation</h3>
                  <p className="text-xs text-slate-400">Order: {reconcileTxn.client_order_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReconcileModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reconcileError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{reconcileError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteReconcile} className="space-y-4">
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Merchant:</span>
                  <span className="font-bold text-white">{reconcileTxn.user_name || reconcileTxn.user_mobile || 'Merchant'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Beneficiary:</span>
                  <span className="font-bold text-white">{reconcileTxn.beneficiary_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount:</span>
                  <span className="font-bold text-white">₹{Number(reconcileTxn.amount).toFixed(2)} (+ ₹{Number(reconcileTxn.slab_charge || 0).toFixed(2)} Fee)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Status:</span>
                  <span className="font-black uppercase tracking-wider text-amber-400">{reconcileTxn.status}</span>
                </div>
              </div>

              {/* Action Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Reconciliation Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReconcileAction('mark_success')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      reconcileAction === 'mark_success'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ✓ Mark as Success
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconcileAction('mark_failed')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      reconcileAction === 'mark_failed'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ✕ Mark as Failed & Refund
                  </button>
                </div>
              </div>

              {reconcileAction === 'mark_success' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Bank UTR / Reference RRN <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reconcileUtr}
                    onChange={(e) => setReconcileUtr(e.target.value)}
                    placeholder="Enter Bank UTR (e.g. 429011982736)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Marking as Success keeps merchant wallet funds debited and confirms bank settlement.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                  <p className="font-bold">Notice:</p>
                  <p className="text-[11px] mt-0.5">
                    Marking as failed will immediately refund ₹{Number(reconcileTxn.total_deducted || reconcileTxn.amount).toFixed(2)} back to merchant's wallet (if not already refunded).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Admin Note / Remarks <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="e.g. Verified with bank / UTR confirmed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconcileLoading}
                  className={`w-1/2 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer ${
                    reconcileAction === 'mark_success'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {reconcileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE BANK STATUS MODAL */}
      {showLiveStatusModal && liveBankResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Live Bank Gateway Status</h3>
                  <p className="text-xs text-slate-400 font-mono">Query: {liveBankResult.query_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveStatusModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Banner */}
            <div className="text-center py-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                String(liveBankResult.data?.status || '').toLowerCase() === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : String(liveBankResult.data?.status || '').toLowerCase() === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {String(liveBankResult.data?.status || '').toLowerCase() === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : String(liveBankResult.data?.status || '').toLowerCase() === 'failed' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4 animate-pulse" />
                )}
                {liveBankResult.data?.status || 'UNKNOWN'}
              </span>

              {liveBankResult.data?.utr && (
                <div className="pt-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Bank Reference / UTR</p>
                  <p className="text-lg font-black font-mono text-emerald-400 tracking-wider flex items-center justify-center gap-2">
                    {liveBankResult.data.utr}
                    <button
                      onClick={() => copyToClipboard(liveBankResult.data.utr, 'modal_utr')}
                      className="text-slate-400 hover:text-white p-1 rounded"
                      title="Copy UTR"
                    >
                      {copiedUtr === 'modal_utr' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Detail Grid */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs font-medium">
              {liveBankResult.data?.order_id && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Gateway Order ID:</span>
                  <span className="font-mono font-bold text-white">{liveBankResult.data.order_id}</span>
                </div>
              )}
              {liveBankResult.data?.client_order_id && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Client Order ID:</span>
                  <span className="font-mono font-bold text-indigo-300">{liveBankResult.data.client_order_id}</span>
                </div>
              )}
              {liveBankResult.data?.beneficiary_name && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Beneficiary:</span>
                  <span className="font-bold text-white uppercase">{liveBankResult.data.beneficiary_name}</span>
                </div>
              )}
              {liveBankResult.data?.account_number && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Bank Account & IFSC:</span>
                  <span className="font-mono font-bold text-white">{liveBankResult.data.account_number} • {liveBankResult.data.ifsc_code}</span>
                </div>
              )}
              {liveBankResult.data?.transfer_mode && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Transfer Mode:</span>
                  <span className="font-bold text-emerald-400">{liveBankResult.data.transfer_mode}</span>
                </div>
              )}
              {liveBankResult.data?.amount && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Amount / Fees:</span>
                  <span className="font-bold text-white">
                    ₹{Number(liveBankResult.data.amount).toFixed(2)}
                    {liveBankResult.data.fee ? ` (+ ₹${Number(liveBankResult.data.fee).toFixed(2)} fee)` : ''}
                  </span>
                </div>
              )}
              {liveBankResult.data?.created_at && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Bank Gateway Time:</span>
                  <span className="font-mono text-slate-300">{new Date(liveBankResult.data.created_at).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-1 flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Portal database has been synchronized with latest bank status.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              {liveBankResult.localRecord && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptTxn(liveBankResult.localRecord);
                    setShowReceipt(true);
                    setShowLiveStatusModal(false);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Full Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLiveStatusModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

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

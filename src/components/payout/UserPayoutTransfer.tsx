import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { payoutApi, userApi, authApi } from '../../services/api';
import type { PayoutTransaction, PayoutCalculation, PayoutBeneficiary, PayoutVerification, PayoutSlab } from '../../types/payout';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import {
  Wallet, ArrowRightLeft, ShieldCheck, CheckCircle2,
  Clock, AlertTriangle, Building2, User, Hash, Lock,
  RefreshCw, Check, Copy, ExternalLink, Zap, AlertCircle,
  Calendar, Search, Filter, RotateCcw, X, BookUser, Trash2, Send
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const UserPayoutTransfer: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { instantPayoutEnabled } = useSettingsStore();
  const [activeSubTab, setActiveSubTab] = useState<'transfer' | 'beneficiaries' | 'verifications' | 'history'>('transfer');

  // Saved Beneficiaries State
  const [beneficiaries, setBeneficiaries] = useState<PayoutBeneficiary[]>([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState<boolean>(false);
  const [selectedBenId, setSelectedBenId] = useState<string | null>(null);
  const [deletingBenId, setDeletingBenId] = useState<string | null>(null);
  const [benSearchTerm, setBenSearchTerm] = useState<string>('');

  // Bank Account Validation (Penny Drop) State
  const [userVerifications, setUserVerifications] = useState<PayoutVerification[]>([]);
  const [verifsLoading, setVerifsLoading] = useState<boolean>(false);
  const [verifyingAccount, setVerifyingAccount] = useState<boolean>(false);
  const [verificationAlert, setVerificationAlert] = useState<{ type: 'success' | 'error'; message: string; data?: any } | null>(null);
  const [isAccountVerified, setIsAccountVerified] = useState<boolean>(false);
  const [verifiedBankName, setVerifiedBankName] = useState<string>('');
  const [verifiedAccountName, setVerifiedAccountName] = useState<string>('');
  const [verifiedUtr, setVerifiedUtr] = useState<string>('');
  const [userVerifSearch, setUserVerifSearch] = useState<string>('');

  // Verification Settings State
  const [payoutVerificationCharge, setPayoutVerificationCharge] = useState<number>(5.00);
  const [payoutVerificationEnabled, setPayoutVerificationEnabled] = useState<boolean>(true);

  // Payout Charge Slabs State
  const [payoutSlabs, setPayoutSlabs] = useState<PayoutSlab[]>([]);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccount, setConfirmAccount] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [transferMode, setTransferMode] = useState<'IMPS' | 'NEFT'>('IMPS');

  // Live Charge Calculation State
  const [calculation, setCalculation] = useState<PayoutCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Confirmation Modal & Processing State with TPIN verification
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [tpin, setTpin] = useState<string>('');
  const [verifyingTpin, setVerifyingTpin] = useState<boolean>(false);
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const [refundNotice, setRefundNotice] = useState<string>('');

  // Receipt Modal
  const [receiptTxn, setReceiptTxn] = useState<PayoutTransaction | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // History State
  const [history, setHistory] = useState<PayoutTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // History Filter State
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState<string>('');
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState<string>('');

  const isAnyHistoryFilterActive = Boolean(
    historySearchTerm.trim() ||
    historyStatusFilter !== 'all' ||
    historyDateFilter !== 'ALL' ||
    historyCustomStartDate ||
    historyCustomEndDate
  );

  const handleClearHistoryFilters = () => {
    setHistorySearchTerm('');
    setHistoryStatusFilter('all');
    setHistoryDateFilter('ALL');
    setHistoryCustomStartDate('');
    setHistoryCustomEndDate('');
  };

  const filteredHistory = history.filter((item) => {
    // 1. Date Filter
    if (historyDateFilter !== 'ALL') {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      const time = d.getTime();
      if (isNaN(time)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (historyDateFilter === 'TODAY') {
        if (time < startOfToday || time > endOfToday) return false;
      } else if (historyDateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (time < startOfYesterday || time > endOfYesterday) return false;
      } else if (historyDateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (time < startOf7Days || time > endOfToday) return false;
      } else if (historyDateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (time < startOf30Days || time > endOfToday) return false;
      } else if (historyDateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (time < startOfMonth || time > endOfToday) return false;
      } else if (historyDateFilter === 'CUSTOM') {
        if (historyCustomStartDate) {
          const [sY, sM, sD] = historyCustomStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (time < startTime) return false;
        }
        if (historyCustomEndDate) {
          const [eY, eM, eD] = historyCustomEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (time > endTime) return false;
        }
      }
    }

    // 2. Status Filter
    const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter;
    if (!matchesStatus) return false;

    // 3. Search Query
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.trim().toLowerCase();
      const matchesSearch =
        (item.client_order_id || '').toLowerCase().includes(q) ||
        (item.utr || '').toLowerCase().includes(q) ||
        (item.beneficiary_name || '').toLowerCase().includes(q) ||
        (item.account_number || '').includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const successHistoryCount = history.filter(t => t.status === 'success').length;
  const pendingHistoryCount = history.filter(t => t.status === 'pending').length;
  const failedHistoryCount = history.filter(t => t.status === 'failed').length;

  // Debounced live calculation when amount changes
  const activePayoutSlabs = payoutSlabs.filter(s => s.is_active !== false);
  const minPayoutLimit = activePayoutSlabs.length > 0 ? Math.min(...activePayoutSlabs.map(s => Number(s.min_amount))) : 100;
  const maxPayoutLimit = activePayoutSlabs.length > 0 ? Math.max(...activePayoutSlabs.map(s => Number(s.max_amount))) : 200000;

  useEffect(() => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setCalculation(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const res = await payoutApi.calculateCharge(num);
        if (res.success) {
          setCalculation({
            amount: res.amount,
            charge_amount: res.charge_amount,
            total_deducted: res.total_deducted,
            slab: res.slab,
            valid: true,
            min_limit: res.min_limit,
            max_limit: res.max_limit
          });
          setFormError('');
        } else {
          setCalculation(null);
          setFormError(res.message || 'Amount is outside active slab bounds');
        }
      } catch (err: any) {
        setCalculation(null);
        const errorMsg = err.response?.data?.message || err.message || 'Amount is not within any active charge slab.';
        setFormError(errorMsg);
      } finally {
        setCalcLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [amount, minPayoutLimit, maxPayoutLimit]);

  // Fetch History
  const fetchHistory = async (isInitial = false) => {
    if (isInitial) setHistoryLoading(true);
    try {
      const res = await payoutApi.getHistory();
      if (res.success && Array.isArray(res.transactions)) {
        setHistory(res.transactions);
      }
    } catch (err) {
      console.error('Fetch payout history error:', err);
    } finally {
      if (isInitial) setHistoryLoading(false);
    }
  };

  // Fetch Beneficiaries
  const fetchBeneficiaries = async () => {
    setBeneficiariesLoading(true);
    try {
      const res = await payoutApi.getBeneficiaries();
      if (res.success && Array.isArray(res.beneficiaries)) {
        setBeneficiaries(res.beneficiaries);
      }
    } catch (err) {
      console.error('Fetch beneficiaries error:', err);
    } finally {
      setBeneficiariesLoading(false);
    }
  };

  // Fetch User Verification History
  const fetchUserVerifications = async () => {
    setVerifsLoading(true);
    try {
      const res = await payoutApi.getUserVerifications();
      if (res.success && Array.isArray(res.verifications)) {
        setUserVerifications(res.verifications);
      }
    } catch (err) {
      console.error('Fetch verifications error:', err);
    } finally {
      setVerifsLoading(false);
    }
  };

  // Fetch Global Settings
  const fetchSettings = async () => {
    try {
      const res = await payoutApi.getSettings();
      if (res.success && res.settings) {
        if (res.settings.payout_verification_charge !== undefined) {
          setPayoutVerificationCharge(Number(res.settings.payout_verification_charge));
        }
        if (res.settings.payout_verification_enabled !== undefined) {
          setPayoutVerificationEnabled(Boolean(res.settings.payout_verification_enabled));
        }
      }
    } catch {}
  };

  // Fetch Active Payout Slabs
  const fetchPayoutSlabs = async () => {
    try {
      const res = await payoutApi.getSlabs();
      if (res.success && Array.isArray(res.slabs)) {
        setPayoutSlabs(res.slabs);
      }
    } catch (e) {
      console.warn('Failed to fetch payout slabs:', e);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
    fetchUserVerifications();
    fetchSettings();
    fetchPayoutSlabs();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory(true);
      const interval = setInterval(() => {
        fetchHistory(false);
      }, 3500);
      return () => clearInterval(interval);
    } else if (activeSubTab === 'beneficiaries') {
      fetchBeneficiaries();
    } else if (activeSubTab === 'verifications') {
      fetchUserVerifications();
    }
  }, [activeSubTab]);

  // Handle Verify Bank Account (Penny Drop)
  const handleVerifyAccount = async () => {
    setVerificationAlert(null);
    const cleanAcc = accountNumber.trim();
    const cleanIfsc = ifscCode.trim().toUpperCase();

    if (!cleanAcc || cleanAcc.length < 8 || cleanAcc.length > 22 || !/^\d+$/.test(cleanAcc)) {
      setVerificationAlert({
        type: 'error',
        message: 'Please enter a valid 8 to 22 digit Bank Account Number before verifying.'
      });
      return;
    }

    if (!cleanIfsc || cleanIfsc.length !== 11 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setVerificationAlert({
        type: 'error',
        message: 'Please enter a valid 11-character IFSC Code (e.g. HDFC0001234) before verifying.'
      });
      return;
    }

    const bal = parseFloat(String(user?.wallet_balance || 0));
    if (bal < payoutVerificationCharge) {
      setVerificationAlert({
        type: 'error',
        message: `Insufficient Wallet Balance! Verification fee is ₹${payoutVerificationCharge.toFixed(2)}, but your current wallet balance is ₹${bal.toFixed(2)}.`
      });
      return;
    }

    setVerifyingAccount(true);
    try {
      const res = await payoutApi.verifyAccount({
        account_number: cleanAcc,
        ifsc_code: cleanIfsc
      });

      if (res.success && res.data) {
        const bankNameRetrieved = res.data.bank_name || '';
        const nameAtBank = res.data.name_at_bank || '';
        const utrNum = res.data.utr || res.data.reference_id || '';

        setBeneficiaryName(nameAtBank);
        setConfirmAccount(cleanAcc);
        if (bankNameRetrieved) setBankName(bankNameRetrieved);

        setIsAccountVerified(true);
        setVerifiedAccountName(nameAtBank);
        setVerifiedBankName(bankNameRetrieved);
        setVerifiedUtr(utrNum);

        setVerificationAlert({
          type: 'success',
          message: `✅ Verified with Bank! Registered Name: "${nameAtBank}". Fee of ₹${payoutVerificationCharge.toFixed(2)} deducted from your wallet.`,
          data: res.data
        });

        // Update user wallet balance in store
        try {
          const prof = await userApi.getProfile();
          if (prof.success && prof.user) updateUser(prof.user);
        } catch {}

        // Refresh saved beneficiaries & verifications
        fetchBeneficiaries();
        fetchUserVerifications();
      } else {
        setVerificationAlert({
          type: 'error',
          message: res.message || 'Bank account verification failed. ₹0 deducted.'
        });
        setIsAccountVerified(false);
      }
    } catch (err: any) {
      setVerificationAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Bank account verification failed. ₹0 deducted.'
      });
      setIsAccountVerified(false);
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleSelectBeneficiary = (b: PayoutBeneficiary) => {
    setSelectedBenId(b.id);
    setAccountNumber(b.account_number);
    setConfirmAccount(b.account_number);
    setIfscCode(b.ifsc_code);
    setBeneficiaryName(b.beneficiary_name);
    setBankName(b.bank_name || '');
    if (b.is_verified) {
      setIsAccountVerified(true);
      setVerifiedAccountName(b.beneficiary_name);
      setVerifiedBankName(b.bank_name || '');
      setVerifiedUtr('');
    } else {
      setIsAccountVerified(false);
    }
    setVerificationAlert(null);
    setActiveSubTab('transfer');
  };

  const handleDeleteBeneficiary = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this saved beneficiary?')) return;
    setDeletingBenId(id);
    try {
      const res = await payoutApi.deleteBeneficiary(id);
      if (res.success) {
        fetchBeneficiaries();
        if (selectedBenId === id) setSelectedBenId(null);
      }
    } catch (err) {
      console.error('Delete beneficiary error:', err);
    } finally {
      setDeletingBenId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    if (!benSearchTerm.trim()) return true;
    const q = benSearchTerm.trim().toLowerCase();
    return (
      (b.beneficiary_name || '').toLowerCase().includes(q) ||
      (b.account_number || '').includes(q) ||
      (b.ifsc_code || '').toLowerCase().includes(q) ||
      (b.bank_name || '').toLowerCase().includes(q)
    );
  });

  const filteredUserVerifications = userVerifications.filter((v) => {
    if (!userVerifSearch.trim()) return true;
    const q = userVerifSearch.trim().toLowerCase();
    return (
      (v.account_number || '').includes(q) ||
      (v.ifsc_code || '').toLowerCase().includes(q) ||
      (v.name_at_bank || '').toLowerCase().includes(q) ||
      (v.bank_name || '').toLowerCase().includes(q) ||
      (v.utr || '').toLowerCase().includes(q)
    );
  });

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid transfer amount.');
      return;
    }

    if (activePayoutSlabs.length > 0) {
      if (numAmount < minPayoutLimit) {
        setFormError(`Transfer amount ₹${numAmount.toLocaleString('en-IN')} cannot be less than minimum active slab limit of ₹${minPayoutLimit.toLocaleString('en-IN')}`);
        return;
      }
      if (numAmount > maxPayoutLimit) {
        setFormError(`Transfer amount ₹${numAmount.toLocaleString('en-IN')} cannot exceed maximum active slab limit of ₹${maxPayoutLimit.toLocaleString('en-IN')}`);
        return;
      }
    }

    if (!calculation || calculation.valid === false) {
      setFormError(`Transfer amount ₹${numAmount.toLocaleString('en-IN')} does not match any active payout slab.`);
      return;
    }

    const cleanAccount = accountNumber.trim();
    if (!cleanAccount || cleanAccount.length < 8 || cleanAccount.length > 22 || !/^\d+$/.test(cleanAccount)) {
      setFormError('Account Number must be between 8 and 22 digits.');
      return;
    }

    if (cleanAccount !== confirmAccount.trim()) {
      setFormError('Account Number and Confirmation Account Number do not match!');
      return;
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length !== 11 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setFormError('Invalid IFSC code! Must be 11 characters (e.g. HDFC0001234).');
      return;
    }

    if (!beneficiaryName.trim()) {
      setFormError('Beneficiary Name is required.');
      return;
    }

    const totalRequired = calculation ? calculation.total_deducted : (numAmount + 15);
    const balance = parseFloat(String(user?.wallet_balance || 0));

    if (balance < totalRequired) {
      setFormError(`Insufficient Wallet Balance! Required ₹${totalRequired.toFixed(2)}, Available ₹${balance.toFixed(2)}`);
      return;
    }

    // Open Confirmation Modal with TPIN authorization
    setTpin('');
    setConfirmError('');
    setRefundNotice('');
    setShowConfirmModal(true);
  };

  const handleExecutePayout = async () => {
    // Guard against double clicks / double calls
    if (transferLoading || verifyingTpin) return;

    if (!tpin || tpin.length !== 4) {
      setConfirmError('Please enter your 4-digit TPIN to authorize this transfer.');
      return;
    }

    setVerifyingTpin(true);
    setTransferLoading(true);
    setConfirmError('');
    setRefundNotice('');

    try {
      // 1. Authorize with 4-Digit TPIN
      const tpinRes = await authApi.verifyTpin(tpin);
      if (!tpinRes.success) {
        setConfirmError(tpinRes.message || 'Invalid 4-digit TPIN.');
        setTransferLoading(false);
        setVerifyingTpin(false);
        return;
      }

      const res = await payoutApi.transfer({
        amount: parseFloat(amount),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        beneficiary_name: beneficiaryName.trim(),
        bank_name: bankName.trim() || undefined,
        transfer_mode: transferMode
      });

      if (res.success && res.data) {
        setShowConfirmModal(false);

        // Refresh user profile balance
        try {
          const prof = await userApi.getProfile();
          if (prof.success && prof.user) updateUser(prof.user);
        } catch {}

        // Reset form
        setAmount('');
        setAccountNumber('');
        setConfirmAccount('');
        setBeneficiaryName('');
        setBankName('');
        setCalculation(null);

        // Open Receipt Modal
        const successTxn: PayoutTransaction = {
          id: res.data.client_order_id,
          user_id: user?.id || '',
          client_order_id: res.data.client_order_id,
          api_order_id: res.data.order_id,
          utr: res.data.utr,
          amount: res.data.amount,
          slab_charge: res.data.slab_charge,
          total_deducted: res.data.total_deducted,
          account_number: res.data.account_number,
          ifsc_code: res.data.ifsc_code,
          beneficiary_name: res.data.beneficiary_name,
          bank_name: bankName,
          transfer_mode: res.data.transfer_mode,
          status: res.data.status || 'success',
          failure_reason: res.data.status === 'pending' ? (res.data.message || 'Payout transfer is currently being processed by the bank.') : undefined,
          created_at: new Date().toISOString()
        };

        setReceiptTxn(successTxn);
        setShowReceipt(true);
      } else {
        setConfirmError(res.message || 'Payout transfer failed');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Payout request failed';
      setConfirmError(errMsg);
      if (err.response?.data?.refunded) {
        setRefundNotice('Funds have been safely refunded back to your wallet.');
      }

      // Refresh balance in case of auto-refund
      try {
        const prof = await userApi.getProfile();
        if (prof.success && prof.user) updateUser(prof.user);
      } catch {}
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCheckStatus = async (orderId: string) => {
    setCheckingStatusId(orderId);
    try {
      const res = await payoutApi.checkStatus(orderId);
      if (res.success) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setCheckingStatusId(null);
    }
  };

  const currentBalance = parseFloat(String(user?.wallet_balance || 0));

  if (!instantPayoutEnabled) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Instant Payout Service Disabled</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Instant Payout service has been temporarily disabled by the administrator. 
            Access to this feature and route is currently restricted.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/users'}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> 24x7 Instant Bank Transfer (Payout)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Instant Payout to Bank
            </h1>
            <p className="text-xs text-slate-400">
              Transfer funds from your wallet directly to any Indian bank account via IMPS or NEFT.
            </p>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-6 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveSubTab('transfer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'transfer'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Transfer to Bank
          </button>
          <button
            onClick={() => setActiveSubTab('beneficiaries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'beneficiaries'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookUser className="w-4 h-4" /> Saved Beneficiaries ({beneficiaries.length})
          </button>
          <button
            onClick={() => setActiveSubTab('verifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'verifications'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verification History ({userVerifications.length})
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Payout History ({history.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TRANSFER FORM */}
      {activeSubTab === 'transfer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" /> Beneficiary Bank Details
              </h2>
              <span className="text-xs text-slate-400">Min ₹100 • Max ₹2,00,000</span>
            </div>

            {formError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleValidateForm} className="space-y-4">
              
              {/* Transfer Mode Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Transfer Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransferMode('IMPS')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      transferMode === 'IMPS'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-400" /> IMPS (24x7 Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('NEFT')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      transferMode === 'NEFT'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> NEFT
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-400">
                    Payout Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                    Active Slab Range: ₹{minPayoutLimit.toLocaleString('en-IN')} - ₹{maxPayoutLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-500">₹</span>
                  <input
                    type="number"
                    min={minPayoutLimit}
                    max={maxPayoutLimit}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Enter amount between ${minPayoutLimit} and ${maxPayoutLimit}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-white font-bold text-base focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                {calcLoading && (
                  <p className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Calculating slab charge...
                  </p>
                )}
              </div>

              {/* SAVED BENEFICIARIES QUICK SELECT */}
              {beneficiaries.length > 0 && (
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <BookUser className="w-3.5 h-3.5 text-indigo-400" />
                      Quick Select Saved Beneficiary
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('beneficiaries')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                    >
                      View All ({beneficiaries.length}) →
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {beneficiaries.map((b) => {
                      const isSelected = accountNumber === b.account_number && ifscCode === b.ifsc_code;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBeneficiary(b)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {b.is_verified && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span>{b.beneficiary_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({b.account_number.slice(-4)})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Number & Confirm Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Bank Account Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ''));
                      setIsAccountVerified(false);
                      setVerificationAlert(null);
                    }}
                    placeholder="8 to 22 digits"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Confirm Account Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmAccount}
                    onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter account number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* IFSC & Bank Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Bank IFSC Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifscCode}
                    onChange={(e) => {
                      setIfscCode(e.target.value.toUpperCase());
                      setIsAccountVerified(false);
                      setVerificationAlert(null);
                    }}
                    placeholder="e.g. HDFC0001234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold uppercase text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Bank Name <span className="text-slate-500">(Optional / Auto-retrieved)</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* PENNY DROP BANK ACCOUNT VERIFICATION BUTTON & BADGE */}
              {payoutVerificationEnabled && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  isAccountVerified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${isAccountVerified ? 'text-emerald-400' : 'text-indigo-400'}`} />
                        <span className="text-xs font-bold text-white">
                          {isAccountVerified ? 'Bank Account Verified (Penny Drop)' : 'Verify Account Holder Name (Penny Drop)'}
                        </span>
                        {isAccountVerified && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isAccountVerified
                          ? `Registered Bank Name: "${verifiedAccountName}" ${verifiedBankName ? `• ${verifiedBankName}` : ''}${verifiedUtr ? ` • UTR: ${verifiedUtr}` : ''}`
                          : `Retrieve the registered account name directly from the bank. ₹${payoutVerificationCharge.toFixed(2)} deducted from wallet ONLY upon success (₹0 on failure).`}
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        disabled={verifyingAccount || !accountNumber || !ifscCode}
                        onClick={handleVerifyAccount}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          isAccountVerified
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
                        } disabled:opacity-50`}
                      >
                        {verifyingAccount ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying with Bank...</span>
                          </>
                        ) : isAccountVerified ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                            <span>Re-verify (₹{payoutVerificationCharge.toFixed(2)})</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Account (₹{payoutVerificationCharge.toFixed(2)})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Verification feedback message */}
                  {verificationAlert && (
                    <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      verificationAlert.type === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                    }`}>
                      {verificationAlert.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{verificationAlert.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Beneficiary Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Beneficiary Name (As on Passbook) <span className="text-rose-400">*</span>
                  {isAccountVerified && (
                    <span className="text-emerald-400 ml-2 font-normal text-[11px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Auto-populated from bank penny drop
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar Patel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                  {isAccountVerified && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!amount || !accountNumber || !ifscCode || !beneficiaryName}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5" /> Proceed to Instant Payout
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Live Breakdown Card & Security Notes */}
          <div className="space-y-6">
            
            {/* Live Calculation Preview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" /> Deduction Breakdown
              </h3>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Transfer Amount</span>
                  <span className="font-bold text-white text-sm">
                    ₹{parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1">
                    Payout Slab Charge
                    {calculation?.slab && (
                      <span className="text-[10px] text-indigo-400">
                        ({calculation.slab.charge_type === 'percentage' ? `${calculation.slab.charge_value}%` : `₹${calculation.slab.charge_value} flat`})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-amber-400 text-sm">
                    +₹{(calculation ? calculation.charge_amount : 0).toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-200">Total Wallet Debit</span>
                  <span className="font-black text-emerald-400 text-base">
                    ₹{(calculation ? calculation.total_deducted : parseFloat(amount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t border-slate-800/60 pt-2 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Remaining Balance</span>
                  <span className={`font-mono font-bold ${
                    currentBalance < (calculation ? calculation.total_deducted : 0) ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    ₹{Math.max(0, currentBalance - (calculation ? calculation.total_deducted : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {currentBalance < (calculation ? calculation.total_deducted : 0) && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Wallet balance is insufficient to complete this payout.</span>
                </div>
              )}
            </div>

            {/* Instant Transfer Benefits */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Guaranteed Safety
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>24x7 Realtime:</strong> Direct NPCI IMPS bank settlement with instant UTR generation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Auto-Refund:</strong> If upstream bank rejects, funds and fees are instantly refunded to your wallet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>TPIN Protection:</strong> Mandatory 4-digit TPIN required to authorize each transfer.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: SAVED BENEFICIARIES */}
      {activeSubTab === 'beneficiaries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <BookUser className="w-5 h-5 text-indigo-400" /> Saved Beneficiaries Directory
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredBeneficiaries.length}{filteredBeneficiaries.length !== beneficiaries.length ? ` / ${beneficiaries.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Your saved bank accounts are pre-verified. 1-click send without typing details again.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('transfer')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> New Bank Transfer
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={benSearchTerm}
              onChange={(e) => setBenSearchTerm(e.target.value)}
              placeholder="Search by Beneficiary Name, Account Number, IFSC, or Bank..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Cards Grid */}
          {beneficiariesLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading saved beneficiaries...
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-3">
              <BookUser className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">No saved beneficiaries found</p>
              <p className="text-slate-500 max-w-sm mx-auto">
                {benSearchTerm
                  ? 'No beneficiaries match your search criteria.'
                  : 'Whenever you verify an account via Penny Drop or complete a transfer, the beneficiary is automatically saved here for quick 1-click payouts.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('transfer')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Transfer Money Now
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBeneficiaries.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl space-y-3 transition-all relative group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm uppercase">{b.beneficiary_name}</span>
                        {b.is_verified && (
                          <span className="p-0.5 text-emerald-400" title="Account Verified with Bank">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {b.bank_name || 'Bank Account'} {b.branch ? `• ${b.branch}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={deletingBenId === b.id}
                      onClick={() => handleDeleteBeneficiary(b.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition cursor-pointer"
                      title="Remove beneficiary"
                    >
                      {deletingBenId === b.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/60 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>A/C No:</span>
                      <span className="font-bold text-white tracking-wider">{b.account_number}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IFSC:</span>
                      <span className="font-bold text-indigo-400">{b.ifsc_code}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {b.verified_at ? 'Verified' : 'Saved'} • {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSelectBeneficiary(b)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Money</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: VERIFICATION HISTORY */}
      {activeSubTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Bank Account Verification History (Penny Drop)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredUserVerifications.length}{filteredUserVerifications.length !== userVerifications.length ? ` / ${userVerifications.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Log of account holder validations. Fee was deducted only upon success (₹0 on failure).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchUserVerifications()}
                disabled={verifsLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={userVerifSearch}
              onChange={(e) => setUserVerifSearch(e.target.value)}
              placeholder="Search by Account Number, IFSC, Name at Bank, or Bank..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Table */}
          {verifsLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading verification logs...
            </div>
          ) : filteredUserVerifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">No verification logs found</p>
              <p className="text-[11px] text-slate-500">
                When you verify bank accounts using Penny Drop, the records and bank receipts will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Bank Account & IFSC</th>
                    <th className="py-3 px-4">Registered Name at Bank</th>
                    <th className="py-3 px-4">Bank Name</th>
                    <th className="py-3 px-4">Bank UTR / Ref</th>
                    <th className="py-3 px-4">Fee Charged</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUserVerifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(v.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
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
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                            <span>{v.utr || v.reference_id}</span>
                            <button
                              onClick={() => copyToClipboard(v.utr || v.reference_id || '', v.id)}
                              className="text-slate-500 hover:text-white p-0.5 rounded"
                              title="Copy UTR"
                            >
                              {copiedUtr === v.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">—</span>
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
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setAccountNumber(v.account_number);
                            setConfirmAccount(v.account_number);
                            setIfscCode(v.ifsc_code);
                            if (v.name_at_bank) setBeneficiaryName(v.name_at_bank);
                            if (v.bank_name) setBankName(v.bank_name);
                            if (v.status === 'success') {
                              setIsAccountVerified(true);
                              setVerifiedAccountName(v.name_at_bank || '');
                              setVerifiedBankName(v.bank_name || '');
                            }
                            setActiveSubTab('transfer');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Transfer
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

      {/* SUB-TAB 4: PAYOUT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" /> My Payout Transfer Records
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredHistory.length}{filteredHistory.length !== history.length ? ` / ${history.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Complete real-time log of your bank transfers with bank UTRs</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isAnyHistoryFilterActive && (
                <button
                  type="button"
                  onClick={handleClearHistoryFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}

              <button
                onClick={() => fetchHistory(true)}
                disabled={historyLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh Log
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="Search order ref, UTR, account..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-slate-500"
              />
              {historySearchTerm && (
                <button
                  type="button"
                  onClick={() => setHistorySearchTerm('')}
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
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value as any)}
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
            {historyDateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={historyCustomStartDate}
                  onChange={(e) => setHistoryCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
                <span className="text-[11px] text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={historyCustomEndDate}
                  onChange={(e) => setHistoryCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>
            )}

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Status ({history.length})</option>
                <option value="success" className="bg-slate-900 text-slate-200">Success ({successHistoryCount})</option>
                <option value="pending" className="bg-slate-900 text-slate-200">Pending ({pendingHistoryCount})</option>
                <option value="failed" className="bg-slate-900 text-slate-200">Failed / Refunded ({failedHistoryCount})</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading payout history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">No matching transfers found</p>
              <p className="text-[11px] text-slate-500">Try adjusting your search or date range filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Beneficiary & Account</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Slab Fee</th>
                    <th className="py-3 px-4">Total Debit</th>
                    <th className="py-3 px-4">Bank UTR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300 font-bold">
                        {item.client_order_id}
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
                        ) : item.status === 'pending' ? (
                          <button
                            onClick={() => handleCheckStatus(item.client_order_id)}
                            disabled={checkingStatusId === item.client_order_id}
                            className="text-[10px] bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold hover:bg-indigo-600/40"
                          >
                            {checkingStatusId === item.client_order_id ? 'Checking...' : 'Check Status'}
                          </button>
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
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setReceiptTxn(item);
                            setShowReceipt(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
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

      {/* CONFIRMATION MODAL (NO TPIN REQUIRED) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/30">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Confirm Bank Payout</h3>
              <p className="text-xs text-slate-400">
                Please verify beneficiary bank details before confirming transfer
              </p>
            </div>

            {/* Beneficiary & Amount Summary */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Beneficiary Name:</span>
                <span className="font-bold text-white uppercase">{beneficiaryName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Account Number:</span>
                <span className="font-mono text-slate-200 font-bold">{accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bank IFSC:</span>
                <span className="font-mono text-indigo-300 uppercase">{ifscCode}</span>
              </div>
              {bankName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Bank Name:</span>
                  <span className="text-slate-300">{bankName}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Transfer Mode:</span>
                <span className="font-bold text-emerald-400">{transferMode}</span>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span className="text-slate-400">Transfer Amount:</span>
                <span className="font-bold text-white">₹{parseFloat(amount || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payout Slab Fee:</span>
                <span className="font-bold text-amber-400">+₹{(calculation ? calculation.charge_amount : 0).toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center">
                <span className="text-slate-200 font-black text-sm">Total Wallet Debit:</span>
                <span className="font-black text-emerald-400 text-base">
                  ₹{(calculation ? calculation.total_deducted : parseFloat(amount || '0')).toFixed(2)}
                </span>
              </div>
            </div>

            {/* 4-Digit TPIN Input / Prompt */}
            {!user?.tpin_set ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300">4-Digit TPIN Required</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    You have not created your 4-digit Transaction PIN yet. Create it now to authorize payout transfers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    window.history.pushState(null, '', '/manage-tpin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Go to TPIN Page to Create TPIN
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Enter 4-Digit TPIN <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={tpin}
                  onChange={(e) => setTpin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-base text-center font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 text-center">
                  Enter your 4-digit secret transaction PIN to authorize this transfer
                </p>
              </div>
            )}

            {confirmError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {confirmError}
              </div>
            )}

            {refundNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs">
                ✓ {refundNotice}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={transferLoading || verifyingTpin}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={!user?.tpin_set || transferLoading || verifyingTpin || tpin.length !== 4}
                className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                {transferLoading || verifyingTpin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying & Processing...
                  </>
                ) : (
                  <>Authorize & Transfer</>
                )}
              </button>
            </div>

            {transferLoading && (
              <p className="text-[11px] text-center text-indigo-400 animate-pulse">
                Transferring funds to bank via IMPS... Please do not refresh.
              </p>
            )}

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

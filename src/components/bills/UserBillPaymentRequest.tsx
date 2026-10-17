import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { bankApi, billRequestApi, userApi } from '../../services/api';
import type { BankAccount } from '../../types/bank';
import type { ChargeSlab, CreditCardBillRequest } from '../../types/billRequest';
import {
  CreditCard,
  Wallet,
  Building2,
  User,
  Phone,
  IndianRupee,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Search,
  Filter
} from 'lucide-react';

export const UserBillPaymentRequest: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { ccBillPayEnabled } = useSettingsStore();
  
  // Data lists
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [slabs, setSlabs] = useState<ChargeSlab[]>([]);
  const [requests, setRequests] = useState<CreditCardBillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');

  // Live service charge calculation
  const [calculatedCharge, setCalculatedCharge] = useState<number>(25);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    filterStatus !== 'all' ||
    dateFilter !== 'ALL' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const filteredRequests = requests.filter(req => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!req.created_at) return false;
      const d = new Date(req.created_at);
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
    if (filterStatus !== 'all' && req.status !== filterStatus) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        req.customer_name.toLowerCase().includes(q) ||
        req.card_number.includes(q) ||
        req.bank_name.toLowerCase().includes(q) ||
        req.mobile_number.includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [bankRes, slabRes, reqRes] = await Promise.all([
        bankApi.getBankList().catch(() => ({ success: false, banks: [] })),
        billRequestApi.getSlabs().catch(() => ({ success: false, slabs: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] }))
      ]);

      if (bankRes.success && Array.isArray(bankRes.banks)) {
        const activeOnly = bankRes.banks.filter((b: BankAccount) => b.is_active);
        setBanks(activeOnly);
        if (activeOnly.length > 0 && !bankName) {
          setBankName(activeOnly[0].bank_name);
        }
      }

      if (slabRes.success && Array.isArray(slabRes.slabs)) {
        setSlabs(slabRes.slabs);
      }

      if (reqRes.success && Array.isArray(reqRes.requests)) {
        setRequests(reqRes.requests);
      }
    } catch (err: any) {
      console.error('Failed to load bill request data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const activeSlabs = slabs.filter((s: any) => s.is_active !== false);
  const minSlabLimit = activeSlabs.length > 0 ? Math.min(...activeSlabs.map((s: any) => Number(s.min_amount))) : 1;
  const maxSlabLimit = activeSlabs.length > 0 ? Math.max(...activeSlabs.map((s: any) => Number(s.max_amount))) : 200000;

  // Recalculate charge whenever amount or slabs change
  useEffect(() => {
    const numAmt = Number(amount);
    if (!numAmt || isNaN(numAmt) || numAmt <= 0) {
      setCalculatedCharge(25);
      return;
    }

    const matchingSlab = activeSlabs.find(s => numAmt >= Number(s.min_amount) && numAmt <= Number(s.max_amount));
    if (matchingSlab) {
      setCalculatedCharge(Number(matchingSlab.charge_amount));
    } else {
      setCalculatedCharge(0);
    }
  }, [amount, slabs]);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(raw);
  };

  const formatCardDisplay = (raw: string) => {
    return raw.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleClearForm = () => {
    setCustomerName('');
    setCardNumber('');
    setAmount('');
    setMobileNumber(user?.mobile_number || '');
    if (banks.length > 0) setBankName(banks[0].bank_name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!customerName.trim()) {
      showNotice('error', 'Please enter Customer Name');
      return;
    }

    if (cardNumber.length !== 16) {
      showNotice('error', 'Card Number must be exactly 16 digits');
      return;
    }

    if (!bankName) {
      showNotice('error', 'Please select a Bank Name');
      return;
    }

    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      showNotice('error', 'Please enter a valid Amount greater than ₹0');
      return;
    }

    if (activeSlabs.length > 0) {
      if (numAmt < minSlabLimit) {
        showNotice('error', `Amount ₹${numAmt.toLocaleString('en-IN')} cannot be less than minimum active slab limit of ₹${minSlabLimit.toLocaleString('en-IN')}`);
        return;
      }
      if (numAmt > maxSlabLimit) {
        showNotice('error', `Amount ₹${numAmt.toLocaleString('en-IN')} exceeds maximum active slab limit of ₹${maxSlabLimit.toLocaleString('en-IN')}`);
        return;
      }
      const matchingSlab = activeSlabs.find(s => numAmt >= Number(s.min_amount) && numAmt <= Number(s.max_amount));
      if (!matchingSlab) {
        showNotice('error', `Amount ₹${numAmt.toLocaleString('en-IN')} does not fall into any active charge slab`);
        return;
      }
    }

    if (mobileNumber.length !== 10) {
      showNotice('error', 'Mobile Number must be exactly 10 digits');
      return;
    }

    const totalDeduction = numAmt + calculatedCharge;
    const currentBalance = Number(user?.wallet_balance || 0);

    if (currentBalance < totalDeduction) {
      showNotice('error', `Insufficient Balance! Required: ₹${totalDeduction.toLocaleString('en-IN')}, Available: ₹${currentBalance.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await billRequestApi.submitRequest({
        customer_name: customerName,
        card_number: cardNumber,
        bank_name: bankName,
        amount: numAmt,
        mobile_number: mobileNumber
      });

      if (res.success) {
        showNotice('success', res.message);

        // Auto sync profile wallet balance
        const profileRes = await userApi.getProfile();
        if (profileRes.success && profileRes.user) {
          updateUser(profileRes.user);
        }

        handleClearForm();
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to submit bill payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const numAmt = Number(amount) || 0;
  const totalDeduction = numAmt + calculatedCharge;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full pb-10">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Credit Card Bill Payment</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Pay credit card bills instantly with dynamic service charges & auto wallet deduction
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Request Form (Left) & Active Slabs Info (Right) */}
      {ccBillPayEnabled ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORM CONTAINER (8 Columns) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" /> New Bill Payment Request
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Instant Processing
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Customer Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter Customer Name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
            </div>

            {/* 16-Digit Card Number & Bank Name Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  16-Digit Card Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={formatCardDisplay(cardNumber)}
                    onChange={handleCardNumberChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition tracking-wider"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{cardNumber.length}/16 Digits</p>
              </div>

              {/* Bank Name Dropdown (Fetched from Admin Bank Entry) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Select Bank <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500 transition appearance-none"
                  >
                    {banks.length === 0 ? (
                      <option value="">No Active Banks Available</option>
                    ) : (
                      banks.map(b => (
                        <option key={b.id} value={b.bank_name}>
                          {b.bank_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Amount & Mobile Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Bill Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                    Active Range: ₹{minSlabLimit.toLocaleString('en-IN')} - ₹{maxSlabLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    required
                    min={minSlabLimit}
                    max={maxSlabLimit}
                    placeholder={`e.g. between ₹${minSlabLimit} and ₹${maxSlabLimit}`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-black text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mobile Number (10 Digits) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Enter 10 digit mobile"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* DEDUCTION BREAKDOWN PILL */}
            {numAmt > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Bill Amount:</span>
                  <span className="font-bold text-white">₹{numAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Service Charge (Slab):</span>
                  <span className="font-bold text-amber-400">+ ₹{calculatedCharge}</span>
                </div>
                <div className="border-t border-indigo-500/20 pt-1.5 flex items-center justify-between font-black text-white">
                  <span>Total Wallet Deduction:</span>
                  <span className="text-emerald-400 text-sm">₹{totalDeduction.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* Action Buttons: Submit & Clear */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Form</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        </div>

        {/* SLABS & INFO CARD (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" /> Service Charge Slabs
            </h4>

            <div className="space-y-2">
              {slabs.length === 0 ? (
                <div className="text-[11px] text-slate-500">Default: 1-50,000 → ₹25 | 50,001-1,00,000 → ₹50</div>
              ) : (
                slabs.map((slab, i) => (
                  <div key={slab.id || i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <p className="font-bold text-slate-200">
                        ₹{Number(slab.min_amount).toLocaleString('en-IN')} - ₹{Number(slab.max_amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500">Standard Charge</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-black">
                      ₹{slab.charge_amount}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1 leading-relaxed">
              <p className="font-bold text-slate-300">💡 Important Notice:</p>
              <p>• Wallet balance is debited immediately upon submitting request.</p>
              <p>• If Admin rejects your request, the amount + charge is <b>100% refunded</b> back to your wallet instantly!</p>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* SERVICE TEMPORARILY OFF NOTICE CARD */
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Service Temporarily Off
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Credit Card Bill Payment Service is Temporarily Off
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              New bill payment request submissions and service charge slab calculations are currently disabled by the administrator. Please check back later or contact support.
            </p>
          </div>
          <div className="pt-2 text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>You can view and track your previous bill payment requests history below.</span>
          </div>
        </div>
      )}

      {/* RECENT REQUESTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> My Bill Payment Requests History
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {filteredRequests.length}{filteredRequests.length !== requests.length ? ` / ${requests.length}` : ''}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filter by date range, request status, or customer name
            </p>
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition"
              title="Refresh requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer, card, bank..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
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

          {/* Custom Date Pickers */}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Requests ({requests.length})</option>
              <option value="pending" className="bg-slate-900 text-slate-200">Pending ({pendingCount})</option>
              <option value="approved" className="bg-slate-900 text-slate-200">Approved ({approvedCount})</option>
              <option value="rejected" className="bg-slate-900 text-slate-200">Reject ({rejectedCount})</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading request history...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No matching bill payment requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer & Card</th>
                  <th className="py-3 px-4">Customer Mobile</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4">Bill Amount</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Total Debited</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {req.created_at ? (
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="font-bold text-slate-200">
                            {new Date(req.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(req.created_at).toLocaleTimeString('en-IN', {
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

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{req.customer_name}</p>
                      <p className="text-[11px] font-mono text-indigo-400">
                        XXXX-XXXX-XXXX-{req.card_number.slice(-4)}
                      </p>
                    </td>

                    {/* Customer Mobile */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {req.mobile_number ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>+91 {req.mobile_number}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {req.bank_name}
                    </td>

                    <td className="py-3.5 px-4 font-black text-white">
                      ₹{Number(req.amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      ₹{req.service_charge}
                    </td>

                    <td className="py-3.5 px-4 font-black text-emerald-400">
                      ₹{Number(req.total_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {req.status === 'pending' && <Clock className="w-3 h-3 animate-pulse" />}
                        <span>{req.status}</span>
                      </span>
                      {req.status === 'rejected' && req.rejection_reason && (
                        <p className="text-[9px] text-rose-400 mt-1 max-w-[140px] truncate mx-auto">
                          Reason: {req.rejection_reason}
                        </p>
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
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { b2bApi, authApi } from '../../services/api';
import type { 
  BillerCategory, Biller, BillerInputParam, CustomerParamItem, 
  FetchBillResponse, PayBillResponse 
} from '../../types/b2b';
import { 
  CreditCard, Search, ShieldCheck, CheckCircle2, Clock, AlertCircle, ArrowRight, 
  RefreshCw, FileText, Lock, ChevronDown, Calendar, Filter, RotateCcw, X
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';

const defaultCategoriesList: BillerCategory[] = [
  { category_id: 7, category_name: "Credit Card" }
];

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

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
const getServiceCharge = (item: any): number => {
  const charge = Number(item?.service_charge ?? item?.charge_amount ?? item?.charge ?? 0);
  if (charge > 0) return charge;
  const amt = Number(item?.amount || 0);
  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  if (amt <= 150000) return 75;
  return 100;
};

export const LiveBillPayment: React.FC = () => {
  const { user } = useAuthStore();
  const { liveBillPayEnabled } = useSettingsStore();

  // Category & Biller State (Credit Card Only - Fetched from Database)
  const [categories] = useState<BillerCategory[]>(defaultCategoriesList);
  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [billerSearch, setBillerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form State
  const [mobileNumber, setMobileNumber] = useState('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  
  // Step 1: Fetch State
  const [fetchingBill, setFetchingBill] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchBillResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Step 2: Payment Modal & Exec State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [customerPan, setCustomerPan] = useState('');
  const [tpin, setTpin] = useState('');
  const [verifyingTpin, setVerifyingTpin] = useState(false);
  const [payingBill, setPayingBill] = useState(false);
  const [payResult, setPayResult] = useState<PayBillResponse | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState('');
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState('');

  const isAnyHistoryFilterActive = Boolean(
    historySearchQuery.trim() ||
    historyStatusFilter !== 'all' ||
    historyDateFilter !== 'ALL' ||
    historyCustomStartDate ||
    historyCustomEndDate
  );

  const handleClearHistoryFilters = () => {
    setHistorySearchQuery('');
    setHistoryStatusFilter('all');
    setHistoryDateFilter('ALL');
    setHistoryCustomStartDate('');
    setHistoryCustomEndDate('');
  };

  const filteredHistoryList = historyList.filter(item => {
    // 1. Date Filter
    if (historyDateFilter !== 'ALL') {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      const t = d.getTime();
      if (isNaN(t)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (historyDateFilter === 'TODAY') {
        if (t < startOfToday || t > endOfToday) return false;
      } else if (historyDateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (t < startOfYesterday || t > endOfYesterday) return false;
      } else if (historyDateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (t < startOf7Days || t > endOfToday) return false;
      } else if (historyDateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (t < startOf30Days || t > endOfToday) return false;
      } else if (historyDateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (t < startOfMonth || t > endOfToday) return false;
      } else if (historyDateFilter === 'CUSTOM') {
        if (historyCustomStartDate) {
          const [sY, sM, sD] = historyCustomStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (t < startTime) return false;
        }
        if (historyCustomEndDate) {
          const [eY, eM, eD] = historyCustomEndDate.split('-').map(Number);
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

    if (historyStatusFilter === 'success' && !isSuccess) return false;
    if (historyStatusFilter === 'pending' && !isPending) return false;
    if (historyStatusFilter === 'failed' && !isFailed) return false;

    // 3. Search Query
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.trim().toLowerCase();
      const card4 = getCardLast4(item);
      const matchesSearch = 
        (item.biller_name || '').toLowerCase().includes(q) ||
        (item.biller_id || '').toLowerCase().includes(q) ||
        (item.customer_name || '').toLowerCase().includes(q) ||
        (item.customer_mobile || '').toLowerCase().includes(q) ||
        (item.client_transaction_id || '').toLowerCase().includes(q) ||
        (item.bbps_txn_ref_id || '').toLowerCase().includes(q) ||
        card4.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const successCount = historyList.filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved').length;
  const pendingCount = historyList.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const failedCount = historyList.filter(i => (i.status || '').toLowerCase() === 'failed' || (i.status || '').toLowerCase() === 'rejected').length;

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await b2bApi.getHistory();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.warn('Error loading bill payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Synchronize Credit Card Billers directly from Database & Load History
  useEffect(() => {
    const loadCreditCardBillers = async () => {
      try {
        const billerRes = await b2bApi.getBillers({ category_id: 7 });
        if (billerRes && billerRes.status === 'success' && Array.isArray(billerRes.data) && billerRes.data.length > 0) {
          setBillers(billerRes.data);
          setSelectedBiller(billerRes.data[0]);
        }
      } catch (err) {
        console.warn('Error fetching Credit Card billers from database:', err);
      }
    };
    loadCreditCardBillers();
    loadHistory();
  }, []);

  const rawParams = selectedBiller?.metadata?.billerInputParams?.paramInfo;
  const currentInputParams: BillerInputParam[] = (Array.isArray(rawParams) && rawParams.length > 0)
    ? rawParams
    : [
        { paramName: "Last 4 digits of Credit Card Number", dataType: "NUMERIC", isOptional: "false", minLength: 4, maxLength: 4 },
        { paramName: "Registered Mobile Number", dataType: "NUMERIC", isOptional: "false", minLength: 10, maxLength: 10 }
      ];

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }));
  };

  // Step 1: Execute Fetch Bill
  const handleFetchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiller) return;

    for (const param of currentInputParams) {
      if (param.isOptional === 'false' || param.isOptional === false) {
        if (!paramValues[param.paramName] || paramValues[param.paramName].trim() === '') {
          alert(`Please enter required parameter: ${param.paramName}`);
          return;
        }
      }
    }

    setFetchingBill(true);
    setFetchError(null);
    setFetchResult(null);

    const findMobileKey = Object.keys(paramValues).find(k => k.toLowerCase().includes('mobile'));
    const activeMobile = mobileNumber || (findMobileKey ? paramValues[findMobileKey] : '') || '9876543210';

    const formattedCustomerParams: CustomerParamItem[] = currentInputParams.map(p => ({
      name: p.paramName,
      value: paramValues[p.paramName] || ''
    }));

    try {
      const res = await b2bApi.fetchBill({
        billerId: selectedBiller.biller_id,
        mobile: activeMobile,
        customerParams: formattedCustomerParams
      });

      if (res && res.status === 'success' && res.data) {
        setFetchResult(res);
        const rawData = res.data;
        const rawBillerInfo = rawData.billerResponseInfo || rawData.billerResponse || {};
        const fetchedAmt = parseFloat(rawBillerInfo.amount || rawBillerInfo.billAmount || rawData.amount || '0');
        setPayAmount(fetchedAmt > 0 ? fetchedAmt : 100);
      } else {
        const errorDetail = res?.data?.billFetchResponse?.errorInfo?.error?.errorMessage || res?.data?.billerResponseInfo?.errorInfo?.error?.errorMessage || res?.data?.billerResponse?.errorInfo?.error?.errorMessage || res?.message || 'Failed to fetch bill from BBPS network.';
        setFetchError(errorDetail);
      }
    } catch (err: any) {
      console.error('Fetch Bill Error:', err);
      setFetchError(err.response?.data?.message || 'Error communicating with BBPS Biller network.');
    } finally {
      setFetchingBill(false);
    }
  };

  // Charge Calculation & Wallet Check State
  const [chargeInfo, setChargeInfo] = useState<{
    serviceCharge: number;
    totalDeduction: number;
    walletBalance: number;
    hasSufficientBalance: boolean;
  } | null>(null);

  const fetchChargeInfo = async (amt: number) => {
    if (amt <= 0) {
      setChargeInfo(null);
      return;
    }
    try {
      const res = await b2bApi.calculateCharge(amt);
      if (res && res.success) {
        setChargeInfo({
          serviceCharge: res.serviceCharge,
          totalDeduction: res.totalDeduction,
          walletBalance: res.walletBalance,
          hasSufficientBalance: res.hasSufficientBalance
        });
      }
    } catch (err) {
      console.warn('Error calculating charge:', err);
    }
  };

  // Step 2: Open Payment Modal
  const openPayModal = () => {
    if (payAmount >= 50000) {
      const cleanPan = customerPan.trim().toUpperCase();
      if (!cleanPan) {
        alert('Please enter a valid 10-digit Customer PAN Card for payments of ₹50,000 or above.');
        return;
      }
      if (!PAN_REGEX.test(cleanPan)) {
        alert('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
        return;
      }
    }
    setPayResult(null);
    setPayError(null);
    setTpin('');
    fetchChargeInfo(payAmount);
    setShowPayModal(true);
  };

  // Execute Bill Payment
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiller || !fetchResult || !fetchResult.data) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (chargeInfo && !chargeInfo.hasSufficientBalance) {
      setPayError(`Insufficient Wallet Balance! Required: ₹${chargeInfo.totalDeduction.toLocaleString('en-IN')} (Bill: ₹${payAmount} + Charge: ₹${chargeInfo.serviceCharge}), Available: ₹${chargeInfo.walletBalance.toLocaleString('en-IN')}`);
      return;
    }

    const cleanPan = customerPan.trim().toUpperCase();
    if (payAmount >= 50000) {
      if (!cleanPan) {
        setPayError('Customer PAN Card (10 digits) is required for payments of ₹50,000 or above.');
        return;
      }
      if (!PAN_REGEX.test(cleanPan)) {
        setPayError('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
        return;
      }
    } else if (cleanPan && !PAN_REGEX.test(cleanPan)) {
      setPayError('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
      return;
    }
    if (!tpin || tpin.length !== 4) {
      setPayError('Please enter your 4-digit TPIN to authorize bill payment.');
      return;
    }

    setPayingBill(true);
    setVerifyingTpin(true);
    setPayError(null);

    try {
      // 1. Authorize with 4-Digit TPIN
      const tpinRes = await authApi.verifyTpin(tpin);
      if (!tpinRes.success) {
        setPayError(tpinRes.message || 'Invalid 4-digit TPIN.');
        setPayingBill(false);
        setVerifyingTpin(false);
        return;
      }

      const formattedCustomerParams: CustomerParamItem[] = currentInputParams.map(p => ({
        name: p.paramName,
        value: paramValues[p.paramName] || ''
      }));

      const rawData: any = fetchResult.data || fetchResult;
      const rawBillerInfo = rawData.billerResponse || rawData.billerResponseInfo || undefined;

      let rawAddInfo: any = undefined;
      const bfrAdd = rawData.billFetchResponse?.additionalInfo;
      if (bfrAdd && ((Array.isArray(bfrAdd) && bfrAdd.length > 0) || (typeof bfrAdd === 'object' && Object.keys(bfrAdd).length > 0))) {
        rawAddInfo = bfrAdd;
      } else if (rawData.additionalInfo && ((Array.isArray(rawData.additionalInfo) && rawData.additionalInfo.length > 0) || (typeof rawData.additionalInfo === 'object' && Object.keys(rawData.additionalInfo).length > 0))) {
        rawAddInfo = rawData.additionalInfo;
      } else if (rawBillerInfo?.additionalInfo && ((Array.isArray(rawBillerInfo.additionalInfo) && rawBillerInfo.additionalInfo.length > 0) || (typeof rawBillerInfo.additionalInfo === 'object' && Object.keys(rawBillerInfo.additionalInfo).length > 0))) {
        rawAddInfo = rawBillerInfo.additionalInfo;
      } else {
        rawAddInfo = bfrAdd !== undefined ? bfrAdd : (rawData.additionalInfo !== undefined ? rawData.additionalInfo : undefined);
      }

      const activeMobile = mobileNumber || paramValues['Registered Mobile Number'] || paramValues['Mobile Number'] || paramValues['Customer Mobile'] || '9876543210';

      const payRes = await b2bApi.payBill({
        billerId: selectedBiller.biller_id,
        amount: payAmount,
        mobile: activeMobile,
        paymentMode: paymentMode,
        client_transaction_id: 'TXN_ORD_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000),
        fetchRequestId: rawData.requestId || rawData.fetchRequestId,
        customerParams: formattedCustomerParams,
        billerResponseInfo: rawBillerInfo,
        additionalInfo: rawAddInfo,
        customerPan: cleanPan || undefined
      });

      setPayResult(payRes);
      loadHistory();
      window.dispatchEvent(new Event('wallet_updated'));
    } catch (err: any) {
      console.error('Pay Bill Error:', err);
      setPayError(err.response?.data?.message || 'Payment failed. Please try again.');
      loadHistory();
      window.dispatchEvent(new Event('wallet_updated'));
    } finally {
      setPayingBill(false);
      setVerifyingTpin(false);
    }
  };

  const safeBillers = Array.isArray(billers) ? billers : [];
  const filteredBillers = safeBillers.filter(b => 
    b.is_active !== false && (
      (b.biller_name || '').toLowerCase().includes(billerSearch.toLowerCase()) ||
      (b.biller_id || '').toLowerCase().includes(billerSearch.toLowerCase())
    )
  );

  if (!liveBillPayEnabled) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Live Bill Pay Service Disabled</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Live Bill Payment service has been temporarily disabled by the administrator. 
            Access to this feature and route is currently restricted.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/users'}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-lg shadow-purple-950/50">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">Live Credit Card Bill Pay</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/40">
                BBPS Credit Card Network
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Instant 2-Step BBPS Credit Card Bill Payment & Verification Directory
            </p>
          </div>
        </div>
      </div>

      {/* CATEGORY DISPLAY (ONLY CREDIT CARD) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Category</p>
            <p className="text-sm font-black text-white">Credit Card Bill Payment</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-950 text-indigo-400 border border-slate-800">
          {filteredBillers.length} Indian Bank Credit Card Billers Synchronized
        </span>
      </div>

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: BILLER SELECTOR & PARAMETER FORM (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" /> Step 1: Select Bank & Enter Card Details
            </h2>

            {/* SEARCHABLE BILLER BANK SELECTOR DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select Credit Card Biller Bank *
              </label>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-3.5 text-xs text-left text-white font-semibold flex items-center justify-between transition-all duration-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-extrabold text-white text-xs truncate">
                      {selectedBiller ? selectedBiller.biller_name : 'Choose Credit Card Bank...'}
                    </p>
                    {selectedBiller && (
                      <p className="text-[10px] text-slate-400 font-mono">Biller ID: {selectedBiller.biller_id}</p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Overlay with Embedded Search */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 flex flex-col">
                  
                  {/* Embedded Sticky Search Input */}
                  <div className="p-2.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-10">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-indigo-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="🔍 Type to search bank name (e.g. HDFC, SBI, ICICI)..."
                        value={billerSearch}
                        onChange={(e) => setBillerSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      {billerSearch && (
                        <button
                          type="button"
                          onClick={() => setBillerSearch('')}
                          className="absolute right-2.5 top-2 text-xs text-slate-500 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtered Billers List */}
                  <div className="overflow-y-auto divide-y divide-slate-800/40 max-h-60">
                    {filteredBillers.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center font-medium">
                        No credit card biller banks match "{billerSearch}"
                      </div>
                    ) : (
                      filteredBillers.map((biller) => {
                        const isSelected = selectedBiller?.biller_id === biller.biller_id;
                        return (
                          <button
                            key={biller.biller_id}
                            type="button"
                            onClick={() => {
                              setSelectedBiller(biller);
                              setIsDropdownOpen(false);
                              setBillerSearch('');
                            }}
                            className={`w-full p-3 text-left flex items-center justify-between hover:bg-indigo-600/20 transition-colors ${
                              isSelected ? 'bg-indigo-950/60 text-white font-bold border-l-4 border-indigo-500' : 'text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                              <span className="text-xs font-semibold text-white truncate">{biller.biller_name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 shrink-0 ml-2">
                              {biller.biller_id}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* DYNAMIC PARAMETER FORM */}
            {selectedBiller && (
              <form onSubmit={handleFetchBill} className="space-y-4 pt-2 border-t border-slate-800">
                {/* DYNAMIC CUSTOMER INPUT PARAMS */}
                {(Array.isArray(currentInputParams) ? currentInputParams : []).map((param) => (
                  <div key={param.paramName}>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {param.paramName} {param.isOptional === 'true' || param.isOptional === true ? '(Optional)' : '*'}
                    </label>
                    <input
                      type={param.dataType === 'NUMERIC' ? 'number' : 'text'}
                      required={param.isOptional === 'false' || param.isOptional === false}
                      minLength={param.minLength}
                      maxLength={param.maxLength}
                      placeholder={`Enter ${param.paramName}`}
                      value={paramValues[param.paramName] || ''}
                      onChange={(e) => handleParamChange(param.paramName, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={fetchingBill}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingBill ? 'animate-spin' : ''}`} />
                  <span>{fetchingBill ? 'Fetching Real-Time Card Bill Details...' : 'Step 1: Fetch Credit Card Bill'}</span>
                </button>
              </form>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: FETCHED BILL SUMMARY & PAY ACTION (5 COLS) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* FETCH ERROR NOTICE */}
          {fetchError && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-3xl p-6 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                <AlertCircle className="w-4 h-4" /> Bill Fetch Notice
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">{fetchError}</p>
            </div>
          )}

          {/* FETCHED BILL SUMMARY CARD */}
          {fetchResult && fetchResult.data && fetchResult.data.billerResponse ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white">Fetched Card Details</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready for Payment
                </span>
              </div>

              {/* CUSTOMER NAME & BILL INFO */}
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Card Holder Name</p>
                  <p className="text-sm font-black text-white">{fetchResult.data.billerResponse.customerName || 'VALUED CARD HOLDER'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Due Date</p>
                    <p className="text-xs font-bold text-amber-400 mt-0.5">{fetchResult.data.billerResponse.dueDate || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Bill Date</p>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">{fetchResult.data.billerResponse.billDate || 'N/A'}</p>
                  </div>
                </div>

                {/* ADDITIONAL INFO ITEMS (MIN AMOUNT / OUTSTANDING) */}
                {Array.isArray(fetchResult.data.additionalInfo) && fetchResult.data.additionalInfo.length > 0 && (
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-pink-400">Additional Biller Information</p>
                    {fetchResult.data.additionalInfo.map((info, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                        <span>{info.infoName}:</span>
                        <span className="font-bold text-white font-mono">₹{info.infoValue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CUSTOMER PAN CARD INPUT IN FETCHED CARD DETAILS (WHEN AMOUNT >= 50,000) */}
                {payAmount >= 50000 && (
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Customer PAN Card <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        Required for ≥ ₹50,000
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        required
                        placeholder="e.g. ABCDE1234F"
                        value={customerPan}
                        onChange={(e) => setCustomerPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                        className={`w-full bg-slate-900 border rounded-xl p-3 text-sm font-mono tracking-widest text-white focus:outline-none transition ${
                          customerPan.length === 10
                            ? PAN_REGEX.test(customerPan)
                              ? 'border-emerald-500/80 focus:border-emerald-500'
                              : 'border-rose-500/80 focus:border-rose-500'
                            : 'border-slate-800 focus:border-indigo-500'
                        }`}
                      />
                      {customerPan.length === 10 && (
                        <div className="absolute right-3 top-3.5 flex items-center gap-1 text-[11px] font-bold">
                          {PAN_REGEX.test(customerPan) ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Valid PAN
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Invalid PAN
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TOTAL BILL AMOUNT & EDITABLE PAYMENT INPUT */}
                <div className="bg-gradient-to-r from-emerald-950 to-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-emerald-400">Payment Amount (Editable)</p>
                      <p className="text-[11px] text-slate-400">
                        Fetched Total Due: <span className="font-bold text-white font-mono">₹{Number(fetchResult.data.billerResponse.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Custom Amount Supported
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={payAmount || ''}
                        onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Enter Amount"
                        className="w-full bg-slate-950 border border-emerald-500/50 focus:border-emerald-400 rounded-xl py-2.5 pl-8 pr-3 text-xl font-black text-white font-mono focus:outline-none shadow-inner"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={openPayModal}
                      disabled={payAmount <= 0}
                      className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition shrink-0"
                    >
                      <span>Proceed to Pay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Active Card Bill Session</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Select your Credit Card Bank on the left and click <strong>"Step 1: Fetch Credit Card Bill"</strong> to load real-time bill details.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* RECENT CREDIT CARD BILL PAYMENTS HISTORY TABLE */}
      {/* HISTORY TABLE WITH FILTERS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Credit Card Bill Payment History
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredHistoryList.length}{filteredHistoryList.length !== historyList.length ? ` / ${historyList.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time record of all initiated and completed BBPS credit card payments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={loadHistory}
              disabled={loadingHistory}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER CONTROLS */}
        <div className="flex flex-wrap items-center gap-2.5 pb-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Biller / Customer / Mobile / Txn ID..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
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
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Records ({historyList.length})</option>
              <option value="success" className="bg-slate-900 text-slate-200">Success ({successCount})</option>
              <option value="pending" className="bg-slate-900 text-slate-200">Pending ({pendingCount})</option>
              <option value="failed" className="bg-slate-900 text-slate-200">Failed ({failedCount})</option>
            </select>
          </div>
        </div>

        {filteredHistoryList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Biller Bank</th>
                  <th className="p-3.5">Card (Last 4)</th>
                  <th className="p-3.5">Customer Name & Mobile</th>
                  <th className="p-3.5">Bill Amount (₹)</th>
                  <th className="p-3.5">Charge (₹)</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Transaction Ref IDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistoryList.map((item, idx) => {
                  const cardLast4 = getCardLast4(item);
                  return (
                    <tr key={item.client_transaction_id || item.id || idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 text-slate-400 font-sans whitespace-nowrap">
                        {new Date(item.created_at || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
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
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            No credit card bill payment history recorded yet.
          </div>
        )}
      </div>

      {/* STEP 2: BILL PAYMENT MODAL WITH MPIN SECURITY */}
      {showPayModal && fetchResult && fetchResult.data && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">Confirm Credit Card Payment</h3>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* PAY RESULT DISPLAY IF FINISHED */}
            {payResult ? (
              <div className="space-y-4">
                {payResult.status === 'success' || payResult.payment_status === 'success' ? (
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h4 className="text-lg font-black text-white">Credit Card Bill Paid!</h4>
                    <p className="text-xs text-emerald-200">{payResult.message || 'Payment confirmed by bank.'}</p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Txn ID:</span>
                        <span className="text-white font-bold">{payResult.transaction_id || payResult.data?.transaction_id}</span>
                      </div>
                      {payResult.bbps_txn_ref_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">BBPS Ref ID:</span>
                          <span className="text-emerald-400 font-bold">{payResult.bbps_txn_ref_id}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowPayModal(false);
                        setFetchResult(null);
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl"
                    >
                      Done & Close
                    </button>
                  </div>
                ) : payResult.status === 'pending' || payResult.payment_status === 'pending' ? (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-5 text-center space-y-3">
                    <Clock className="w-12 h-12 text-amber-400 mx-auto" />
                    <h4 className="text-lg font-black text-white">Payment Processing (Pending)</h4>
                    <p className="text-xs text-amber-200">{payResult.message || 'Processing at biller bank network.'}</p>
                    <button
                      onClick={() => setShowPayModal(false)}
                      className="w-full py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-5 text-center space-y-3">
                    <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
                    <h4 className="text-lg font-black text-white">Payment Failed</h4>
                    <p className="text-xs text-rose-200">{payResult.message || 'Payment rejected by gateway.'}</p>
                    {payResult.refunded && (
                      <p className="text-xs text-emerald-400 font-bold">✔ Wallet balance auto-refunded.</p>
                    )}
                    <button
                      onClick={() => setPayResult(null)}
                      className="w-full py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleExecutePayment} className="space-y-4">
                
                {payError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-500/30 rounded-xl text-xs text-rose-200">
                    {payError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Pay Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPayAmount(val);
                      fetchChargeInfo(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* SLAB CHARGE & WALLET DEDUCTION BREAKDOWN */}
                {chargeInfo && (
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Bill Amount:</span>
                      <span className="text-white font-bold font-mono">₹{payAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Slab Convenience Charge:</span>
                      <span className="text-pink-400 font-bold font-mono">+₹{chargeInfo.serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-1.5 flex justify-between font-extrabold text-white">
                      <span>Total Wallet Deduction:</span>
                      <span className="text-emerald-400 font-mono">₹{chargeInfo.totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1 text-slate-400">
                      <span>Available Wallet Balance:</span>
                      <span className={`font-mono font-bold ${chargeInfo.hasSufficientBalance ? 'text-slate-200' : 'text-rose-400'}`}>
                        ₹{chargeInfo.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {!chargeInfo.hasSufficientBalance && (
                      <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-500/30 text-rose-300 text-[11px] font-bold text-center">
                        ⚠️ Insufficient Wallet Balance! Please top up your wallet.
                      </div>
                    )}
                  </div>
                )}

                {/* CUSTOMER PAN CARD INPUT (FOR >= 50,000) */}
                {payAmount >= 50000 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Customer PAN Card <span className="text-rose-400">*</span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        required
                        placeholder="e.g. ABCDE1234F"
                        value={customerPan}
                        onChange={(e) => setCustomerPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                        className={`w-full bg-slate-950 border rounded-xl p-3 text-sm font-mono tracking-widest text-white focus:outline-none transition ${
                          customerPan.length === 10
                            ? PAN_REGEX.test(customerPan)
                              ? 'border-emerald-500/80 focus:border-emerald-500'
                              : 'border-rose-500/80 focus:border-rose-500'
                            : 'border-slate-800 focus:border-indigo-500'
                        }`}
                      />
                      {customerPan.length === 10 && (
                        <div className="absolute right-3 top-3.5 flex items-center gap-1 text-[11px] font-bold">
                          {PAN_REGEX.test(customerPan) ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Valid PAN
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Invalid PAN
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4-Digit TPIN Input / Prompt */}
                {!user?.tpin_set ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-300">4-Digit TPIN Required</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        You have not created your 4-digit Transaction PIN yet. Create it now to authorize Live Bill Pay.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPayModal(false);
                        window.history.pushState(null, '', '/manage-tpin');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                    >
                      Go to TPIN Page to Create TPIN
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Enter 4-Digit TPIN <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="••••"
                      value={tpin}
                      onChange={(e) => setTpin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-base text-center font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      Enter your secret 4-digit transaction PIN to authorize payment
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!user?.tpin_set || payingBill || verifyingTpin || tpin.length !== 4 || (chargeInfo ? !chargeInfo.hasSufficientBalance : false)}
                    className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldCheck className={`w-4 h-4 ${payingBill || verifyingTpin ? 'animate-spin' : ''}`} />
                    <span>{payingBill || verifyingTpin ? 'Verifying & Paying...' : 'Confirm & Pay Bill'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

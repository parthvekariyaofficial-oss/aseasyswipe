import React, { useState, useEffect, useRef } from 'react';
import { supabase, billApi } from '../../services/api';
import type { BillSubmission } from '../../types/bills';
import { EReceiptModal } from './EReceiptModal';
import {
  Zap, CreditCard, Droplets, Flame, Wifi, FileText, CheckCircle2,
  XCircle, Clock, AlertTriangle, Lock, Unlock, Search, Filter,
  RefreshCw, FileSpreadsheet, Printer, Eye, User, Phone, Building2,
  DollarSign, Check, X, ShieldAlert, Upload, ExternalLink
} from 'lucide-react';

export const BillSubmissionsManagement: React.FC = () => {
  const [bills, setBills] = useState<BillSubmission[]>([]);
  const [counts, setCounts] = useState({ pending: 0, processing: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters State
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'processing' | 'approved' | 'rejected'>('pending');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals State
  const [receiptBill, setReceiptBill] = useState<BillSubmission | null>(null);
  const [approveBillItem, setApproveBillItem] = useState<BillSubmission | null>(null);
  const [operatorRef, setOperatorRef] = useState<string>('');
  const [receiptProofUrl, setReceiptProofUrl] = useState<string>('');

  const [rejectBillItem, setRejectBillItem] = useState<BillSubmission | null>(null);
  const [rejectionReasonSelect, setRejectionReasonSelect] = useState<string>('Invalid Consumer Number');
  const [customReason, setCustomReason] = useState<string>('');

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Bills List
  const fetchBills = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await billApi.getBills({
        status: activeStatusTab === 'all' ? undefined : activeStatusTab,
        service_type: serviceFilter === 'ALL' ? undefined : serviceFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchQuery || undefined
      });

      if (res.success) {
        setBills(res.bills);
        setCounts(res.counts);
      }
    } catch (err: any) {
      console.error('Error fetching bill submissions:', err);
      if (!silent) showToast('Failed to load bill submissions', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [activeStatusTab, serviceFilter, startDate, endDate]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time Supabase Table listener & Polling
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel('realtime_bill_submissions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bill_submissions' },
          () => fetchBills(true)
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel fallback to polling:', e);
    }

    const interval = setInterval(() => {
      fetchBills(true);
    }, 8000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeStatusTab, serviceFilter, startDate, endDate, searchQuery]);

  // Action: Claim / Lock Bill
  const handleClaimBill = async (bill_id: string) => {
    setProcessingId(bill_id);
    try {
      const res = await billApi.claimBill(bill_id);
      if (res.success) {
        showToast('🔒 Bill locked for processing. Other admins cannot process simultaneously.', 'info');
        fetchBills(true);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to claim bill', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Confirm Approve Bill
  const handleConfirmApprove = async () => {
    if (!approveBillItem || !operatorRef.trim()) {
      showToast('Operator Reference Number is required for clearance', 'error');
      return;
    }

    setProcessingId(approveBillItem.id);
    try {
      const res = await billApi.approveBill({
        bill_id: approveBillItem.id,
        operator_ref: operatorRef.trim(),
        receipt_proof_url: receiptProofUrl.trim() || undefined
      });

      if (res.success) {
        showToast(`✅ Bill Approved! Operator Ref: ${operatorRef}`, 'success');
        setApproveBillItem(null);
        setOperatorRef('');
        setReceiptProofUrl('');
        fetchBills(true);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Approve failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Confirm Reject Bill (Atomic Refund)
  const handleConfirmReject = async () => {
    if (!rejectBillItem) return;
    const finalReason = rejectionReasonSelect === 'Other' ? customReason : rejectionReasonSelect;
    if (!finalReason || !finalReason.trim()) {
      showToast('Rejection reason is required', 'error');
      return;
    }

    setProcessingId(rejectBillItem.id);
    try {
      const res = await billApi.rejectBill({
        bill_id: rejectBillItem.id,
        rejection_reason: finalReason.trim()
      });

      if (res.success) {
        showToast(`💸 Bill Rejected. Atomically refunded ₹${rejectBillItem.total_debited.toLocaleString()} to retailer wallet.`, 'info');
        setRejectBillItem(null);
        setCustomReason('');
        fetchBills(true);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Reject failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate Elapsed Time & Flag if > 30 Mins
  const getElapsedMinutes = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    return Math.floor((now - created) / (1000 * 60));
  };

  // Export CSV Report
  const exportToCSV = () => {
    if (bills.length === 0) {
      showToast('No bill records to export', 'error');
      return;
    }

    const headers = [
      'Bill ID', 'Submitted At', 'Retailer Agent', 'Mobile', 'Firm',
      'Service Type', 'Provider', 'Consumer Account Number', 'Customer Name',
      'Amount (₹)', 'Charges (₹)', 'Total Debited (₹)', 'Status', 'Claimed By', 'Operator Ref', 'Rejection Reason'
    ];

    const rows = bills.map(b => [
      b.id,
      new Date(b.created_at).toLocaleString('en-IN'),
      `"${b.user_name || b.user_id}"`,
      `"${b.mobile_number || ''}"`,
      `"${b.firm_name || ''}"`,
      `"${b.service_type}"`,
      `"${b.provider}"`,
      `"${b.consumer_number}"`,
      `"${b.customer_name || ''}"`,
      b.amount,
      b.charges,
      b.total_debited,
      b.status.toUpperCase(),
      `"${b.claimed_by || 'N/A'}"`,
      `"${b.operator_ref || 'N/A'}"`,
      `"${b.rejection_reason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `offline_bills_${activeStatusTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exported CSV Bill Submissions Report!', 'success');
  };

  const getServiceBadge = (type: string) => {
    switch (type) {
      case 'Electricity': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Zap className="w-3 h-3" /> Electricity</span>;
      case 'Credit Card': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><CreditCard className="w-3 h-3" /> Credit Card</span>;
      case 'Water': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><Droplets className="w-3 h-3" /> Water</span>;
      case 'Gas': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"><Flame className="w-3 h-3" /> Gas</span>;
      case 'Broadband': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Wifi className="w-3 h-3" /> Broadband</span>;
      default: return <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><FileText className="w-3 h-3" /> {type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all duration-300 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' :
          toast.type === 'error' ? 'bg-rose-950/90 text-rose-300 border-rose-500/50' :
          'bg-indigo-950/90 text-indigo-300 border-indigo-500/50'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
          {toast.type === 'info' && <ShieldAlert className="w-5 h-5 text-indigo-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Offline Bill Clearance Management
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ● Manual Settlement Hub
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Process electricity, credit card, gas, water & broadband bills submitted by retailers with automatic refunds on rejection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchBills()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveStatusTab('pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStatusTab === 'pending'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pending</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{counts.pending}</p>
          <p className="text-[10px] text-amber-400/80 mt-1">Requires Claim / Action</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('processing')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStatusTab === 'processing'
              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Processing (Locked)</span>
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{counts.processing}</p>
          <p className="text-[10px] text-indigo-400/80 mt-1">Under Board Clearance</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('approved')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStatusTab === 'approved'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{counts.approved}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Settled with Operator Ref</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('rejected')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStatusTab === 'rejected'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Rejected & Refunded</span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{counts.rejected}</p>
          <p className="text-[10px] text-rose-400/80 mt-1">Wallet Refund Executed</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStatusTab === 'all'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Total Bills</span>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{counts.total}</p>
          <p className="text-[10px] text-purple-400/80 mt-1">All Offline Submissions</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start overflow-x-auto">
            <button
              onClick={() => setActiveStatusTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatusTab === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 text-[10px] font-black">{counts.pending}</span>
            </button>

            <button
              onClick={() => setActiveStatusTab('processing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatusTab === 'processing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Processing</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-950 text-indigo-300 text-[10px] font-black">{counts.processing}</span>
            </button>

            <button
              onClick={() => setActiveStatusTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatusTab === 'approved' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Approved</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-emerald-300 text-[10px] font-black">{counts.approved}</span>
            </button>

            <button
              onClick={() => setActiveStatusTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatusTab === 'rejected' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-950 text-rose-300 text-[10px] font-black">{counts.rejected}</span>
            </button>

            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatusTab === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Bills</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-950 text-purple-300 text-[10px] font-black">{counts.total}</span>
            </button>
          </div>

          {/* Service Filter & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Services</option>
              <option value="Electricity">Electricity</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Gas">Gas</option>
              <option value="Water">Water</option>
              <option value="Broadband">Broadband</option>
            </select>

            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Consumer #, Name, Mobile, Operator Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Bills Submissions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading bill submissions...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <FileText className="w-10 h-10 text-slate-500 mb-3" />
            <p className="text-base font-bold text-white">No bill submissions found</p>
            <p className="text-xs text-slate-500 mt-1">There are no bill records matching your filter selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Service & Provider</th>
                  <th className="py-3.5 px-4">Consumer Account Details</th>
                  <th className="py-3.5 px-4">Retailer Agent</th>
                  <th className="py-3.5 px-4">Amount Debited</th>
                  <th className="py-3.5 px-4">Elapsed Time</th>
                  <th className="py-3.5 px-4">Status & Operator Ref</th>
                  <th className="py-3.5 px-4 text-right">Actions & Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {bills.map((bill) => {
                  const elapsedMins = getElapsedMinutes(bill.created_at);
                  const isDelayed = bill.status === 'pending' && elapsedMins >= 30;

                  return (
                    <tr key={bill.id} className={`hover:bg-slate-800/40 transition-colors ${
                      isDelayed ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : ''
                    }`}>
                      {/* Service & Provider */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {getServiceBadge(bill.service_type)}
                        </div>
                        <p className="font-bold text-white mt-1">{bill.provider}</p>
                        {bill.bill_proof_url && (
                          <a
                            href={bill.bill_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" /> View Uploaded Bill PDF
                          </a>
                        )}
                      </td>

                      {/* Consumer Account Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-indigo-300 text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800 w-fit">
                          {bill.consumer_number}
                        </div>
                        {bill.customer_name && (
                          <p className="text-xs text-slate-200 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> {bill.customer_name}
                          </p>
                        )}
                        {bill.customer_mobile && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" /> {bill.customer_mobile}
                          </p>
                        )}
                      </td>

                      {/* Retailer Agent */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{bill.user_name || bill.user_id}</p>
                        <p className="text-[11px] text-slate-400">{bill.mobile_number || ''}</p>
                        {bill.firm_name && (
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{bill.firm_name}</p>
                        )}
                      </td>

                      {/* Amount Debited */}
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-black text-emerald-400">
                          ₹{Number(bill.total_debited).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Bill: ₹{Number(bill.amount).toFixed(2)} + Fee: ₹{Number(bill.charges || 0).toFixed(2)}
                        </p>
                      </td>

                      {/* Elapsed Time & Alert */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isDelayed ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                          <span className={`font-mono text-xs font-bold ${
                            isDelayed ? 'text-amber-400' : 'text-slate-300'
                          }`}>
                            {elapsedMins} mins ago
                          </span>
                        </div>
                        {isDelayed && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 mt-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> &gt;30m Delayed
                          </span>
                        )}
                      </td>

                      {/* Status & Operator Ref */}
                      <td className="py-3.5 px-4">
                        {bill.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                        {bill.status === 'processing' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              <Lock className="w-3 h-3 text-indigo-400" /> Processing (Locked)
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">By {bill.claimed_by || 'Admin'}</p>
                          </div>
                        )}
                        {bill.status === 'approved' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                            {bill.operator_ref && (
                              <p className="text-[11px] font-mono text-indigo-300 mt-0.5">Ref: {bill.operator_ref}</p>
                            )}
                          </div>
                        )}
                        {bill.status === 'rejected' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" /> Rejected (Refunded)
                            </span>
                            {bill.rejection_reason && (
                              <p className="text-[10px] text-rose-400/90 italic mt-0.5 truncate max-w-[130px]" title={bill.rejection_reason}>
                                "{bill.rejection_reason}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {bill.status === 'pending' && (
                            <button
                              onClick={() => handleClaimBill(bill.id)}
                              disabled={processingId === bill.id}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1"
                              title="Lock bill to prevent duplicate processing by other admins"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Claim / Lock</span>
                            </button>
                          )}

                          {(bill.status === 'pending' || bill.status === 'processing') && (
                            <>
                              <button
                                onClick={() => setApproveBillItem(bill)}
                                disabled={processingId === bill.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setRejectBillItem(bill)}
                                disabled={processingId === bill.id}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl inline-flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject & Refund</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setReceiptBill(bill)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                            title="View E-Receipt & Print"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVE BILL MODAL */}
      {approveBillItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Approve Bill Settlement</h3>
              </div>
              <button onClick={() => setApproveBillItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p><strong>Service:</strong> {approveBillItem.service_type} ({approveBillItem.provider})</p>
              <p><strong>Consumer #:</strong> <span className="font-mono text-indigo-300 font-bold">{approveBillItem.consumer_number}</span></p>
              <p><strong>Amount Debited:</strong> ₹{Number(approveBillItem.total_debited).toLocaleString('en-IN')}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operator / BBPS Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BBPS908129384710"
                  value={operatorRef}
                  onChange={(e) => setOperatorRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Receipt URL (Optional Proof)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={receiptProofUrl}
                  onChange={(e) => setReceiptProofUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setApproveBillItem(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={processingId === approveBillItem.id || !operatorRef.trim()}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50"
              >
                Approve & Mark Settled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT BILL MODAL (AUTOMATIC ATOMIC REFUND) */}
      {rejectBillItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Reject Bill & Execute Refund</h3>
              </div>
              <button onClick={() => setRejectBillItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 space-y-1">
              <p><strong>Consumer #:</strong> {rejectBillItem.consumer_number}</p>
              <p><strong>Retailer Agent:</strong> {rejectBillItem.user_name || rejectBillItem.user_id}</p>
              <p className="font-bold text-rose-200">
                Automatic Refund Amount: ₹{Number(rejectBillItem.total_debited).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Select Rejection Reason:</label>
              <select
                value={rejectionReasonSelect}
                onChange={(e) => setRejectionReasonSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-rose-500"
              >
                <option value="Invalid Consumer Number">Invalid Consumer Account Number</option>
                <option value="Consumer Account Blocked">Consumer Account Blocked / Disconnected</option>
                <option value="Amount Mismatch">Amount Mismatch with Electricity Board</option>
                <option value="Board Server Unreachable">Board Server / BBPS Portal Unreachable</option>
                <option value="Duplicate Bill Payment">Duplicate Bill Payment Claim</option>
                <option value="Other">Other / Custom Reason</option>
              </select>

              {rejectionReasonSelect === 'Other' && (
                <textarea
                  placeholder="Specify custom reason for retailer..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 h-20 focus:outline-none focus:border-rose-500"
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRejectBillItem(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processingId === rejectBillItem.id}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50"
              >
                Confirm & Refund ₹{Number(rejectBillItem.total_debited).toFixed(0)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-RECEIPT MODAL */}
      {receiptBill && (
        <EReceiptModal
          bill={receiptBill}
          onClose={() => setReceiptBill(null)}
        />
      )}
    </div>
  );
};

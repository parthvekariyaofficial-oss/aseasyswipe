import React, { useState, useEffect } from 'react';
import { billRequestApi } from '../../services/api';
import type { ChargeSlab, CreditCardBillRequest } from '../../types/billRequest';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Copy,
  Building2,
  User,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const AdminBillRequestsManagement: React.FC = () => {
  const [requests, setRequests] = useState<CreditCardBillRequest[]>([]);
  const [slabs, setSlabs] = useState<ChargeSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Rejection Modal
  const [rejectingReq, setRejectingReq] = useState<CreditCardBillRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Add Slab Modal
  const [isSlabModalOpen, setIsSlabModalOpen] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  // Settings Toggle State
  const { ccBillPayEnabled, toggleCcBillPay, fetchSettings: fetchCcSettings } = useSettingsStore();
  const [isTogglingCc, setIsTogglingCc] = useState(false);
  const [toggleNotice, setToggleNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      fetchCcSettings();
      const [reqRes, slabRes] = await Promise.all([
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        billRequestApi.getSlabs().catch(() => ({ success: false, slabs: [] }))
      ]);

      if (reqRes.success && Array.isArray(reqRes.requests)) {
        setRequests(reqRes.requests);
      }
      if (slabRes.success && Array.isArray(slabRes.slabs)) {
        setSlabs(slabRes.slabs);
      }
    } catch (err: any) {
      console.error('Failed to load bill requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleProcess = async (req: CreditCardBillRequest, action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !rejectingReq) {
      setRejectingReq(req);
      setRejectionReason('');
      return;
    }

    try {
      setSubmitting(true);
      const res = await billRequestApi.processRequest(
        req.id,
        action,
        action === 'rejected' ? rejectionReason : undefined
      );

      if (res.success) {
        showNotice('success', res.message);
        setRejectingReq(null);
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minAmount || !maxAmount || !chargeAmount) {
      showNotice('error', 'Please fill all slab fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await billRequestApi.createSlab({
        min_amount: Number(minAmount),
        max_amount: Number(maxAmount),
        charge_amount: Number(chargeAmount)
      });

      if (res.success) {
        showNotice('success', 'New charge slab created!');
        setIsSlabModalOpen(false);
        setMinAmount('');
        setMaxAmount('');
        setChargeAmount('');
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to add slab');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    try {
      setSubmitting(true);
      const res = await billRequestApi.deleteSlab(id);
      if (res.success) {
        showNotice('success', 'Slab deleted!');
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to delete slab');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCard = (card: string, id: string) => {
    navigator.clipboard.writeText(card);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleCc = async () => {
    setIsTogglingCc(true);
    setToggleNotice(null);
    try {
      const res = await toggleCcBillPay();
      if (res.success) {
        setToggleNotice({
          type: 'success',
          message: res.enabled 
            ? '✅ CC Bill Pay Service is ACTIVE! New request form & charge slabs are now VISIBLE to users.' 
            : '🔒 CC Bill Pay Service is OFF! New request form & charge slabs are HIDDEN, and "Service Temporarily Off" message is shown to users.'
        });
      } else {
        setToggleNotice({
          type: 'error',
          message: res.message || 'Failed to update Credit Card Bill Pay toggle.'
        });
      }
    } catch (err: any) {
      setToggleNotice({
        type: 'error',
        message: err.message || 'An unexpected error occurred while toggling Credit Card Bill Pay.'
      });
    } finally {
      setIsTogglingCc(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.card_number.includes(searchQuery) ||
      req.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.mobile_number.includes(searchQuery);

    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === req.status;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                CC Bill Payment Requests & Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Review offline Credit Card bill payments and control Retailer panel CC Bill Pay menu & route access
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions: Slabs Button & Toggle Switch in Top Right Corner */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsSlabModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-300 hover:text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Charge Slabs ({slabs.length})</span>
          </button>

          {/* TOP RIGHT CORNER: CC BILL PAY TOGGLE SWITCH */}
          <div className="flex items-center gap-3.5 bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-2xl shadow-inner">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <CreditCard className={`w-3.5 h-3.5 ${ccBillPayEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-xs font-black text-white">New Request & Slabs</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  ccBillPayEnabled 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {ccBillPayEnabled ? 'ACTIVE / VISIBLE' : 'SERVICE OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {ccBillPayEnabled 
                  ? 'Request form & slabs are visible to users' 
                  : 'Form & slabs hidden ("Service Temporarily Off" shown)'}
              </p>
            </div>

            {/* TOGGLE BUTTON */}
            <button
              type="button"
              role="switch"
              aria-checked={ccBillPayEnabled}
              disabled={isTogglingCc}
              onClick={handleToggleCc}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-inner ${
                ccBillPayEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
              } ${isTogglingCc ? 'opacity-70 cursor-not-allowed' : ''}`}
              title={ccBillPayEnabled ? 'Click to Turn OFF CC Bill Pay on User Panel' : 'Click to Turn ON CC Bill Pay on User Panel'}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center`}
              >
                {isTogglingCc ? (
                  <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
                ) : ccBillPayEnabled ? (
                  <Check className="w-3 h-3 text-emerald-600 font-bold" />
                ) : (
                  <X className="w-3 h-3 text-slate-500" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {toggleNotice && (
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          toggleNotice.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {toggleNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toggleNotice.message}</span>
          </div>
          <button onClick={() => setToggleNotice(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
            <p className="text-2xl font-black text-white mt-1">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejected & Refunded</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer, card, bank, mobile..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            All Requests ({requests.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Bill Payment Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs font-medium">Loading requests list...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-300">No requests found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? `No requests match "${searchQuery}"` : 'No credit card bill payment requests submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Retailer / Merchant</th>
                  <th className="py-3.5 px-4">Customer & Card</th>
                  <th className="py-3.5 px-4">Bank Name</th>
                  <th className="py-3.5 px-4">Bill Amount</th>
                  <th className="py-3.5 px-4">Slab Charge</th>
                  <th className="py-3.5 px-4">Total Debited</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    {/* Date & Time (1st Column) */}
                    <td className="py-4 px-4 whitespace-nowrap">
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

                    {/* Retailer */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-white">{req.user_name || 'Retailer'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">+91 {req.user_mobile || req.mobile_number}</p>
                    </td>

                    {/* Customer & Card */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-200">{req.customer_name}</p>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-400 font-bold mt-0.5">
                        <span>{req.card_number.replace(/(.{4})/g, '$1 ').trim()}</span>
                        <button
                          onClick={() => copyCard(req.card_number, req.id)}
                          className="text-slate-500 hover:text-indigo-300 transition"
                          title="Copy Full Card Number"
                        >
                          {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Bank Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{req.bank_name}</span>
                      </div>
                    </td>

                    {/* Bill Amount */}
                    <td className="py-4 px-4 font-black text-white">
                      ₹{Number(req.amount).toLocaleString('en-IN')}
                    </td>

                    {/* Slab Charge */}
                    <td className="py-4 px-4 font-bold text-amber-400">
                      ₹{req.service_charge}
                    </td>

                    {/* Total Debited */}
                    <td className="py-4 px-4 font-black text-emerald-400">
                      ₹{Number(req.total_amount).toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
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
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleProcess(req, 'approved')}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-950/40"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcess(req, 'rejected')}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-950/40"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reject Request & Refund Wallet?</h3>
                <p className="text-xs text-slate-400 mt-0.5">₹{Number(rejectingReq.total_amount).toLocaleString('en-IN')} will be credited back to user wallet instantly.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Invalid Card Details / Verification Failure"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProcess(rejectingReq, 'rejected')}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Reject & Refund Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHARGE SLABS MODAL */}
      {isSlabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Manage Dynamic Service Charge Slabs
              </h3>
              <button onClick={() => setIsSlabModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Slabs List */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">Current Charge Slabs</p>
              {slabs.map((slab) => (
                <div key={slab.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <p className="font-bold text-white">
                      ₹{Number(slab.min_amount).toLocaleString('en-IN')} to ₹{Number(slab.max_amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-400">₹{slab.charge_amount} Charge</span>
                    <button
                      onClick={() => handleDeleteSlab(slab.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                      title="Delete Slab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Slab Form */}
            <form onSubmit={handleAddSlab} className="pt-3 border-t border-slate-800 space-y-3">
              <p className="text-xs font-bold text-slate-300">Add New Service Charge Slab</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Min Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Max Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Charge (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  <Plus className="w-4 h-4" /> Add Charge Slab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

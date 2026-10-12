import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
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
  Info
} from 'lucide-react';

export const UserBillPaymentRequest: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  
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

  const loadData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate charge whenever amount or slabs change
  useEffect(() => {
    const numAmt = Number(amount);
    if (!numAmt || isNaN(numAmt) || numAmt <= 0) {
      setCalculatedCharge(25);
      return;
    }

    const matchingSlab = slabs.find(s => numAmt >= Number(s.min_amount) && numAmt <= Number(s.max_amount));
    if (matchingSlab) {
      setCalculatedCharge(Number(matchingSlab.charge_amount));
    } else {
      if (numAmt <= 50000) setCalculatedCharge(25);
      else if (numAmt <= 100000) setCalculatedCharge(50);
      else setCalculatedCharge(100);
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

        {/* Live Wallet Pill */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 self-end sm:self-auto">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <div className="text-right">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Main Wallet</p>
            <p className="text-sm font-black text-emerald-400">
              ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Bill Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
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

      {/* RECENT REQUESTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-3 p-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> My Bill Payment Requests History
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading request history...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No bill payment requests submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <th className="py-3 px-4">Customer & Card</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4">Bill Amount</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Total Debited</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{req.customer_name}</p>
                      <p className="text-[11px] font-mono text-indigo-400">
                        XXXX-XXXX-XXXX-{req.card_number.slice(-4)}
                      </p>
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

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(req.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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

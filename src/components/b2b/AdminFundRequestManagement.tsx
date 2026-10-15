import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import type { 
  UsePayActiveServiceItem, 
  UsePayAdminBankAccount, 
  ApiFundRequestRecord, 
  ApiWalletType 
} from '../../types/b2b';
import { 
  Check, Copy, RefreshCw, Upload, AlertCircle, 
  CheckCircle2, Clock, Landmark, Wallet, ArrowRight, ExternalLink,
  ShieldCheck, Layers, Eye, Zap, ArrowRightLeft, X
} from 'lucide-react';

export const AdminFundRequestManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Active Services (Filtered strictly: only active ones from API)
  const [activeServices, setActiveServices] = useState<UsePayActiveServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);

  // Admin Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<UsePayAdminBankAccount[]>([]);
  const [banksLoading, setBanksLoading] = useState<boolean>(true);

  // Form Fields
  const [walletType, setWalletType] = useState<ApiWalletType>('bbps');
  const [amount, setAmount] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [adminBankAccountId, setAdminBankAccountId] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ApiFundRequestRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [previewProofModal, setPreviewProofModal] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Fetch Active Services (Strictly excludes any inactive services)
  const loadActiveServices = async () => {
    setServicesLoading(true);
    try {
      const res = await b2bApi.getFundRequestActiveServices();
      if (res.success && Array.isArray(res.active_services)) {
        setActiveServices(res.active_services);
        if (res.active_services.length > 0) {
          const isCurrentActive = res.active_services.some(s => s.wallet_type === walletType);
          if (!isCurrentActive) {
            setWalletType(res.active_services[0].wallet_type);
          }
        }
      }
    } catch (err) {
      console.error('Fetch Active Services Error:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  // Fetch Bank Accounts for Deposit
  const loadBankAccounts = async () => {
    setBanksLoading(true);
    try {
      const res = await b2bApi.getAdminBankAccounts();
      if (res.success && Array.isArray(res.bank_accounts)) {
        setBankAccounts(res.bank_accounts);
        if (res.bank_accounts.length > 0 && !adminBankAccountId) {
          setAdminBankAccountId(res.bank_accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch Admin Bank Accounts Error:', err);
    } finally {
      setBanksLoading(false);
    }
  };

  // Fetch Fund Request History
  const loadHistory = async (isInitial = false) => {
    if (isInitial) setHistoryLoading(true);
    try {
      const res = await b2bApi.getFundRequestHistory();
      if (res.success && Array.isArray(res.requests)) {
        setHistoryList(res.requests);
      }
    } catch (err) {
      console.error('Fetch Fund Request History Error:', err);
    } finally {
      if (isInitial) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadActiveServices();
    loadBankAccounts();
    loadHistory(true);
  }, []);

  // Real-time Background Polling for Pending Requests (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadHistory(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // File Upload Handler (FileReader to Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Receipt image must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProofPreview(result);
        setProofUrl(result);
        setFormError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setFormError('Unique Bank Transaction Reference / UTR Number is required.');
      return;
    }

    if (!walletType) {
      setFormError('Please select a target wallet destination.');
      return;
    }

    const isWalletActive = activeServices.some(s => s.wallet_type === walletType);
    if (!isWalletActive && activeServices.length > 0) {
      setFormError(`The selected wallet service (${walletType.toUpperCase()}) is currently inactive on the API side.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await b2bApi.submitFundRequest({
        amount: numAmount,
        utr_number: cleanUtr,
        wallet_type: walletType,
        admin_bank_account_id: adminBankAccountId || undefined,
        proof_url: proofUrl || undefined
      });

      if (res.success) {
        setFormSuccess(res.message || 'Fund request submitted successfully and pending approval!');
        setAmount('');
        setUtrNumber('');
        setProofUrl('');
        setProofPreview(null);
        loadHistory(false);
        setTimeout(() => {
          setActiveTab('history');
        }, 1500);
      } else {
        setFormError(res.message || 'Failed to submit fund request.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error communicating with UsePay API server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Status Check
  const handleCheckStatus = async (requestId: string) => {
    setCheckingId(requestId);
    try {
      const res = await b2bApi.checkFundRequestStatus(requestId);
      if (res.success && res.data) {
        setHistoryList(prev => prev.map(item => {
          if (item.request_id === requestId || item.id === requestId) {
            return { ...item, status: res.data.status as any, updated_at: res.data.updated_at };
          }
          return item;
        }));
      }
    } catch (err: any) {
      console.error('Status check error:', err);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                API Wallet Top-Up (Fund Requests)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Upstream API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Top up your CSPL Fast Bill, BBPS Utility & Instant Payout API wallets with verified UTR deposits
            </p>
          </div>
        </div>

        {/* Tab switcher buttons in header */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'submit'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Submit Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Request History</span>
            {historyList.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold animate-pulse">
                {historyList.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CONTENT BASED ON ACTIVE TAB */}
      {activeTab === 'submit' ? (
        <div className="space-y-6">
          
          {/* 1. USEPAY DEPOSIT BANK ACCOUNTS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    UsePay Official Deposit Bank Accounts
                  </h2>
                  <p className="text-[11px] text-slate-400">Transfer funds to any account below and enter UTR in the form</p>
                </div>
              </div>
            </div>

            {banksLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading official bank accounts...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`p-4 rounded-2xl border transition relative ${
                      adminBankAccountId === bank.id
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-sm font-black text-white">{bank.bank_name}</span>
                        <p className="text-xs text-slate-400">{bank.account_holder_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminBankAccountId(bank.id)}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                          adminBankAccountId === bank.id
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {adminBankAccountId === bank.id ? '✓ Selected' : 'Select'}
                      </button>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{bank.account_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bank.account_number, `ac_${bank.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedText === `ac_${bank.id}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">IFSC Code:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-300 font-bold">{bank.ifsc_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bank.ifsc_code, `ifsc_${bank.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedText === `ifsc_${bank.id}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {bank.upi_id && (
                        <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
                          <span className="text-slate-400">UPI ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-300 font-bold">{bank.upi_id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bank.upi_id!, `upi_${bank.id}`)}
                              className="text-slate-400 hover:text-white"
                            >
                              {copiedText === `upi_${bank.id}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. SUBMISSION FORM */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
              
              {/* WALLET TYPE SELECTION (ONLY ACTIVE SERVICES SHOWN) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Target Destination Wallet (wallet_type)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    (Inactive API services are completely hidden)
                  </span>
                </div>

                {servicesLoading ? (
                  <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                    Checking active API wallet services...
                  </div>
                ) : activeServices.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>No wallet services are currently active from the UsePay API provider.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {activeServices.map((service) => (
                      <div
                        key={service.wallet_type}
                        onClick={() => setWalletType(service.wallet_type)}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          walletType === service.wallet_type
                            ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-90'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-white">{service.label}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${service.badge_color}`}>
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                            {service.service_title}
                          </p>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Balance:</span>
                          <span className="font-mono font-bold text-white">
                            ₹{service.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AMOUNT INPUT */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Deposit Amount (₹)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-3.5 text-sm text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[10000, 25000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-mono font-bold transition"
                    >
                      +₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* UTR NUMBER INPUT */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>3. Unique Bank Transaction Reference / UTR Number</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. UTR9876543210 or 12-digit Ref"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition placeholder-slate-600 tracking-wider"
                />
              </div>

              {/* ADMIN BANK ACCOUNT ID (OPTIONAL) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>4. Deposited Bank Account (admin_bank_account_id)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <select
                  value={adminBankAccountId}
                  onChange={(e) => setAdminBankAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:border-indigo-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="">-- None / Direct UPI Transfer --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number} ({b.account_holder_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* PROOF URL & SCREENSHOT UPLOAD (OPTIONAL) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>5. Payment Receipt Proof (proof_url)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="url"
                      value={proofUrl.startsWith('data:') ? '' : proofUrl}
                      onChange={(e) => {
                        setProofUrl(e.target.value);
                        setProofPreview(e.target.value || null);
                      }}
                      placeholder="https://example.com/receipt.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition placeholder-slate-600 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Direct public image link</span>
                  </div>

                  <div>
                    <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-900 text-xs text-slate-300 hover:text-white cursor-pointer transition">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Upload Receipt Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500 block mt-1">PNG, JPG, JPEG up to 5MB</span>
                  </div>
                </div>

                {proofPreview && (
                  <div className="mt-2 flex items-center gap-3 p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <img 
                      src={proofPreview} 
                      alt="Receipt Preview" 
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700" 
                    />
                    <div className="text-xs truncate flex-1">
                      <span className="text-emerald-400 font-bold block">✓ Receipt Attached</span>
                      <span className="text-slate-400 text-[11px] truncate block">Will be submitted as proof_url</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofPreview(null);
                        setProofUrl('');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* FEEDBACK BANNERS */}
              {formError && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting || activeServices.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-950/60 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Fund Request to UsePay API...</span>
                  </>
                ) : (
                  <>
                    <span>Submit B2B Fund Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      ) : (
        /* TAB 2: REQUEST HISTORY & LIVE STATUS */
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Submitted API Fund Requests Log
              </h2>
              <p className="text-xs text-slate-400">
                Live approval tracking for requests queued in UsePay Admin
              </p>
            </div>

            <button
              onClick={() => loadHistory(true)}
              disabled={historyLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700/80 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {historyLoading && historyList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading fund request records...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-300">No Fund Requests Found</p>
              <p className="text-xs text-slate-500">Submit a new request from the Submit Request tab above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Request ID</th>
                    <th className="py-3.5 px-4">Target Wallet</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">UTR Number</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {historyList.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-medium text-[11px]">
                        {new Date(req.submitted_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[130px]">{req.request_id}</span>
                          <button
                            onClick={() => handleCopy(req.request_id, req.request_id)}
                            className="text-slate-500 hover:text-white"
                            title="Copy Request ID"
                          >
                            {copiedText === req.request_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.wallet_type === 'cspl'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : req.wallet_type === 'payout'
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {req.wallet_type === 'cspl' && 'CSPL Fast Bill'}
                          {req.wallet_type === 'payout' && 'Bank Payout'}
                          {req.wallet_type === 'bbps' && 'BBPS Utility'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{req.utr_number}</span>
                          <button
                            onClick={() => handleCopy(req.utr_number, req.utr_number)}
                            className="text-slate-500 hover:text-white"
                            title="Copy UTR"
                          >
                            {copiedText === req.utr_number ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}>
                          {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === 'rejected' && <X className="w-3 h-3" />}
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span>{req.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {req.proof_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewProofModal(req.proof_url || null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="View Receipt Screenshot"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCheckStatus(req.request_id)}
                            disabled={checkingId === req.request_id}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                            title="Query live status from UsePay API"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${checkingId === req.request_id ? 'animate-spin' : ''}`} />
                            <span>Check Status</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROOF PREVIEW LIGHTBOX MODAL */}
      {previewProofModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewProofModal(null)}
        >
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-bold text-white">Payment Receipt Proof</span>
              <button 
                onClick={() => setPreviewProofModal(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl flex items-center justify-center bg-slate-950 p-2">
              <img 
                src={previewProofModal} 
                alt="Payment Receipt" 
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end pt-1">
              <a
                href={previewProofModal}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
              >
                <span>Open in new window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

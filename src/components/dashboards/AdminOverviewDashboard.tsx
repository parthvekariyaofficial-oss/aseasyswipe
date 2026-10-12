import React, { useState, useEffect } from 'react';
import { qrApi, userApi, billRequestApi, b2bApi } from '../../services/api';
import type { QrPaymentRequest } from '../../types/qr';
import type { UserProfile } from '../../types/auth';
import type { CreditCardBillRequest } from '../../types/billRequest';
import { UsePayBalanceWidget } from './UsePayBalanceWidget';
import { 
  CheckCircle2, ShieldCheck, Users, Building2, Wallet, 
  ArrowUpRight, Clock, RefreshCw, Coins, Award, Zap, CreditCard, Receipt
} from 'lucide-react';

export const AdminOverviewDashboard: React.FC = () => {
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [billRequestsList, setBillRequestsList] = useState<CreditCardBillRequest[]>([]);
  const [liveHistoryList, setLiveHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, userRes, billRes, b2bRes] = await Promise.all([
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] })),
        userApi.getHierarchy().catch(() => ({ success: false, users: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        b2bApi.getHistory().catch(() => ({ status: 'error', data: [] }))
      ]);

      if (reqRes.success && reqRes.payment_requests) {
        setRequestsList(reqRes.payment_requests);
      }
      if (userRes.success && userRes.users) {
        setUsersList(userRes.users);
      }
      if (billRes.success && billRes.requests) {
        setBillRequestsList(billRes.requests);
      }
      if (b2bRes && (b2bRes.status === 'success' || b2bRes.success) && Array.isArray(b2bRes.data)) {
        setLiveHistoryList(b2bRes.data);
      }
    } catch (err) {
      console.error('Fetch Overview Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter approved QR requests
  const approvedRequests = requestsList.filter(r => r.status === 'approved');
  const pendingRequests = requestsList.filter(r => r.status === 'pending');

  // Filter offline bill requests
  const approvedBillRequests = billRequestsList.filter(r => r.status === 'approved');
  const pendingBillRequests = billRequestsList.filter(r => r.status === 'pending');

  // Filter successful live BBPS payments
  const successfulLivePayments = liveHistoryList.filter(r => r.status === 'success' || r.status === 'approved');

  // 1. Total Approved QR Amount
  const totalApprovedAmount = approvedRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  // 2. Total Admin QR Charge Commission
  const totalAdminCommission = approvedRequests.reduce((acc, r) => {
    const chargeAmt = r.charge_amount || (Number(r.amount) * (Number(r.charge_percent || 0.5) / 100));
    const dsComm = Number(r.distributor_commission || 0);
    const msComm = Number(r.super_distributor_commission || 0);
    const adminComm = r.admin_commission !== undefined 
      ? Number(r.admin_commission) 
      : Math.max(0, chargeAmt - (dsComm + msComm));
    return acc + adminComm;
  }, 0);

  // 3. Total Distributor Earning (DS)
  const totalDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.distributor_commission || 0);
  }, 0);

  // 4. Total Master Distributor Earning (MS)
  const totalMasterDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.super_distributor_commission || 0);
  }, 0);

  // 5. CC Bill Service Charges Breakdown (Offline + Live BBPS)
  const offlineBillServiceCharge = approvedBillRequests.reduce((acc, r) => acc + Number(r.service_charge || 0), 0);
  const liveBillServiceCharge = successfulLivePayments.reduce((acc, r) => acc + Number(r.service_charge || r.charge_amount || r.charge || 0), 0);
  const totalBillServiceCharge = offlineBillServiceCharge + liveBillServiceCharge;

  // 6. CC Bill Volume Breakdown (Offline + Live BBPS)
  const offlineBillVolume = approvedBillRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const liveBillVolume = successfulLivePayments.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalApprovedBillAmount = offlineBillVolume + liveBillVolume;

  // Platform wallet stats
  const totalSystemBalance = usersList.reduce((acc, u) => acc + Number(u.wallet_balance || 0), 0);
  const activeUserCount = usersList.filter(u => u.status === 'Active').length;

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
      


      {/* USEPAY B2B AGENT API BALANCE INTEGRATION WIDGET */}
      <UsePayBalanceWidget />

      {/* ALL PRIMARY STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">

        {/* CARD 1: TOTAL APPROVED QR AMOUNT */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-emerald-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-emerald-400 tracking-wider">Total Approved QR Amt</span>
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-300/80 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{approvedRequests.length} Successful QR Load(s)</span>
          </div>
        </div>

        {/* CARD 2: TOTAL ADMIN QR CHARGE COMMISSION */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-indigo-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-indigo-400 tracking-wider">Admin QR Commission</span>
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalAdminCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-indigo-300/80 font-medium">
            <Coins className="w-3.5 h-3.5 text-indigo-400" />
            <span>Net Platform Revenue Margin</span>
          </div>
        </div>

        {/* CARD 3: TOTAL DISTRIBUTOR EARNING - DS */}
        <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-amber-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-amber-400 tracking-wider">Distributor Earning (DS)</span>
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-300/80 font-medium">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Total DS Markup Payouts</span>
          </div>
        </div>

        {/* CARD 4: TOTAL MASTER DISTRIBUTOR EARNING - MS */}
        <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:border-purple-500/50 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-extrabold text-purple-400 tracking-wider">Master Dist Earning (MS)</span>
            <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalMasterDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-purple-300/80 font-medium">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Total MS Hierarchy Payouts</span>
          </div>
        </div>

        {/* CARD 5: TOTAL CC BILL SERVICE CHARGE (OFFLINE + LIVE BREAKDOWN) */}
        <div className="bg-gradient-to-br from-pink-950/80 via-slate-900 to-slate-900 border border-pink-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-pink-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-extrabold text-pink-300 tracking-wider">CC Bill Service Charge</span>
            <div className="p-3 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          
          {/* OFFLINE VS LIVE SERVICE CHARGE BREAKDOWN */}
          <div className="mt-4 pt-3 border-t border-pink-500/20 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-pink-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Offline Charges</p>
              <p className="font-bold font-mono text-pink-300 mt-0.5">
                ₹{offlineBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-pink-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Live BBPS Charges</p>
              <p className="font-bold font-mono text-emerald-400 mt-0.5">
                ₹{liveBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 6: TOTAL CC BILL VOLUME (OFFLINE + LIVE BREAKDOWN) */}
        <div className="bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-cyan-500/60 transition group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-extrabold text-cyan-300 tracking-wider">Total CC Bill Volume</span>
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₹{totalApprovedBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {/* OFFLINE VS LIVE VOLUME BREAKDOWN */}
          <div className="mt-4 pt-3 border-t border-cyan-500/20 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-cyan-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Offline Volume</p>
              <p className="font-bold font-mono text-cyan-300 mt-0.5">
                ₹{offlineBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-cyan-500/20">
              <p className="text-[9px] uppercase font-extrabold text-slate-400">Live BBPS Volume</p>
              <p className="font-bold font-mono text-emerald-400 mt-0.5">
                ₹{liveBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* SECONDARY PLATFORM METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {pendingRequests.length} QR / {pendingBillRequests.length} CC Bill
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total User Live Wallet Balance</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              ₹{totalSystemBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Active Accounts</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{activeUserCount} / {usersList.length}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

    </div>
  );
};

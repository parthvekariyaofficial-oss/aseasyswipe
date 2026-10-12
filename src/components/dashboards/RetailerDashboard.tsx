import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Wallet, ShieldCheck, User, Store, Phone, CheckCircle2 } from 'lucide-react';

export const RetailerDashboard: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 w-full pb-10">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
              Retailer Merchant Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {user?.name || 'Retailer Merchant'}
            </h1>
            <p className="text-xs text-slate-400">
              Firm: <strong className="text-slate-200">{user?.firm_name}</strong> | Mobile: <span className="font-mono text-slate-300">{user?.mobile_number}</span>
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Main Wallet Balance</p>
              <p className="text-xl font-black text-white">
                ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ACCOUNT DETAILS CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" /> Account Security & Status Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</p>
            <p className="text-sm font-bold text-white">{user?.name}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Merchant Outlet</p>
            <p className="text-sm font-bold text-white">{user?.firm_name}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Registered Mobile</p>
            <p className="text-sm font-bold text-white font-mono">{user?.mobile_number}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">Account Status</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {user?.status || 'Active'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">KYC Status</p>
            <span className="inline-block px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
              {user?.kyc_status || 'Verified'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
            <p className="text-slate-500 font-semibold">Role Tier</p>
            <span className="inline-block px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

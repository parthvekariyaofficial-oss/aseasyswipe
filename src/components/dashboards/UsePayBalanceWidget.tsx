import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import type { UsePayBalanceData } from '../../types/b2b';
import { RefreshCw, AlertCircle, Server } from 'lucide-react';

export const UsePayBalanceWidget: React.FC = () => {
  const [balanceData, setBalanceData] = useState<UsePayBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean>(true);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await b2bApi.getUsepayBalance();
      if (res.success && res.data) {
        setBalanceData(res.data);
        setConfigured(res.configured !== false);
        setIsMock(Boolean(res.is_mock));
        if (res.message && res.is_mock) {
          setErrorMessage(res.message);
        }
      } else {
        setErrorMessage(res.message || 'Could not connect to UsePay API server');
      }
    } catch (err: any) {
      console.error('UsePay Balance Fetch Error:', err);
      setErrorMessage(err.response?.data?.message || 'Network error fetching UsePay balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);


  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">API Wallet</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                !isMock && configured
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {!isMock && configured ? 'Live Sync Active' : 'API Ready'}
              </span>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBalance}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Fetching...' : 'Sync Balance'}</span>
          </button>
        </div>
      </div>

      {/* ERROR OR NOTICE ALERT */}
      {errorMessage && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 space-y-1">
            <p className="font-bold">Notice / System Warning:</p>
            <p className="text-amber-300/90 leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-amber-400/80 italic pt-1">
              * Note: Ensure your server IP address is whitelisted in your UsePay B2B Agent Portal and valid <code className="font-mono font-bold text-white">x-api-key</code> & <code className="font-mono font-bold text-white">x-secret-key</code> headers are configured.
            </p>
          </div>
        </div>
      )}

      {/* WALLET BALANCES GRID - ONLY BBPS UTILITY & INSTANT PAYOUT WALLETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
        
        {/* WALLET 1: BBPS UTILITY WALLET */}
        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-5 hover:border-emerald-500/50 transition shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">BBPS Utility Wallet</span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
              balanceData?.is_bbps_enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {balanceData?.is_bbps_enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            ₹{Number(balanceData?.bbps_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-3 font-medium border-t border-slate-800/80 pt-2.5">
            <span>Usable BBPS Balance:</span>
            <span className="font-mono text-emerald-400 font-bold">
              ₹{Number(balanceData?.usable_bbps_balance || balanceData?.bbps_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* WALLET 2: INSTANT PAYOUT WALLET */}
        <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-5 hover:border-indigo-500/50 transition shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Instant Payout Wallet</span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
              balanceData?.is_payout_enabled ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {balanceData?.is_payout_enabled ? '24x7 Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            ₹{Number(balanceData?.payout_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-3 font-medium border-t border-slate-800/80 pt-2.5">
            <span>Bank Transfers:</span>
            <span className="text-indigo-300 font-bold">24x7 Instant Payouts</span>
          </div>
        </div>

      </div>

    </div>
  );
};


import React, { useState } from 'react';
import {
  Sparkles, Layers, Clock, ShieldCheck, Zap, TrendingUp,
  ArrowRight, Bell, CheckCircle2, Award, BarChart3, Lock
} from 'lucide-react';

export const DistributorCommissionDashboard: React.FC = () => {
  const [notified, setNotified] = useState(false);
  const [email, setEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setNotified(true);
    setToastMessage('✨ Success! You have been added to the Commission V2.5 early access notification list.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  const upcomingFeatures = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Real-Time Settlement Engine",
      description: "Instant line-by-line commission calculation and wallet auto-credits upon every retailer transaction."
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-400" />,
      title: "Multi-Tier Tree Analytics",
      description: "Comprehensive visual hierarchy tracking across Super Distributors, Distributors, and Retailer networks."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-400" />,
      title: "Custom Slab Configurator",
      description: "Dynamic fee and margin slab management with percentage & flat cashback structures per BBPS service."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-purple-400" />,
      title: "Automated Wallet Payouts",
      description: "One-click instant commission withdrawal into your primary working wallet with TPIN authorization."
    }
  ];

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen Upgrade In Progress
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Distributor Hierarchy & Commission Passbook
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              We are upgrading our enterprise multi-tier commission ledger and real-time passbook system to deliver higher throughput, automated payouts, and detailed margin reporting.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex-shrink-0">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Target Release</p>
              <p className="text-xs font-extrabold text-white">Version 2.5 Roadmap</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Coming Soon Card */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-xl shadow-2xl space-y-6">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5 rounded-3xl shadow-xl shadow-indigo-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Layers className="w-10 h-10 text-indigo-400" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Commission Tree & Slabs is Coming Soon
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              This module is currently undergoing scheduled architecture enhancements to introduce real-time Supabase RPC distribution, atomic wallet payouts, and exportable ledger certificates.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Development Status
              </span>
              <span className="text-indigo-400 font-extrabold">85% Completed</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 h-full rounded-full w-[85%] transition-all duration-1000" />
            </div>
          </div>

          {/* Early Notification Form */}
          <form onSubmit={handleSubscribe} className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <div className="relative w-full">
              <Bell className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Enter your admin email for early access..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={notified}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={notified}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {notified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Subscribed
                </>
              ) : (
                <>
                  Notify Me <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Feature Preview Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" /> What To Expect In Version 2.5
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 space-y-3 group"
            >
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl w-fit group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                {feat.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security & Compliance Guaranteed • 256-Bit Financial Encryption</span>
        </div>
        <span>AsEasySwipe Enterprise Network</span>
      </div>
    </div>
  );
};

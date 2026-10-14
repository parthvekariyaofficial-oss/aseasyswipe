import React, { useState, useEffect } from 'react';
import { userApi, qrApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import type { QrPaymentRequest } from '../../types/qr';
import { useAuthStore } from '../../store/authStore';
import { AddUserModal } from '../common/AddUserModal';
import { CreateTpinModal } from '../auth/CreateTpinModal';
import { Users, Wallet, RefreshCw, Store, UserPlus, QrCode, Coins, ArrowUpRight, Lock } from 'lucide-react';

export const DistributorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [retailers, setRetailers] = useState<UserProfile[]>([]);
  const [qrRequests, setQrRequests] = useState<QrPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateTpin, setShowCreateTpin] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hierarchyRes, qrRes] = await Promise.all([
        userApi.getHierarchy().catch(() => ({ success: false, users: [] })),
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] }))
      ]);

      if (hierarchyRes.success && Array.isArray(hierarchyRes.users)) {
        setRetailers(hierarchyRes.users.filter(u => u.role === 'user'));
      }
      if (qrRes.success && Array.isArray(qrRes.payment_requests)) {
        setQrRequests(qrRes.payment_requests);
      }
    } catch (err) {
      console.error('Fetch Hierarchy & QR Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approvedQr = qrRequests.filter(r => r.status === 'approved');
  const totalApprovedQrVolume = approvedQr.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalDsCommission = approvedQr.reduce((acc, r) => acc + Number(r.distributor_commission || 0), 0);
  const totalRetailerBalance = retailers.reduce((acc, r) => acc + Number(r.wallet_balance || 0), 0);

  return (
    <div className="space-y-6 w-full pb-10">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase">
              Distributor Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {user?.name}
            </h1>
            <p className="text-xs text-slate-400">
              Firm: <strong className="text-slate-200">{user?.firm_name}</strong> | Mobile: <span className="font-mono text-slate-300">{user?.mobile_number}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Create New Retailer</span>
            </button>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400">Distributor Wallet</p>
                <p className="text-lg font-black text-white font-mono">
                  ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TPIN SETUP NOTICE (IF NOT SET) */}
      {!user?.tpin_set && (
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/15 border border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Setup 4-Digit TPIN for Live Bill Pay & Instant Payout
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Action Needed</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                You have not created your 4-digit Transaction PIN yet. Create it now anytime so you can instantly pay bills and payout funds.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateTpin(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition shrink-0 cursor-pointer"
          >
            Create 4-Digit TPIN Now
          </button>
        </div>
      )}

      {/* PRIMARY STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Mapped Retailers</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{retailers.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Downline Outlets</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Downline Approved QR Volume</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              ₹{totalApprovedQrVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400/80 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{approvedQr.length} Approved Loads</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <QrCode className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">QR Commission Earned (DS)</p>
            <p className="text-2xl font-bold text-purple-300 mt-1 font-mono">
              ₹{totalDsCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-purple-400/80 mt-0.5">Markup Margin Revenue</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Downline Network Balance</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
              ₹{totalRetailerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Live Retailer Wallets</p>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MAPPED RETAILERS NETWORK TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Mapped Downstream Retailers ({retailers.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Retailer</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Network"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Retailer Outlet</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">QR Rent %</th>
                <th className="p-3">Wallet Balance</th>
                <th className="p-3 text-amber-400">Commission Earning</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Loading mapped retailers...
                  </td>
                </tr>
              ) : retailers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No mapped retailers found under your network. Click '+ Create New Retailer' to register one.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-slate-400">{r.firm_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono">{r.mobile_number}</td>
                    <td className="p-3 font-mono font-bold text-purple-300">
                      {r.qr_charge_percent !== undefined ? r.qr_charge_percent : r.charge_percentage || 0.50}%
                    </td>
                    <td className="p-3 font-bold text-emerald-400 font-mono">
                      ₹{Number(r.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-bold text-amber-400 font-mono">
                      ₹{Number(r.commission_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW RETAILER MODAL */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={fetchData}
        defaultRole="user"
      />

      {/* Create TPIN Modal from Dashboard */}
      {showCreateTpin && (
        <CreateTpinModal
          isOpen={true}
          user={user || undefined}
          onClose={() => setShowCreateTpin(false)}
          onSuccess={() => setShowCreateTpin(false)}
        />
      )}

    </div>
  );
};

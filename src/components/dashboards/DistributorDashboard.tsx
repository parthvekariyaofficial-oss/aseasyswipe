import React, { useState, useEffect } from 'react';
import { userApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import { useAuthStore } from '../../store/authStore';
import { AddUserModal } from '../common/AddUserModal';
import { Users, Wallet, RefreshCw, Store, UserPlus } from 'lucide-react';

export const DistributorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [retailers, setRetailers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchRetailers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getHierarchy();
      if (res.success) {
        setRetailers(res.users.filter(u => u.role === 'user'));
      }
    } catch (err) {
      console.error('Fetch Hierarchy Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, []);

  return (
    <div className="space-y-6 w-full pb-10">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase">
              Distributor (DS) Dashboard
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
                <p className="text-lg font-black text-white">
                  ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
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
              onClick={fetchRetailers}
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
        onUserAdded={fetchRetailers}
        defaultRole="user"
      />

    </div>
  );
};

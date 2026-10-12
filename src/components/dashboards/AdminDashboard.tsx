import React, { useState, useEffect } from 'react';
import { userApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import { AddUserModal } from '../common/AddUserModal';
import { 
  ShieldAlert, CheckCircle, Wallet, Search, Filter, 
  UserPlus, RefreshCw, Users, Lock, Activity, Edit, Trash2, Calendar, Building2
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getHierarchy();
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    let nextStatus = 'Active';
    if (currentStatus === 'Active') nextStatus = 'Inactive';
    else if (currentStatus === 'Inactive') nextStatus = 'Blocked';
    else nextStatus = 'Active';

    try {
      const res = await userApi.updateStatus({ targetUserId: userId, newStatus: nextStatus });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleWalletAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;

    try {
      const res = await userApi.updateStatus({
        targetUserId: selectedUser.id,
        walletAdjustAmount: parseFloat(adjustAmount)
      });

      if (res.success) {
        setSelectedUser(null);
        setAdjustAmount('');
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Wallet adjustment failed');
    }
  };



  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        const res = await userApi.deleteUser(userId);
        if (res.success) {
          setUsers(prev => prev.filter(u => u.id !== userId));
          fetchUsers();
        } else {
          alert(res.message || 'Failed to delete user.');
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete user.');
      }
    }
  };

  const formatJoiningDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const adminUsers = users.filter(u => u.role === 'admin');
  const nonAdminUsers = users.filter(u => u.role !== 'admin');

  const filteredUsers = nonAdminUsers.filter(u => {
    const name = u.name || '';
    const firmName = u.firm_name || '';
    const mobileNumber = u.mobile_number || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mobileNumber.includes(searchTerm);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPlatformBalance = nonAdminUsers.reduce((acc, u) => acc + (u.wallet_balance || 0), 0);
  const activeCount = nonAdminUsers.filter(u => u.status === 'Active').length;
  const blockedCount = nonAdminUsers.filter(u => u.status === 'Blocked').length;
  const pendingKycCount = nonAdminUsers.filter(u => u.kyc_status === 'pending').length;

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* TOP ACTION BAR */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center space-x-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New User</span>
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total User Live Wallet Balance</p>
            <p className="text-xl font-bold text-purple-300 mt-1">
              ₹{totalPlatformBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Active Accounts</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{activeCount} / {nonAdminUsers.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Blocked Security Lockouts</p>
            <p className="text-xl font-bold text-red-400 mt-1">{blockedCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Pending KYC Submissions</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{pendingKycCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. DOWNSTREAM USER & MERCHANT HIERARCHY TABLE */}
      <div className="space-y-4">
        
        {/* FILTER SEARCH BAR */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Merchant Accounts</h3>
              <p className="text-[11px] text-slate-400">Super Distributors (MS), Distributors (DS) & Retailers</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, firm, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl p-2 focus:outline-none"
              >
                <option value="ALL">All Hierarchy Roles</option>
                <option value="super_distributor">Super Distributor (MS)</option>
                <option value="distributor">Distributor (DS)</option>
                <option value="user">Retailer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl p-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Firm Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">Wallet Balance</th>
                  <th className="p-4 text-amber-400">Commission Earning</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Loading hierarchy user records...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No users found matching search filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* USER DETAILS */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`} 
                            alt={u.name} 
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email || u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* FIRM NAME */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{u.firm_name}</span>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          u.role === 'super_distributor' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          u.role === 'distributor' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {u.role === 'super_distributor' ? 'Super Dist (MS)' : u.role === 'distributor' ? 'Distributor (DS)' : 'Retailer'}
                        </span>
                      </td>

                      {/* MOBILE */}
                      <td className="p-4 font-mono">{u.mobile_number}</td>

                      {/* WALLET BALANCE */}
                      <td className="p-4 font-bold text-white font-mono">
                        ₹{Number(u.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* COMMISSION BALANCE */}
                      <td className="p-4 font-bold text-amber-400 font-mono">
                        ₹{Number(u.commission_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* JOINING DATE */}
                      <td className="p-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatJoiningDate(u.created_at)}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          u.status === 'Blocked' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* TOGGLE STATUS SWITCH */}
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            title={`Current status: ${u.status}. Click to toggle.`}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              u.status === 'Active' ? 'bg-emerald-500' : u.status === 'Blocked' ? 'bg-rose-600' : 'bg-amber-500'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                u.status === 'Active' ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* EDIT ICON */}
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Edit User Details"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/60 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* DELETE ICON */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete User"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700/60 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* EDIT USER MODAL */}
      <AddUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUserAdded={fetchUsers}
        distributors={users.filter(u => u.role === 'distributor')}
        userToEdit={editingUser}
      />

      {/* WALLET BALANCE ADJUST MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white">Adjust User Balance</h3>
            <p className="text-xs text-slate-400">User: <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.firm_name})</p>

            <form onSubmit={handleWalletAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adjustment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. +5000 or -1000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONBOARD NEW USER MODAL */}
      <AddUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserAdded={fetchUsers}
        distributors={users.filter(u => u.role === 'distributor')}
        allUsers={users}
      />

    </div>
  );
};

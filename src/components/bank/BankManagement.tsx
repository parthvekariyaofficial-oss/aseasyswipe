import React, { useState, useEffect } from 'react';
import { bankApi } from '../../services/api';
import type { BankAccount, CreateBankInput } from '../../types/bank';
import {
  Landmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  AlertTriangle,
  X,
  RefreshCw,
  Calendar
} from 'lucide-react';

export const BankManagement: React.FC = () => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form input state (Only Bank Name & Active Status)
  const [formData, setFormData] = useState<CreateBankInput>({
    bank_name: '',
    is_active: true
  });

  const popularBanks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Bank of Baroda',
    'Punjab National Bank',
    'Kotak Mahindra Bank',
    'IndusInd Bank',
    'Canara Bank',
    'Union Bank of India'
  ];

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const res = await bankApi.getBankList();
      if (res.success && Array.isArray(res.banks)) {
        setBanks(res.banks);
      }
    } catch (err: any) {
      console.error('Failed to load banks:', err);
      showNotice('error', err.response?.data?.message || 'Failed to load bank list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
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

  const handleOpenAddModal = () => {
    setEditingBank(null);
    setFormData({
      bank_name: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      is_active: bank.is_active
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_name.trim()) {
      showNotice('error', 'Please enter a Bank Name');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBank) {
        const res = await bankApi.updateBank(editingBank.id, formData);
        if (res.success) {
          showNotice('success', 'Bank entry updated successfully!');
          setIsModalOpen(false);
          fetchBanks();
        }
      } else {
        const res = await bankApi.createBank(formData);
        if (res.success) {
          showNotice('success', 'New bank entry created successfully!');
          setIsModalOpen(false);
          fetchBanks();
        }
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to save bank entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (bank: BankAccount) => {
    try {
      // Optimistic UI update
      setBanks(prev =>
        prev.map(b => (b.id === bank.id ? { ...b, is_active: !b.is_active } : b))
      );
      const res = await bankApi.toggleBankStatus(bank.id);
      if (res.success) {
        showNotice('success', res.message);
      } else {
        fetchBanks();
      }
    } catch (err: any) {
      fetchBanks();
      showNotice('error', err.response?.data?.message || 'Failed to toggle bank status');
    }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      setSubmitting(true);
      const res = await bankApi.deleteBank(id);
      if (res.success) {
        showNotice('success', 'Bank entry deleted successfully!');
        setDeleteConfirmId(null);
        fetchBanks();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to delete bank entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search logic
  const filteredBanks = banks.filter(bank => {
    const matchesSearch = bank.bank_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'active'
        ? bank.is_active
        : !bank.is_active;

    return matchesSearch && matchesFilter;
  });

  const activeCount = banks.filter(b => b.is_active).length;
  const inactiveCount = banks.filter(b => !b.is_active).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={fetchBanks}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-sm"
          title="Refresh bank list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transition duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bank</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
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

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bank List</p>
            <p className="text-2xl font-black text-white mt-1">{banks.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active Banks</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Inactive Banks</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search bank name..."
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
            All Banks ({banks.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'active'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === 'inactive'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Bank List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs font-medium">Loading bank list...</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Landmark className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-300">No bank entries found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No bank matches "${searchQuery}"`
                : 'Click "+ Add Bank" at the top right corner to create your first bank entry.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
              >
                <Plus className="w-4 h-4" /> Add New Bank
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <th className="py-3.5 px-6">Bank Name</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-center">On / Off Status Toggle</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredBanks.map(bank => (
                  <tr key={bank.id} className="hover:bg-slate-800/40 transition group">
                    {/* Bank Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-300 text-sm shrink-0">
                          {bank.bank_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition">
                            {bank.bank_name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {bank.created_at
                            ? new Date(bank.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* On / Off Status Toggle Switch */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(bank)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            bank.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          title={`Click to turn ${bank.is_active ? 'OFF' : 'ON'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              bank.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-[10px] font-extrabold ${bank.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {bank.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </td>

                    {/* Action Buttons: Edit & Delete */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(bank)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5 px-3"
                          title="Edit Bank Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(bank.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition flex items-center gap-1.5 px-3"
                          title="Delete Bank Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">Delete</span>
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

      {/* ADD / EDIT BANK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">
                  {editingBank ? 'Edit Bank Name' : 'Add New Bank Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Popular Banks Quick Select */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Popular Bank Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                  {popularBanks.map(bName => (
                    <button
                      key={bName}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, bank_name: bName }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                        formData.bank_name === bName
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {bName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Name Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Bank Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Bank Name (e.g. State Bank of India)"
                  value={formData.bank_name}
                  onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Status Toggle Field */}
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">Bank Status (On / Off)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enable or disable this bank</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Landmark className="w-4 h-4" />
                  )}
                  <span>{editingBank ? 'Save Changes' : 'Create Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Bank Entry?</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
              Are you sure you want to permanently delete this bank entry from the system list?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBank(deleteConfirmId)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Bank</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

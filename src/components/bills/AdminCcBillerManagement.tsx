import React, { useState, useEffect, useMemo } from 'react';
import { b2bApi } from '../../services/api';
import type { Biller } from '../../types/b2b';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sliders,
  Check,
  X,
  Filter,
  Eye,
  EyeOff,
  Building2,
  AlertCircle
} from 'lucide-react';

export const AdminCcBillerManagement: React.FC = () => {
  const [billers, setBillers] = useState<Biller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch billers from API
  const fetchBillers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await b2bApi.getAdminCcBillers();
      if (res && res.success && Array.isArray(res.data)) {
        setBillers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load credit card billers:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load credit card billers from server.'
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillers(true);
  }, []);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Handle single toggle
  const handleToggle = async (biller: Biller) => {
    const newStatus = !biller.is_active;
    setTogglingId(biller.biller_id);

    // Optimistic UI Update
    setBillers(prev => prev.map(b => {
      if (b.biller_id === biller.biller_id) {
        return { ...b, is_active: newStatus };
      }
      return b;
    }));

    try {
      const res = await b2bApi.toggleCcBiller(biller.biller_id, newStatus);
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: `${biller.biller_name} is now ${newStatus ? 'ON (Visible in dropdown)' : 'OFF (Hidden from dropdown)'}.`
        });
      } else {
        // Rollback
        setBillers(prev => prev.map(b => {
          if (b.biller_id === biller.biller_id) {
            return { ...b, is_active: !newStatus };
          }
          return b;
        }));
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to update biller status.'
        });
      }
    } catch (err: any) {
      // Rollback
      setBillers(prev => prev.map(b => {
        if (b.biller_id === biller.biller_id) {
          return { ...b, is_active: !newStatus };
        }
        return b;
      }));
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error updating biller status.'
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Bulk Toggle
  const handleBulkToggle = async (targetActive: boolean) => {
    const actionText = targetActive ? 'ENABLE ALL' : 'DISABLE ALL';
    if (!window.confirm(`Are you sure you want to ${actionText} credit card billers?`)) {
      return;
    }

    setBulkLoading(true);
    // Optimistic Update
    setBillers(prev => prev.map(b => ({ ...b, is_active: targetActive })));

    try {
      const res = await b2bApi.bulkToggleCcBillers(targetActive);
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: targetActive
            ? 'All billers have been turned ON (Visible in Live Bill Pay).'
            : 'All billers have been turned OFF (Hidden from Live Bill Pay).'
        });
      }
    } catch (err: any) {
      fetchBillers(false);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to apply bulk toggle.'
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Filtered List
  const filteredBillers = useMemo(() => {
    return billers.filter(b => {
      const matchesSearch =
        (b.biller_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.biller_id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const isActive = b.is_active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [billers, searchQuery, statusFilter]);

  const activeCount = billers.filter(b => b.is_active !== false).length;
  const inactiveCount = billers.filter(b => b.is_active === false).length;

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/50">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">ccbiller</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Live Bill Pay Biller Control
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Turn credit card billers ON or OFF. Billers toggled OFF are immediately hidden from the retailer Live Bill Pay dropdown.
            </p>
          </div>
        </div>

        {/* TOP QUICK ACTIONS */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={bulkLoading || loading}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Enable All</span>
          </button>

          <button
            onClick={() => handleBulkToggle(false)}
            disabled={bulkLoading || loading}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Disable All</span>
          </button>

          <button
            onClick={() => fetchBillers(true)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 disabled:opacity-50"
            title="Refresh Billers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* TOTAL BILLERS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Synced Billers</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{billers.length}</p>
          <p className="text-[11px] text-slate-400">Credit card billers in directory</p>
        </div>

        {/* ACTIVE BILLERS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Active Billers (Visible)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{activeCount}</p>
          <p className="text-[11px] text-slate-400">Shown in Live Bill Pay dropdown</p>
        </div>

        {/* INACTIVE BILLERS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Disabled Billers (Hidden)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <EyeOff className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{inactiveCount}</p>
          <p className="text-[11px] text-slate-400">Completely hidden from dropdown</p>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bank name or biller ID (e.g. HDFC, SBI, ICIC, AXIS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({billers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'inactive'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

      </div>

      {/* BILLERS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Showing {filteredBillers.length} Credit Card Billers</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Toggle switch changes take effect immediately on live bill pay
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading credit card billers directory...</p>
          </div>
        ) : filteredBillers.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">No Billers Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No credit card biller banks matched your search query or selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Bank / Biller Name</th>
                  <th className="p-3.5">Biller ID</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Live Dropdown Status</th>
                  <th className="p-3.5 text-right">ON / OFF Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredBillers.map((biller, idx) => {
                  const isActive = biller.is_active !== false;
                  const isCurrentToggling = togglingId === biller.biller_id;

                  return (
                    <tr
                      key={biller.biller_id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !isActive ? 'opacity-70 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="font-bold text-white text-xs">
                            {biller.biller_name}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px] font-bold">
                          {biller.biller_id}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400">
                        {biller.category || 'Credit Card'}
                      </td>

                      <td className="p-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ON (Visible in Dropdown)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>OFF (Hidden from Dropdown)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          disabled={isCurrentToggling || bulkLoading}
                          onClick={() => handleToggle(biller)}
                          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                            isActive ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                          } ${isCurrentToggling ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={isActive ? 'Click to Turn OFF (Hide from Dropdown)' : 'Click to Turn ON (Show in Dropdown)'}
                        >
                          <span className="w-5 h-5 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center">
                            {isCurrentToggling ? (
                              <RefreshCw className="w-2.5 h-2.5 text-slate-700 animate-spin" />
                            ) : isActive ? (
                              <Check className="w-3 h-3 text-emerald-600 font-bold" />
                            ) : (
                              <X className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

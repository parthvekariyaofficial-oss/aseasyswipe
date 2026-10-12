import React, { useState, useEffect } from 'react';
import { statementApi } from '../../services/api';
import type { AccountStatement, StatementFilterParams } from '../../types/statement';
import { PrintStatementModal } from './PrintStatementModal';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Search, Printer,
  Download, RefreshCw, Calendar, FileText, CheckCircle2,
  Copy, Check, ShieldCheck, Filter, Users, Sparkles, UserCheck
} from 'lucide-react';

export const AdminMasterStatement: React.FC = () => {
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Users List for Selector Dropdown
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // empty string = All Users

  // Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDatePill, setActiveDatePill] = useState<string>('month');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & UI State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Users List
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await statementApi.getUsersList();
        if (res.success && Array.isArray(res.users)) {
          setUsersList(res.users);
        }
      } catch (err) {
        console.error('Fetch users list error:', err);
      }
    };
    fetchUsers();
    handleDatePillChange('month');
  }, []);

  const handleDatePillChange = (pill: string) => {
    setActiveDatePill(pill);
    const now = new Date();

    if (pill === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (pill === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (pill === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (pill === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (pill === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const params: StatementFilterParams = {};
      if (selectedUserId) params.targetUserId = selectedUserId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await statementApi.getAdminStatement(params);
      if (res.success && res.statement) {
        setStatement(res.statement);
      }
    } catch (err) {
      console.error('Fetch admin statement error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [selectedUserId, startDate, endDate, typeFilter, categoryFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStatement();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (!statement || !statement.entries || statement.entries.length === 0) {
      alert('No transactions available to export.');
      return;
    }

    const headers = ['Date & Time', 'Merchant Name', 'Mobile', 'Reference / UTR', 'Type', 'Category', 'Title', 'Narration', 'Math Breakdown', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance', 'Status'];
    const rows = statement.entries.map(e => [
      `"${new Date(e.created_at).toLocaleString('en-IN')}"`,
      `"${e.user_name || statement.account_details.name}"`,
      `"${e.user_mobile || statement.account_details.mobile_number || ''}"`,
      `"${e.reference_id || ''}"`,
      `"${e.type}"`,
      `"${e.category}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.narration || '').replace(/"/g, '""')}"`,
      `"${(e.math_breakdown || '').replace(/"/g, '""')}"`,
      e.type === 'DEBIT' ? e.net_amount.toFixed(2) : '0.00',
      e.type === 'CREDIT' ? e.net_amount.toFixed(2) : '0.00',
      e.running_balance.toFixed(2),
      `"${e.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Admin_Master_Statement_${selectedUserId || 'All_Users'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = statement?.summary;
  const account = statement?.account_details;
  const isSingleUser = Boolean(selectedUserId);

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {isSingleUser ? (
          <div className="text-xs text-slate-400 font-medium">
            Account: <span className="text-white font-bold">{account?.name}</span> ({account?.firm_name} • {account?.mobile_number})
          </div>
        ) : <div />}

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={!statement || statement.entries.length === 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Passbook
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!statement || statement.entries.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* USER SELECTOR DROPDOWN BAR */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Select Target Account:</span>
        </div>

        <div className="w-full sm:w-96">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="">🏢 All Users (Company-Wide Master View)</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                👤 {u.name} ({u.firm_name || 'Retailer'}) - {u.mobile_number} [₹{Number(u.wallet_balance || 0).toFixed(2)}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5-SUMMARY CARDS GRID */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] uppercase font-bold text-slate-400">{isSingleUser ? 'Opening Balance' : 'System Baseline'}</p>
            <p className="text-lg font-black text-white mt-1">
              ₹{summary.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Total Inflow (Credits)
            </p>
            <p className="text-lg font-black text-emerald-400 mt-1">
              +₹{summary.total_credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-900 border border-rose-500/20 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Total Outflow (Debits)
            </p>
            <p className="text-lg font-black text-rose-400 mt-1">
              -₹{summary.total_debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-purple-500/10 border border-amber-500/30 p-4 rounded-2xl shadow-md">
            <p className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Platform Commission
            </p>
            <p className="text-lg font-black text-amber-300 mt-1">
              ₹{summary.total_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">{isSingleUser ? 'User Earnings' : 'Combined Distribution'}</p>
          </div>

          <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl col-span-2 sm:col-span-1 shadow-md">
            <p className="text-[10px] uppercase font-bold text-indigo-400">{isSingleUser ? 'User Net Balance' : 'Total System Float'}</p>
            <p className="text-xl font-black text-white mt-1">
              ₹{summary.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">{summary.total_entries_count} Entries in Period</p>
          </div>

        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-2xl text-xs">
            <button
              onClick={() => handleDatePillChange('today')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeDatePill === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePillChange('yesterday')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeDatePill === 'yesterday' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => handleDatePillChange('week')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeDatePill === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDatePillChange('month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeDatePill === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePillChange('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeDatePill === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePill('custom');
                }}
                className="bg-transparent text-slate-200 focus:outline-none"
              />
            </div>
            <span className="text-slate-500">to</span>
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePill('custom');
                }}
                className="bg-transparent text-slate-200 focus:outline-none"
              />
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by UTR, merchant, card, A/C..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none flex-1 sm:flex-none cursor-pointer"
            >
              <option value="ALL">All Flow (Cr & Dr)</option>
              <option value="CREDIT">Credits Only (+ Inflow)</option>
              <option value="DEBIT">Debits Only (- Outflow)</option>
              <option value="REFUND">Refunds Only (Reversals)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none flex-1 sm:flex-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="QR_LOAD">QR Add Money</option>
              <option value="PAYOUT">Bank Payout</option>
              <option value="CC_BILL">Credit Card Bill</option>
              <option value="BBPS_BILL">BBPS Bill</option>
              <option value="REFUND">Refunds</option>
            </select>
          </div>

        </div>
      </div>

      {/* ENTRIES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            {isSingleUser ? `${account?.name} Passbook Log` : 'Master Company Ledger Entries'}
          </h2>
          <span className="text-xs text-slate-400">
            Showing {statement?.entries.length || 0} entries
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-400" />
            Compiling master statement...
          </div>
        ) : !statement || statement.entries.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Date & Time</th>
                  {!isSingleUser && <th className="py-3 px-4">Merchant Account</th>}
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4">Narration & Math Breakdown</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Debit (Dr)</th>
                  <th className="py-3 px-4 text-right">Credit (Cr)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {statement.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(entry.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>

                    {!isSingleUser && (
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{entry.user_name || 'Merchant'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{entry.user_mobile}</div>
                      </td>
                    )}

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300 text-xs">
                      {entry.reference_id || '—'}
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <div className="font-bold text-white text-xs">{entry.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{entry.narration}</div>
                      {entry.math_breakdown && (
                        <div className="mt-1 inline-block bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md font-mono text-[10px] text-indigo-300">
                          {entry.math_breakdown}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-950 border border-slate-800 text-slate-300">
                        {entry.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-black text-rose-400 text-xs">
                      {entry.type === 'DEBIT' ? (
                        `-₹${entry.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-slate-600 font-normal">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-black text-emerald-400 text-xs">
                      {entry.type === 'CREDIT' ? (
                        `+₹${entry.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-slate-600 font-normal">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-black text-white text-xs">
                      ₹{entry.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        entry.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : entry.status === 'REFUNDED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : entry.status === 'FAILED' || entry.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {entry.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT STATEMENT MODAL */}
      <PrintStatementModal
        statement={statement}
        startDate={startDate}
        endDate={endDate}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import { 
  Clock, Search, RefreshCw, CheckCircle2, AlertCircle, 
  Receipt, Landmark, ShieldCheck, UserCheck, ArrowUpRight,
  X, RotateCcw, Activity
} from 'lucide-react';

export const AdminLiveBillPayHistory: React.FC = () => {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{
    item: any;
    data: any;
  } | null>(null);

  const fetchAdminHistory = async () => {
    setLoading(true);
    try {
      const res = await b2bApi.getHistory();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin live bill pay history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminHistory();
  }, []);

  const handleCheckStatus = async (item: any) => {
    const txnId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
    if (!txnId) return;
    setCheckingStatusId(txnId);
    try {
      const res = await b2bApi.checkStatus(txnId);
      setStatusModal({
        item,
        data: res
      });
      fetchAdminHistory();
    } catch (err: any) {
      setStatusModal({
        item,
        data: {
          status: 'failed',
          payment_status: 'failed',
          message: err.response?.data?.message || err.message || 'Unable to check live transaction status'
        }
      });
    } finally {
      setCheckingStatusId(null);
    }
  };

  // Filter Logic
  const filteredHistory = historyList.filter(item => {
    const matchesSearch = 
      (item.biller_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.biller_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customer_mobile || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.client_transaction_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.bbps_txn_ref_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const itemStatus = (item.status || '').toLowerCase();
    const isSuccess = itemStatus === 'success' || itemStatus === 'approved';
    const isPending = itemStatus === 'pending';
    const isFailed = itemStatus === 'failed' || itemStatus === 'rejected';

    if (statusFilter === 'success') return matchesSearch && isSuccess;
    if (statusFilter === 'pending') return matchesSearch && isPending;
    if (statusFilter === 'failed') return matchesSearch && isFailed;
    return matchesSearch;
  });

  // Calculate Metrics
  const totalVolume = historyList
    .filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const successCount = historyList.filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved').length;
  const pendingCount = historyList.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const failedCount = historyList.filter(i => (i.status || '').toLowerCase() === 'failed' || (i.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">LiveBillPay History</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                BBPS System Master Audit Log
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Real-Time System-Wide Audit Log of All BBPS Credit Card Bill Payments
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminHistory}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold flex items-center gap-2 transition shadow-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL VOLUME */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Live BBPS Volume</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">
            ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Approved Settlement Volume
          </p>
        </div>

        {/* SUCCESSFUL PAYMENTS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Successful Transactions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{successCount}</p>
          <p className="text-[11px] text-slate-400 font-medium">Completed via BBPS Gateway</p>
        </div>

        {/* PENDING TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending / Processing</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{pendingCount}</p>
          <p className="text-[11px] text-amber-400 font-medium">Processing at Biller Network</p>
        </div>

        {/* FAILED TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Failed / Rejected</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{failedCount}</p>
          <p className="text-[11px] text-rose-400 font-medium">Gateway Error / Network Rejection</p>
        </div>

      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* SEARCH BOX */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search User / Mobile / Biller / Txn ID / Ref ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* STATUS FILTER PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Records ({historyList.length})
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'success'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Success ({successCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'failed'
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Failed ({failedCount})
            </button>
          </div>

        </div>
      </div>

      {/* MASTER HISTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-400" />
            Showing {filteredHistory.length} Live Bill Pay Records
          </h2>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Merchant / User ID</th>
                  <th className="p-3.5">Biller Bank</th>
                  <th className="p-3.5">Customer Name & Mobile</th>
                  <th className="p-3.5">Bill Amount (₹)</th>
                  <th className="p-3.5">Charge (₹)</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Transaction Ref IDs</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistory.map((item, idx) => {
                  const itemId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
                  const isCheckingThis = checkingStatusId === itemId;

                  return (
                    <tr key={itemId || idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 text-slate-400 font-sans">
                        {new Date(item.created_at || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <p className="font-bold text-white flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          {item.user_id || 'System User'}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-white font-sans">{item.biller_name || item.biller_id}</p>
                        <span className="text-[10px] text-indigo-400">{item.biller_id}</span>
                      </td>
                      <td className="p-3.5 font-sans">
                        <p className="font-bold text-white">{item.customer_name || 'VALUED CARD HOLDER'}</p>
                        <p className="text-[10px] text-slate-400">{item.customer_mobile || item.mobile}</p>
                      </td>
                      <td className="p-3.5 font-black text-white text-xs font-mono">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-bold text-pink-400 text-xs font-mono">
                        +₹{Number(item.service_charge || item.charge_amount || item.charge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {item.status === 'success' || item.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Success
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        <p className="text-slate-300 font-bold">{item.client_transaction_id || item.id}</p>
                        {item.bbps_txn_ref_id && (
                          <p className="text-emerald-400 text-[10px]">BBPS: {item.bbps_txn_ref_id}</p>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <button
                          onClick={() => handleCheckStatus(item)}
                          disabled={isCheckingThis}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isCheckingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <Activity className="w-3.5 h-3.5 text-purple-200" />
                              <span>Check Status</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No live credit card bill pay records found matching your filters.
          </div>
        )}
      </div>

      {/* LIVE STATUS RESULT MODAL */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Live Biller Status Check</h3>
                  <p className="text-[11px] text-slate-400">Direct query response from UsePay BBPS Biller Network</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const resData = statusModal.data?.data || statusModal.data || {};
              const mainStatus = (statusModal.data?.status || resData.status || resData.current_status || 'unknown').toLowerCase();
              const isSuccess = mainStatus === 'success';
              const isPending = mainStatus === 'pending';
              const isFailed = mainStatus === 'failed';

              return (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    isSuccess 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : isPending 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                    {isPending && <Clock className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />}
                    {isFailed && <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        {isSuccess && 'Payment Confirmed by Biller (HTTP 200)'}
                        {isPending && 'Processing at Biller (HTTP 202)'}
                        {isFailed && 'Payment Failed / Auto-Refunded'}
                      </h4>
                      <p className="text-xs font-mono mt-0.5 opacity-90">
                        BBPS Status: <span className="font-bold">{resData.bbps_status || resData.current_status || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Failure / Refund Info Message */}
                  {(resData.message || resData.refund_status) && (
                    <div className="bg-rose-950/30 border border-rose-800/40 p-3.5 rounded-2xl text-xs space-y-1">
                      {resData.message && <p className="text-rose-200 font-medium">{resData.message}</p>}
                      {resData.refund_status && (
                        <div className="flex items-center gap-2 text-rose-400 font-bold pt-1 font-mono">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund Status: {resData.refund_status}</span>
                          {resData.refunded_amount && (
                            <span className="text-white"> (₹{resData.refunded_amount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transaction Details Grid */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-xs font-mono space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Biller:</span>
                      <span className="font-bold text-white font-sans">{statusModal.item.biller_name || statusModal.item.biller_id}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Customer / Card Holder:</span>
                      <span className="font-bold text-white font-sans">{statusModal.item.customer_name || 'VALUED CARD HOLDER'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Amount:</span>
                      <span className="font-black text-emerald-400 text-sm">₹{Number(statusModal.item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">Client Txn ID:</span>
                      <span className="font-bold text-slate-200">{resData.client_transaction_id || statusModal.item.client_transaction_id || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400 font-sans">BBPS Txn Ref ID:</span>
                      <span className="font-bold text-indigo-300">{resData.bbps_txn_ref_id || resData.transaction_id || statusModal.item.bbps_txn_ref_id || 'N/A'}</span>
                    </div>

                    {resData.approval_ref_number && (
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                        <span className="text-slate-400 font-sans">Approval Ref No:</span>
                        <span className="font-bold text-emerald-300">{resData.approval_ref_number}</span>
                      </div>
                    )}

                    {resData.polled_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-sans">Polled At:</span>
                        <span className="text-slate-400 text-[11px]">{new Date(resData.polled_at).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStatusModal(null)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
              >
                Close & Refresh
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


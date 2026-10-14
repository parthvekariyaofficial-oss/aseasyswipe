import React, { useState, useEffect } from 'react';
import { kycApi } from '../../services/api';
import type { KycVerificationRecord } from '../../types/auth';
import { 
  ShieldCheck, CheckCircle2, XCircle, Search, Filter, 
  RefreshCw, Eye, Clock, AlertCircle, Building2, Phone, Calendar,
  CreditCard, FileText, Store, Landmark, X, ZoomIn, Loader2
} from 'lucide-react';

export const AdminKycManagement: React.FC = () => {
  const [requests, setRequests] = useState<KycVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [viewingRequest, setViewingRequest] = useState<KycVerificationRecord | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'pan' | 'aadhaar_front' | 'aadhaar_back' | 'firm_selfie' | 'cheque'>('pan');
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [rejectingRequest, setRejectingRequest] = useState<KycVerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await kycApi.getAdminKycRequests();
      if (res.success && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Fetch KYC Requests Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (record: KycVerificationRecord) => {
    if (!window.confirm(`Are you sure you want to APPROVE KYC for ${record.user?.name || record.user_id}? This will immediately unlock their dashboard.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await kycApi.reviewKycRequest({
        kyc_id: record.id,
        user_id: record.user_id,
        action: 'approve'
      });
      if (res.success) {
        alert('KYC Approved successfully!');
        setViewingRequest(null);
        fetchRequests();
      } else {
        alert(res.message || 'Failed to approve KYC');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Server error approving KYC.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectionReason.trim()) {
      alert('Please enter a valid rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await kycApi.reviewKycRequest({
        kyc_id: rejectingRequest.id,
        user_id: rejectingRequest.user_id,
        action: 'reject',
        rejection_reason: rejectionReason.trim()
      });
      if (res.success) {
        alert('KYC Rejected. User can now view the reason and re-upload documents.');
        setRejectingRequest(null);
        setRejectionReason('');
        setViewingRequest(null);
        fetchRequests();
      } else {
        alert(res.message || 'Failed to reject KYC');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Server error rejecting KYC.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const user = r.user || {};
    const name = user.name || '';
    const firm = user.firm_name || '';
    const mobile = user.mobile_number || '';
    const userId = r.user_id || '';

    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.includes(searchTerm) ||
      userId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'under_review' || r.status === 'pending').length;
  const verifiedCount = requests.filter(r => r.status === 'verified').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getDocUrl = (req: KycVerificationRecord, tab: typeof activeDocTab) => {
    switch (tab) {
      case 'pan': return req.pan_card_url;
      case 'aadhaar_front': return req.aadhaar_front_url;
      case 'aadhaar_back': return req.aadhaar_back_url;
      case 'firm_selfie': return req.firm_selfie_url;
      case 'cheque': return req.cheque_url;
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>KYC Verification Management</span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCount} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted merchant onboarding documents, verify details, and approve/reject user dashboard access.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Pending Review</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Approved KYC</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{verifiedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Rejected Submissions</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Submissions</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by User Name, Mobile, Firm Name, or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="under_review">Under Review (Pending)</option>
            <option value="verified">Verified (Approved)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Firm / Business</th>
                <th className="p-4">Role</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4">KYC Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading KYC verification requests...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No KYC requests found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const user = req.user || {};
                  const isPending = req.status === 'under_review' || req.status === 'pending';
                  const isApproved = req.status === 'verified';
                  const isRejected = req.status === 'rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition">
                      {/* USER DETAILS */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-white text-sm">{user.name || 'Unnamed User'}</p>
                          <p className="text-[11px] text-indigo-400 font-mono mt-0.5">{user.mobile_number || req.user_id}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{user.email || req.id}</p>
                        </div>
                      </td>

                      {/* FIRM NAME */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{user.firm_name || 'N/A'}</span>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {user.role || 'Retailer'}
                        </span>
                      </td>

                      {/* SUBMITTED AT */}
                      <td className="p-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatDate(req.submitted_at || req.created_at)}</span>
                        </div>
                      </td>

                      {/* KYC STATUS */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                          isApproved 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                        }`}>
                          {isApproved ? '✓ Verified' : isRejected ? '✕ Rejected' : '⏳ Under Review'}
                        </span>
                        {isRejected && req.rejection_reason && (
                          <p className="text-[10px] text-rose-400/80 mt-1 max-w-[200px] truncate" title={req.rejection_reason}>
                            {req.rejection_reason}
                          </p>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setViewingRequest(req);
                              setActiveDocTab('pan');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Docs</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition"
                                title="Approve KYC"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingRequest(req);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition"
                                title="Reject KYC"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>KYC Documents Review</span>
                  <span className="text-xs text-indigo-400 font-normal">
                    — {viewingRequest.user?.name || viewingRequest.user_id} ({viewingRequest.user?.firm_name})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Mobile: {viewingRequest.user?.mobile_number} • Submitted: {formatDate(viewingRequest.submitted_at)}
                </p>
              </div>

              <button
                onClick={() => setViewingRequest(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DOCUMENT TABS */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 overflow-x-auto">
              <button
                onClick={() => setActiveDocTab('pan')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                  activeDocTab === 'pan' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>1. PAN Card</span>
              </button>

              <button
                onClick={() => setActiveDocTab('aadhaar_front')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                  activeDocTab === 'aadhaar_front' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>2. Aadhaar (Front)</span>
              </button>

              <button
                onClick={() => setActiveDocTab('aadhaar_back')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                  activeDocTab === 'aadhaar_back' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>3. Aadhaar (Back)</span>
              </button>

              <button
                onClick={() => setActiveDocTab('firm_selfie')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                  activeDocTab === 'firm_selfie' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>4. Firm Selfie</span>
              </button>

              <button
                onClick={() => setActiveDocTab('cheque')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 ${
                  activeDocTab === 'cheque' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>5. Bank Cheque</span>
              </button>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center bg-black/40 min-h-[350px]">
              {getDocUrl(viewingRequest, activeDocTab) ? (
                <div className="max-w-2xl w-full flex flex-col items-center">
                  <img
                    src={getDocUrl(viewingRequest, activeDocTab)}
                    alt={activeDocTab}
                    className="max-h-[480px] w-auto object-contain rounded-2xl border border-slate-700 shadow-2xl"
                  />
                  <a
                    href={getDocUrl(viewingRequest, activeDocTab)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold underline"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Open full original image in new tab</span>
                  </a>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">No image available for this document.</p>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Status: <span className="font-bold text-white uppercase">{viewingRequest.status}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>

                {(viewingRequest.status === 'under_review' || viewingRequest.status === 'pending') && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setRejectingRequest(viewingRequest);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject KYC</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(viewingRequest)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve KYC & Unlock Dashboard</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject KYC Submission</h3>
                <p className="text-xs text-slate-400">User: {rejectingRequest.user?.name || rejectingRequest.user_id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Please specify the exact reason for rejecting this KYC. The user will see this message and be asked to re-upload clear documents.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Aadhaar back photo is blurry / Name on PAN does not match registration."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { qrApi } from '../../services/api';
import { supabase } from '../../lib/supabase';
import type { QrMaster, QrPaymentRequest } from '../../types/qr';
import { 
  QrCode, Plus, Power, RefreshCw, Copy, Check, Eye, Trash2, 
  Upload, Building2, Phone, Percent, Edit, AlertCircle, CheckCircle2, Star,
  ChevronDown, FileText
} from 'lucide-react';

export const QRMasterManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'master' | 'set_qr'>('set_qr');
  const [qrList, setQrList] = useState<QrMaster[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State for Entry / Edit
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [defaultChargePercent, setDefaultChargePercent] = useState('0.50');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [editingQrId, setEditingQrId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // System Controls State (2 Toggle Buttons)
  const [userQrVisible, setUserQrVisible] = useState(true);
  const [qrRequestSectionEnabled, setQrRequestSectionEnabled] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Set QR Tab States (Image 2 Design)
  const [selectedQrId, setSelectedQrId] = useState<string>('');
  const [settlementMode, setSettlementMode] = useState<'normal' | 't1'>('normal');
  const [paymentRequests, setPaymentRequests] = useState<QrPaymentRequest[]>([]);

  const fetchQrList = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await qrApi.getQrList();
      if (res.success) {
        setQrList(res.qr_masters || []);
        const active = res.qr_masters.find((q: QrMaster) => q.is_selected) || res.qr_masters[0];
        if (active && !selectedQrId) {
          setSelectedQrId(active.id);
        }
      }

      const reqRes = await qrApi.getPaymentRequests();
      if (reqRes.success) {
        setPaymentRequests(reqRes.payment_requests || []);
      }

      const setRes = await qrApi.getSettings();
      if (setRes.success && setRes.settings) {
        setUserQrVisible(setRes.settings.user_qr_visible !== false);
        setQrRequestSectionEnabled(setRes.settings.qr_request_section_enabled !== false);
      }
    } catch (err) {
      console.error('Fetch QR List Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleToggleUserQrVisibility = async () => {
    const nextVal = !userQrVisible;
    setUserQrVisible(nextVal);
    setUpdatingSettings(true);
    try {
      await qrApi.updateSettings({ user_qr_visible: nextVal });
    } catch (err) {
      console.error('Toggle QR Visibility Error:', err);
      setUserQrVisible(!nextVal);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleQrRequestSection = async () => {
    const nextVal = !qrRequestSectionEnabled;
    setQrRequestSectionEnabled(nextVal);
    setUpdatingSettings(true);
    try {
      await qrApi.updateSettings({ qr_request_section_enabled: nextVal });
    } catch (err) {
      console.error('Toggle QR Request Section Error:', err);
      setQrRequestSectionEnabled(!nextVal);
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    fetchQrList(true);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setQrImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetForm = () => {
    setName('');
    setMobileNumber('');
    setUpiId('');
    setDefaultChargePercent('0.50');
    setQrImageUrl('');
    setImagePreview(null);
    setEditingQrId(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !mobileNumber.trim() || !upiId.trim()) {
      setErrorMessage('QR Name, Mobile Number, and UPI ID are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        mobile_number: mobileNumber,
        upi_id: upiId,
        default_charge_percent: parseFloat(defaultChargePercent) || 0.50,
        qr_image_url: qrImageUrl
      };

      let res;
      if (editingQrId) {
        res = await qrApi.updateQrMaster(editingQrId, payload);
      } else {
        res = await qrApi.createQrMaster(payload);
      }

      if (res.success) {
        setSuccessMessage(res.message || 'QR Master saved successfully!');
        handleResetForm();
        fetchQrList();
      } else {
        setErrorMessage(res.message || 'Failed to save QR Master.');
      }
    } catch (err: any) {
      console.error('Save QR Master Error:', err);
      const msg = err.response?.data?.message || err.message || 'Error occurred while saving QR Master.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (qr: QrMaster) => {
    setEditingQrId(qr.id);
    setName(qr.name);
    setMobileNumber(qr.mobile_number);
    setUpiId(qr.upi_id);
    setDefaultChargePercent(String(qr.default_charge_percent || 0.50));
    setQrImageUrl(qr.qr_image_url);
    setImagePreview(qr.qr_image_url);
    setActiveTab('master');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await qrApi.toggleQrStatus(id);
      if (res.success) {
        fetchQrList();
      }
    } catch (err) {
      alert('Failed to toggle QR status.');
    }
  };

  const handleDelete = async (id: string, qrName: string) => {
    if (window.confirm(`Are you sure you want to delete QR Master "${qrName}"?`)) {
      try {
        const res = await qrApi.deleteQrMaster(id);
        if (res.success) {
          fetchQrList();
        }
      } catch (err) {
        alert('Failed to delete QR Master.');
      }
    }
  };

  const handleSelectActiveQr = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await qrApi.selectActiveQr(id);
      if (res.success) {
        setSuccessMessage(res.message);
        setSelectedQrId(id);
        await fetchQrList();
      } else {
        setErrorMessage(res.message || 'Failed to set active QR.');
      }
    } catch (err: any) {
      console.error('Select Active QR Error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to set active QR for User Panel.');
    }
  };

  const handleCopyUpi = (upi: string, id: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* TOP CONTROL BAR: TABS & ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('set_qr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'set_qr' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Set Active User QR
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'master' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            QR Master Entry
          </button>
        </div>

        <button
          onClick={() => fetchQrList(true)}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition shadow-sm self-end sm:self-auto"
          title="Refresh Real-time Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2 TOGGLE CONTROLS BANNER (USER QR INVISIBLE & QR REQUEST SECTION OFF) */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">System & User Panel Control Switches</h3>
              <p className="text-[11px] text-slate-400">Real-time admin toggles to make user QR image invisible and turn off request section.</p>
            </div>
          </div>
          {updatingSettings && (
            <span className="text-xs text-purple-400 font-mono animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* TOGGLE 1: USER SIDE QR VISIBILITY */}
          <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
            userQrVisible 
              ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' 
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="space-y-1 max-w-[75%]">
              <div className="flex items-center gap-2 flex-wrap">
                <Eye className={`w-4 h-4 ${userQrVisible ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-xs font-extrabold text-white">User Side Active QR Image</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                  userQrVisible 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {userQrVisible ? 'VISIBLE (ON)' : 'INVISIBLE (HIDDEN)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {userQrVisible 
                  ? 'Active QR is visible to users on Add Money panel.' 
                  : 'QR Image is invisible/hidden on user panel with notice message.'}
              </p>
            </div>

            {/* TOGGLE SWITCH BUTTON 1 */}
            <button
              onClick={handleToggleUserQrVisibility}
              disabled={updatingSettings}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                userQrVisible ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300" />
            </button>
          </div>

          {/* TOGGLE 2: QR REQUEST SECTION ON/OFF */}
          <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
            qrRequestSectionEnabled 
              ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' 
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div className="space-y-1 max-w-[75%]">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className={`w-4 h-4 ${qrRequestSectionEnabled ? 'text-indigo-400' : 'text-amber-400'}`} />
                <span className="text-xs font-extrabold text-white">QR Payment Request Section</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                  qrRequestSectionEnabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {qrRequestSectionEnabled ? 'SECTION ONLINE' : 'SECTION OFF (DISABLED)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {qrRequestSectionEnabled 
                  ? 'Retailers can submit UTR payment requests normally.' 
                  : 'Entire request section is turned OFF with warning message.'}
              </p>
            </div>

            {/* TOGGLE SWITCH BUTTON 2 */}
            <button
              onClick={handleToggleQrRequestSection}
              disabled={updatingSettings}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${
                qrRequestSectionEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300" />
            </button>
          </div>

        </div>
      </div>

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: QR MASTER ENTRY & TABLE */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          
          {/* ENTRY FORM CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingQrId ? <Edit className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-purple-400" />}
                {editingQrId ? 'Edit QR Master Entry' : 'Create New QR Master Entry'}
              </h3>
              {editingQrId && (
                <button
                  onClick={handleResetForm}
                  className="text-xs text-rose-400 hover:underline font-bold"
                >
                  Cancel Editing
                </button>
              )}
            </div>

            <form onSubmit={handleSaveEntry} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* UPLOAD QR IMAGE (LEFT 4 COLS) */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 text-center">
                <label className="relative cursor-pointer group w-full flex flex-col items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-700 group-hover:border-purple-500 bg-slate-900/80 flex flex-col items-center justify-center transition shadow-inner overflow-hidden relative p-2">
                    {imagePreview ? (
                      <img src={imagePreview} alt="QR Code Preview" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-purple-400 mb-2 transition" />
                        <span className="text-[11px] font-extrabold text-slate-400 group-hover:text-slate-200 tracking-wider">
                          UPLOAD QR IMAGE
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">PNG, JPG, or SVG</span>
                      </>
                    )}
                  </div>
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setQrImageUrl(''); }}
                    className="text-[10px] text-rose-400 hover:underline font-bold"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {/* FORM FIELDS (RIGHT 8 COLS) */}
              <div className="md:col-span-8 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* QR NAME */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      QR NAME <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <QrCode className="w-4 h-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC Retail QR"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  {/* MOBILE NUMBER */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      MOBILE NUMBER <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-slate-500" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit Mobile Number"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* UPI ID */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      UPI ID <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="merchant@paytm"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>

                  {/* DEFAULT QR RENT % */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      QR RENT RATE % (INFO ONLY) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Percent className="w-4 h-4 text-slate-500" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.50"
                        value={defaultChargePercent}
                        onChange={(e) => setDefaultChargePercent(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Rent rate for reference. Not deducted in calculations.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingQrId && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingQrId ? 'Update Entry' : 'Save Entry'}
                  </button>
                </div>

              </div>

            </form>
          </div>

          {/* QR MASTERS TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" /> All QR Master Entries ({qrList.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Real-time status synced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">QR Image</th>
                    <th className="p-4">QR Name</th>
                    <th className="p-4">Mobile</th>
                    <th className="p-4">UPI ID</th>
                    <th className="p-4">Rent % (Info Only)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Loading QR Masters...
                      </td>
                    </tr>
                  ) : qrList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No QR Master entries registered yet. Fill out the form above to add your first QR.
                      </td>
                    </tr>
                  ) : (
                    qrList.map((qr) => (
                      <tr key={qr.id} className="hover:bg-slate-800/40 transition">
                        {/* QR IMAGE */}
                        <td className="p-4">
                          <img
                            src={qr.qr_image_url}
                            alt={qr.name}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-700"
                          />
                        </td>

                        {/* NAME */}
                        <td className="p-4 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            {qr.is_selected && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                            <span>{qr.name}</span>
                          </div>
                        </td>

                        {/* MOBILE */}
                        <td className="p-4 font-mono text-slate-300">{qr.mobile_number}</td>

                        {/* UPI ID */}
                        <td className="p-4 font-mono text-purple-300">
                          <div className="flex items-center gap-2">
                            <span>{qr.upi_id}</span>
                            <button
                              onClick={() => handleCopyUpi(qr.upi_id, qr.id)}
                              className="text-slate-500 hover:text-white transition"
                              title="Copy UPI ID"
                            >
                              {copiedId === qr.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* DEFAULT % */}
                        <td className="p-4 font-bold text-emerald-400 font-mono">
                          {qr.default_charge_percent}%
                        </td>

                        {/* STATUS */}
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            qr.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {qr.is_active ? 'Active (ON)' : 'Inactive (OFF)'}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            
                            {/* ON/OFF TOGGLE SWITCH */}
                            <button
                              onClick={() => handleToggleActive(qr.id)}
                              title={`Current state: ${qr.is_active ? 'ON' : 'OFF'}. Click to toggle.`}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                qr.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  qr.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>

                            {/* EDIT ICON */}
                            <button
                              onClick={() => handleEdit(qr)}
                              title="Edit QR Details"
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/60 transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* DELETE ICON */}
                            <button
                              onClick={() => handleDelete(qr.id, qr.name)}
                              title="Delete QR"
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
      )}

      {/* TAB 2: SET ACTIVE USER QR PAGE (Image 2 Design) */}
      {activeTab === 'set_qr' && (() => {
        const currentActiveQr = qrList.find(q => q.is_selected) || qrList[0];
        const selectedQrObj = qrList.find(q => q.id === selectedQrId) || currentActiveQr;
        
        const activeQrRequests = paymentRequests.filter(r => currentActiveQr && (r.qr_master_id === currentActiveQr.id || r.qr_name === currentActiveQr.name));
        const relevantRequests = activeQrRequests.length > 0 ? activeQrRequests : paymentRequests;

        const approvedAmount = relevantRequests
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);

        const totalEntries = relevantRequests.length;
        const pendingCount = relevantRequests.filter(r => r.status === 'pending').length;
        const approvedCount = relevantRequests.filter(r => r.status === 'approved').length;
        const rejectedCount = relevantRequests.filter(r => r.status === 'rejected').length;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT CARD: SELECT & SET ACTIVE QR FORM */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 flex flex-col justify-between">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Upload / Set Active QR</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select a unique name for this QR code (e.g. PhonePe_01) to track its entries.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* SELECT QR NAME DROPDOWN */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    SELECT QR NAME <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedQrId || (currentActiveQr ? currentActiveQr.id : '')}
                      onChange={(e) => setSelectedQrId(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none focus:border-purple-500 appearance-none transition"
                    >
                      <option value="">Select QR Name...</option>
                      {qrList.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name} ({q.upi_id}) {q.is_selected ? '★ [ACTIVE]' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* WHATSAPP / MOBILE NUMBER INPUT */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    WHATSAPP NUMBER
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="WhatsApp Number (e.g. 919876543210)"
                      value={selectedQrObj ? selectedQrObj.mobile_number : ''}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* UPDATE NOW BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedQrId || (currentActiveQr ? currentActiveQr.id : '');
                    if (targetId) handleSelectActiveQr(targetId);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Now</span>
                </button>
              </div>
            </div>

            {/* RIGHT CARD: CURRENT ACTIVE QR & LIVE STATS DISPLAY */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              
              {/* HEADER ROW */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                      Current Active QR
                    </h4>
                    <p className="text-xs text-slate-400">This QR is currently being shown to users.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    LIVE NOW
                  </span>
                  <button onClick={() => fetchQrList(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* BODY: QR DISPLAY + STATS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* LARGE QR IMAGE CONTAINER */}
                <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
                  <div className="p-3 bg-white rounded-2xl border border-slate-700 shadow-2xl">
                    <img
                      src={currentActiveQr ? currentActiveQr.qr_image_url : 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=none'}
                      alt={currentActiveQr ? currentActiveQr.name : 'No Active QR'}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="text-xs font-mono font-extrabold text-purple-300 truncate w-full px-2">
                    {currentActiveQr?.upi_id}
                  </p>
                </div>

                {/* STATS CARDS GRID */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* ROW 1: NAME & WHATSAPP */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                      <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">ACTIVE QR NAME</p>
                      <p className="text-sm font-extrabold text-white mt-1 truncate">{currentActiveQr ? currentActiveQr.name : 'N/A'}</p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                      <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">WHATSAPP TARGET</p>
                      <p className="text-sm font-mono font-extrabold text-white mt-1 truncate">{currentActiveQr ? currentActiveQr.mobile_number : 'N/A'}</p>
                    </div>
                  </div>

                  {/* ROW 2: APPROVED AMOUNT & TOTAL ENTRIES */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-4">
                      <p className="text-[9px] uppercase font-extrabold text-emerald-400 tracking-wider">APPROVED AMOUNT</p>
                      <p className="text-xl font-black text-emerald-400 mt-1 font-mono">
                        ₹{approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                      <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">TOTAL ENTRIES</p>
                      <p className="text-xl font-black text-white mt-1 font-mono">{totalEntries}</p>
                    </div>
                  </div>

                  {/* ROW 3: ENTRY STATUS BREAKDOWN */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">ENTRY STATUS BREAKDOWN</p>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-lg font-black text-amber-400 font-mono">{pendingCount}</p>
                        <p className="text-[9px] font-bold text-amber-300 uppercase">PENDING</p>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-lg font-black text-emerald-400 font-mono">{approvedCount}</p>
                        <p className="text-[9px] font-bold text-emerald-300 uppercase">APPROVED</p>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <p className="text-lg font-black text-rose-400 font-mono">{rejectedCount}</p>
                        <p className="text-[9px] font-bold text-rose-300 uppercase">REJECTED</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
};

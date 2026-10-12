import React, { useState } from 'react';
import type { BillSubmission } from '../../types/bills';
import {
  Printer, Download, X, CheckCircle2, ShieldCheck, Zap, CreditCard,
  Droplets, Flame, Wifi, Building2, User, Phone, FileText, Check
} from 'lucide-react';

interface EReceiptModalProps {
  bill: BillSubmission;
  onClose: () => void;
  isOpen?: boolean;
}

export const EReceiptModal: React.FC<EReceiptModalProps> = ({ bill, onClose, isOpen }) => {
  if (isOpen === false) return null;
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'Electricity': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Credit Card': return <CreditCard className="w-5 h-5 text-indigo-400" />;
      case 'Water': return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'Gas': return <Flame className="w-5 h-5 text-rose-400" />;
      case 'Broadband': return <Wifi className="w-5 h-5 text-purple-400" />;
      default: return <FileText className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = printMode === 'thermal' ? `
      body {
        font-family: 'Courier New', monospace;
        width: 80mm;
        margin: 0 auto;
        padding: 10px;
        color: #000;
        font-size: 11px;
      }
      .text-center { text-align: center; }
      .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
      .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
      .font-bold { font-weight: bold; }
      .paid-stamp {
        border: 2px solid #000;
        padding: 4px;
        text-align: center;
        font-weight: bold;
        margin: 10px 0;
        text-transform: uppercase;
      }
    ` : `
      body {
        font-family: Arial, sans-serif;
        padding: 30px;
        color: #1e293b;
        max-width: 800px;
        margin: 0 auto;
      }
      .header { border-bottom: 3px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
      th { background-color: #f1f5f9; }
      .stamp { border: 3px double #15803d; color: #15803d; padding: 8px 16px; font-weight: bold; border-radius: 8px; display: inline-block; }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill_Receipt_${bill.consumer_number}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              {getServiceIcon(bill.service_type)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">E-Receipt Clearance Certificate</h3>
              <p className="text-[11px] text-slate-400">Offline Utility Bill Clearance Proof</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'thermal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'a4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Official
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Container Preview */}
        <div className="p-6 bg-slate-950/60 overflow-y-auto max-h-[70vh]">
          <div
            id="printable-receipt"
            className={`mx-auto bg-white text-slate-900 p-6 rounded-2xl shadow-xl transition-all ${
              printMode === 'thermal' ? 'max-w-[340px] font-mono text-xs' : 'max-w-full font-sans'
            }`}
          >
            {/* Receipt Brand Header */}
            <div className="text-center border-b border-slate-300 pb-4 mb-4">
              <h2 className="text-lg font-black tracking-tight text-indigo-900 uppercase">AsEasySwipe Digital</h2>
              <p className="text-[10px] text-slate-500 font-medium">B2B Fintech Banking Portal & Bill Settlement</p>
              <p className="text-[9px] text-slate-400">GSTIN: 27AAAAA0000A1Z5 | Helpline: 1800-123-4567</p>
            </div>

            {/* Status Stamp */}
            <div className="text-center my-3">
              {bill.status === 'approved' ? (
                <div className="inline-block border-2 border-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> SUCCESS - PAYMENT SETTLED
                  </span>
                </div>
              ) : bill.status === 'rejected' ? (
                <div className="inline-block border-2 border-rose-600 bg-rose-50 px-4 py-1.5 rounded-xl">
                  <span className="text-xs font-black text-rose-700 uppercase tracking-widest">
                    REJECTED & REFUNDED
                  </span>
                </div>
              ) : (
                <div className="inline-block border-2 border-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl">
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                    PROCESSING / PENDING CLEARANCE
                  </span>
                </div>
              )}
            </div>

            {/* Bill & Consumer Details */}
            <div className="space-y-2 border-b border-slate-200 pb-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Type:</span>
                <span className="font-bold text-slate-900">{bill.service_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Provider / Board:</span>
                <span className="font-bold text-slate-900">{bill.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consumer Account #:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-1.5 py-0.5 rounded">{bill.consumer_number}</span>
              </div>
              {bill.customer_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Consumer Name:</span>
                  <span className="font-semibold text-slate-800">{bill.customer_name}</span>
                </div>
              )}
              {bill.customer_mobile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Mobile:</span>
                  <span className="font-semibold text-slate-800">{bill.customer_mobile}</span>
                </div>
              )}
            </div>

            {/* Payment & Operator Ref Breakdown */}
            <div className="space-y-2 border-b border-slate-200 py-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Amount:</span>
                <span className="font-semibold">₹{Number(bill.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Fee / Conven.:</span>
                <span className="font-semibold">₹{Number(bill.charges || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1.5 text-slate-900">
                <span>Total Amount Debited:</span>
                <span className="text-emerald-700">₹{Number(bill.total_debited).toFixed(2)}</span>
              </div>

              {bill.operator_ref && (
                <div className="mt-3 p-2.5 bg-slate-100 rounded-xl border border-slate-300 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Operator / Board Reference ID</p>
                  <p className="text-sm font-mono font-black text-indigo-900 tracking-wider mt-0.5">{bill.operator_ref}</p>
                </div>
              )}

              {bill.rejection_reason && (
                <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                  <strong>Reason:</strong> {bill.rejection_reason}
                </div>
              )}
            </div>

            {/* Agent / Retailer Details */}
            <div className="py-3 border-b border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer Agent:</span>
                <span className="font-bold text-slate-800">{bill.user_name || bill.user_id}</span>
              </div>
              {bill.firm_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Agent Outlet:</span>
                  <span className="font-semibold text-slate-700">{bill.firm_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Tx ID:</span>
                <span className="font-mono text-[10px] text-slate-600">{bill.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-mono text-[10px] text-slate-600">
                  {new Date(bill.created_at).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Footer Seal */}
            <div className="pt-4 text-center space-y-1 text-[9px] text-slate-500">
              <p className="font-semibold">Thank you for using AsEasySwipe Financial Portal</p>
              <p>Computer generated e-Receipt. Valid without signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { PayoutTransaction } from '../../types/payout';
import {
  Printer, X, CheckCircle2, ShieldCheck, ArrowRightLeft,
  Building2, User, Copy, Check, Hash, Calendar, Wallet
} from 'lucide-react';

interface PayoutReceiptModalProps {
  transaction: PayoutTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayoutReceiptModal: React.FC<PayoutReceiptModalProps> = ({
  transaction,
  isOpen,
  onClose
}) => {
  if (!isOpen || !transaction) return null;

  const [copiedUtr, setCopiedUtr] = useState(false);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-payout-receipt');
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
      .header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
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
          <title>Payout_Receipt_${transaction.utr || transaction.client_order_id}</title>
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

  const isSuccess = transaction.status === 'success';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Instant Bank Payout Receipt</h2>
              <p className="text-xs text-slate-400">Order ID: {transaction.client_order_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setPrintMode('thermal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  printMode === 'thermal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                onClick={() => setPrintMode('a4')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  printMode === 'a4' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Slip
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6">
          <div id="printable-payout-receipt" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
            {/* Stamp & Company Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm tracking-wide">
                <ShieldCheck className="w-4 h-4" /> ASEASY SWIPE FINTECH
              </div>
              <h3 className="text-lg font-black text-white">24x7 Instant Bank Transfer</h3>
              <p className="text-[11px] text-slate-400">NPCI IMPS / NEFT Realtime Settlement</p>
              
              <div className="pt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {transaction.status}
                </span>
              </div>
            </div>

            {/* Transfer Amount Highlight */}
            <div className="text-center py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-xs uppercase font-bold text-slate-400">Transfer Amount</p>
              <p className="text-3xl font-black text-white tracking-tight">
                ₹{Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Slab Fee: +₹{Number(transaction.slab_charge || 0).toFixed(2)} | Total Wallet Debited: <strong className="text-slate-200">₹{Number(transaction.total_deducted || transaction.amount).toFixed(2)}</strong>
              </p>
            </div>

            {/* Bank Reference UTR Highlight */}
            {transaction.utr && (
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-indigo-300">Bank UTR / Reference RRN</p>
                  <p className="text-base font-black font-mono text-white tracking-wider">{transaction.utr}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(transaction.utr || '')}
                  className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUtr ? 'Copied' : 'Copy UTR'}
                </button>
              </div>
            )}

            {/* Beneficiary & Transaction Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Beneficiary Name</span>
                <span className="font-bold text-white uppercase">{transaction.beneficiary_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Account Number</span>
                <span className="font-mono font-bold text-white tracking-wider">{transaction.account_number}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> IFSC Code</span>
                <span className="font-mono font-bold text-indigo-300 uppercase">{transaction.ifsc_code}</span>
              </div>
              {transaction.bank_name && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Bank Name</span>
                  <span className="font-bold text-white">{transaction.bank_name}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Mode</span>
                <span className="font-bold text-emerald-400">{transaction.transfer_mode || 'IMPS'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date & Time</span>
                <span className="font-mono text-slate-300">
                  {new Date(transaction.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
              {transaction.failure_reason && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs">
                  <strong>Failure Reason:</strong> {transaction.failure_reason}
                  {transaction.refunded_to_wallet && (
                    <span className="block text-emerald-400 font-bold mt-1">✓ Amount has been refunded to your wallet.</span>
                  )}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="text-[11px] text-slate-500 text-center pt-2">
              <p>Computer generated e-receipt. For any support quote Order ID: <span className="font-mono text-slate-400">{transaction.client_order_id}</span></p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all text-xs"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { AccountStatement } from '../../types/statement';
import {
  Printer, X, ShieldCheck, ArrowDownLeft, ArrowUpRight,
  Building2, User, Phone, Calendar
} from 'lucide-react';

interface PrintStatementModalProps {
  statement: AccountStatement | null;
  startDate?: string;
  endDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintStatementModal: React.FC<PrintStatementModalProps> = ({
  statement,
  startDate,
  endDate,
  isOpen,
  onClose
}) => {
  if (!isOpen || !statement) return null;

  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal'>('a4');

  const handlePrint = () => {
    const printContent = document.getElementById('printable-bank-statement');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = printLayout === 'thermal' ? `
      body {
        font-family: 'Courier New', monospace;
        width: 80mm;
        margin: 0 auto;
        padding: 8px;
        color: #000;
        font-size: 10px;
      }
      .text-center { text-align: center; }
      .border-b { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
      .flex-between { display: flex; justify-content: space-between; margin: 2px 0; }
      .font-bold { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9px; }
      th, td { border-bottom: 1px dashed #666; padding: 4px 2px; text-align: left; }
    ` : `
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 30px;
        color: #0f172a;
        max-width: 900px;
        margin: 0 auto;
      }
      .header-bar {
        border-bottom: 3px solid #4338ca;
        padding-bottom: 12px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .bank-stamp {
        border: 2px dashed #15803d;
        color: #15803d;
        padding: 6px 14px;
        font-weight: bold;
        font-size: 11px;
        border-radius: 6px;
        display: inline-block;
        text-transform: uppercase;
      }
      .summary-box {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 11px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      th {
        background-color: #1e293b;
        color: #ffffff;
        padding: 8px 6px;
        text-align: left;
        font-weight: 600;
      }
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 7px 6px;
        vertical-align: top;
      }
      tr:nth-child(even) { background-color: #f8fafc; }
      .cr-text { color: #15803d; font-weight: bold; }
      .dr-text { color: #b91c1c; font-weight: bold; }
      .balance-text { font-weight: 800; color: #0f172a; }
      .math-tag {
        font-size: 9px;
        color: #475569;
        font-family: monospace;
        margin-top: 2px;
      }
      .footer-note {
        margin-top: 25px;
        border-top: 1px solid #cbd5e1;
        padding-top: 10px;
        font-size: 9px;
        color: #64748b;
        text-align: center;
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bank_Statement_${statement.account_details.name.replace(/\s+/g, '_')}</title>
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

  const { account_details, summary, entries } = statement;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[95vh] flex flex-col">
        
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Print Account Statement / Passbook</h2>
              <p className="text-xs text-slate-400">
                Official Bank-Grade Account Ledger Slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setPrintLayout('a4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  printLayout === 'a4' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Statement
              </button>
              <button
                onClick={() => setPrintLayout('thermal')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  printLayout === 'thermal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Now
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Passbook Body Container */}
        <div className="p-6 overflow-y-auto flex-1">
          <div id="printable-bank-statement" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-200">
            
            {/* Bank Statement Header */}
            <div className="header-bar border-b-2 border-indigo-500/40 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm tracking-wide">
                  <ShieldCheck className="w-4 h-4" /> ASEASY SWIPE FINTECH PORTAL
                </div>
                <h1 className="text-xl font-black text-white">OFFICIAL ACCOUNT STATEMENT</h1>
                <p className="text-xs text-slate-400">NPCI / B2B Instant Settlement Wallet Ledger</p>
              </div>

              <div className="text-right text-xs space-y-1">
                <span className="bank-stamp border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md font-bold uppercase inline-block">
                  Verified Passbook
                </span>
                <p className="text-[11px] text-slate-400 font-mono">
                  Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Account Details & Statement Period Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <p className="text-slate-400">Account Holder:</p>
                <p className="text-sm font-black text-white">{account_details.name}</p>
                <p className="text-slate-300 font-semibold">{account_details.firm_name}</p>
                <p className="text-slate-400 font-mono">Mobile: {account_details.mobile_number}</p>
              </div>

              <div className="space-y-1 sm:text-right">
                <p className="text-slate-400">Statement Period:</p>
                <p className="text-xs font-bold text-white font-mono">
                  {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'All Time'} to {endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Present'}
                </p>
                <p className="text-slate-400">Currency: <strong className="text-slate-200">INR (₹)</strong></p>
                <p className="text-slate-400">Account Type: <strong className="text-indigo-400 uppercase">{account_details.role || 'Merchant'}</strong></p>
              </div>
            </div>

            {/* Summary Highlights (Passbook Balances) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Opening Balance</p>
                <p className="text-sm font-black text-white">₹{summary.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                  <ArrowDownLeft className="w-3 h-3" /> Total Credits
                </p>
                <p className="text-sm font-black text-emerald-400">+₹{summary.total_credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-rose-400 flex items-center justify-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> Total Debits
                </p>
                <p className="text-sm font-black text-rose-400">-₹{summary.total_debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-amber-400">Total Commission</p>
                <p className="text-sm font-black text-amber-400">₹{summary.total_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-indigo-400">Closing Balance</p>
                <p className="text-sm font-black text-indigo-300">₹{summary.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold border-b border-slate-700">
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Reference / UTR</th>
                    <th className="p-2.5">Narration & Math Breakdown</th>
                    <th className="p-2.5 text-right">Debit (Dr)</th>
                    <th className="p-2.5 text-right">Credit (Cr)</th>
                    <th className="p-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-900/50">
                      <td className="p-2.5 whitespace-nowrap text-slate-400 font-mono text-[10px]">
                        {new Date(entry.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-2.5 whitespace-nowrap font-mono text-slate-300 text-[11px]">
                        {entry.reference_id || '—'}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-white text-[11px]">{entry.title}</div>
                        <div className="text-[10px] text-slate-400">{entry.narration}</div>
                        {entry.math_breakdown && (
                          <div className="text-[10px] text-indigo-300 font-mono mt-0.5 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 inline-block">
                            {entry.math_breakdown}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 whitespace-nowrap text-right font-black text-rose-400 text-xs">
                        {entry.type === 'DEBIT' ? `-₹${entry.net_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-2.5 whitespace-nowrap text-right font-black text-emerald-400 text-xs">
                        {entry.type === 'CREDIT' ? `+₹${entry.net_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-2.5 whitespace-nowrap text-right font-mono font-black text-white text-xs">
                        ₹{entry.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Disclaimer */}
            <div className="footer-note border-t border-slate-800 pt-3 text-[10px] text-slate-500 text-center space-y-1">
              <p>This is a computer-generated bank account statement and does not require a physical signature.</p>
              <p>For any queries or transaction dispute, please quote the Reference ID.</p>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Statement
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { FileText, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any | null>(null);

  const handleFetchReport = async () => {
    try {
      setExporting(true);
      const res = await api.get('/merchant/reports/export', {
        params: { startDate, endDate },
      });
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCsv = () => {
    const token = localStorage.getItem('sumiopay_token');
    const baseUrl = api.defaults.baseURL || '/api';
    const url = `${baseUrl}/merchant/reports/export?format=csv${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`;
    
    // Trigger direct download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `sumiopay-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Accounting & GST Audits</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports & Exports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Export verified transaction ledgers, daily settlements, and GST summaries for your accounting records.
        </p>
      </div>

      {/* Filter and Export Bar */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Configure Report Parameters</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleFetchReport}
              disabled={exporting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
            >
              {exporting ? 'Generating...' : 'Preview Report'}
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500">Total Volume Settled</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{reportData.summary.totalVolumeRupees.toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500">Verified Transactions</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {reportData.summary.totalTransactions}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500">Reporting Range</span>
              <div className="text-xs font-bold text-slate-900 mt-2 font-mono">
                {reportData.summary.period.startDate} to {reportData.summary.period.endDate}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Order ID</th>
                  <th className="py-3 px-4 font-semibold">App</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">UTR Reference</th>
                  <th className="py-3 px-4 font-semibold">Settled Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.orders.slice(0, 50).map((o: any) => (
                  <tr key={o.orderId} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{o.orderId}</td>
                    <td className="py-2.5 px-4 font-bold">{o.appName}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">₹{o.exactAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-4 font-mono">{o.utrNumber || 'N/A'}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {o.paidAt ? new Date(o.paidAt).toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

import React, { useState, useEffect } from 'react';
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
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
  }, []);

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

          {reportData.funnel && (
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Checkout Conversion Funnel &amp; UPI Handle Performance</h3>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                  {reportData.funnel.conversionRatePercent}% Success Rate
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500">Orders Initiated</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{reportData.funnel.totalInitiated}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
                  <span className="text-emerald-700">Paid &amp; Settled</span>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">{reportData.funnel.paidCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70">
                  <span className="text-amber-700">Pending</span>
                  <div className="text-lg font-black text-amber-900 mt-0.5">{reportData.funnel.pendingCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/70">
                  <span className="text-rose-700">Expired / Drop-off</span>
                  <div className="text-lg font-black text-rose-900 mt-0.5">{reportData.funnel.expiredCount}</div>
                </div>
              </div>

              {Array.isArray(reportData.funnel.upiPerformance) && reportData.funnel.upiPerformance.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Assigned Bank UPI VPA</th>
                        <th className="py-2.5 px-4 font-semibold">Checkouts</th>
                        <th className="py-2.5 px-4 font-semibold">Paid</th>
                        <th className="py-2.5 px-4 font-semibold">Conversion %</th>
                        <th className="py-2.5 px-4 font-semibold">Settled Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.funnel.upiPerformance.map((u: any) => (
                        <tr key={u.upiId}>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{u.upiId}</td>
                          <td className="py-2.5 px-4">{u.initiated}</td>
                          <td className="py-2.5 px-4 text-emerald-700 font-bold">{u.paid}</td>
                          <td className="py-2.5 px-4 font-bold">{u.conversionPercent}%</td>
                          <td className="py-2.5 px-4 font-mono font-bold">₹{Number(u.volumeInr || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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

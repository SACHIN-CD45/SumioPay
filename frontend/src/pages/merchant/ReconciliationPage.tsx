import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  Search,
  Check,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const ReconciliationPage: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [csvText, setCsvText] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manual resolution modal state
  const [resolvingItem, setResolvingItem] = useState<any | null>(null);
  const [targetOrderId, setTargetOrderId] = useState<string>('');
  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, unmatchedRes] = await Promise.all([
        api.get('/v1/reconciliation/batches'),
        api.get('/v1/reconciliation/unmatched'),
      ]);
      if (batchesRes.data.success) setBatches(batchesRes.data.data);
      if (unmatchedRes.data.success) setUnmatched(unmatchedRes.data.data);
    } catch (err: any) {
      console.error('Reconciliation fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const res = await api.post('/v1/reconciliation/upload-statement', { csvText });
      if (res.data.success) {
        setUploadSuccess(`Batch ${res.data.data.batchId} processed! Matched: ${res.data.data.matchedRecords} / ${res.data.data.totalRecords}`);
        setCsvText('');
        fetchData();
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleResolveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem || !targetOrderId.trim()) return;

    try {
      setResolveLoading(true);
      setResolveMsg(null);
      const res = await api.post('/v1/reconciliation/resolve-unmatched', {
        unmappedId: resolvingItem._id,
        orderId: targetOrderId.trim(),
      });
      if (res.data.success) {
        setResolveMsg('Successfully matched and reconciled!');
        setTimeout(() => {
          setResolvingItem(null);
          setTargetOrderId('');
          setResolveMsg(null);
          fetchData();
        }, 1200);
      }
    } catch (err: any) {
      setResolveMsg(err.response?.data?.message || err.message);
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Automated Accounting Rails</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Reconciliation Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-rule matching algorithm reconciling bank passbook entries against active & delayed UPI orders.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Statement Upload Box */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Upload Bank Statement (CSV or Paste)</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Format: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Date,UTR,Amount,Sender</code> or simply <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">UTR,Amount</code> per line.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`2026-11-25,432198765432,499.42,Ramesh Kumar\n2026-11-25,987654321098,999.12,Sneha Sharma`}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
          />

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !csvText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Rules...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Execute Automated Matching</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Unmatched / Delayed Payments Queue */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Unmatched & Delayed Payments Queue</span>
            </h2>
            <p className="text-xs text-slate-500">
              Payments received without active pending order or with amount variance requiring manual match.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold font-mono">
            {unmatched.filter((u) => u.status === 'UNRESOLVED').length} Unresolved
          </span>
        </div>

        {unmatched.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No unmatched payments! All incoming bank credits are 100% reconciled.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">UTR Reference</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Sender / Source</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {unmatched.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium">{item.utrNumber || 'N/A'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{item.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">{item.senderName || item.bankAppName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{item.notes}</td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'UNRESOLVED' && (
                        <button
                          onClick={() => setResolvingItem(item)}
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[11px] hover:bg-blue-100 transition"
                        >
                          Resolve Match
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batches History */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Historical Reconciliation Batches</span>
        </h2>

        {batches.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No reconciliation batches executed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Batch ID</th>
                  <th className="py-3 px-4 font-semibold">Total Records</th>
                  <th className="py-3 px-4 font-semibold">Matched Count</th>
                  <th className="py-3 px-4 font-semibold">Matched Amount</th>
                  <th className="py-3 px-4 font-semibold">Match Rate</th>
                  <th className="py-3 px-4 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.map((batch) => {
                  const rate = batch.totalRecords > 0 ? ((batch.matchedRecords / batch.totalRecords) * 100).toFixed(1) : '0';
                  return (
                    <tr key={batch._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{batch.batchId}</td>
                      <td className="py-3 px-4">{batch.totalRecords}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{batch.matchedRecords}</td>
                      <td className="py-3 px-4 font-bold">₹{(batch.matchedAmountInPaise / 100).toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono font-bold">{rate}%</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(batch.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Resolution Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reconcile Unmapped Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Associate incoming credit of <strong className="text-slate-900">₹{resolvingItem.amount.toFixed(2)}</strong> (UTR: {resolvingItem.utrNumber || 'N/A'}) to an active or pending order.
            </p>

            <form onSubmit={handleResolveManual} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORD-20261125-9481"
                  value={targetOrderId}
                  onChange={(e) => setTargetOrderId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {resolveMsg && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs">{resolveMsg}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveLoading || !targetOrderId.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {resolveLoading ? 'Reconciling...' : 'Confirm Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPage;

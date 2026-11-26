import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { RotateCcw, AlertOctagon, CheckCircle2, Clock, Plus, ShieldAlert } from 'lucide-react';

export const RefundsPage: React.FC = () => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>('');
  const [amountInPaise, setAmountInPaise] = useState<string>('');
  const [refundUtr, setRefundUtr] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [refRes, disRes] = await Promise.all([
        api.get('/merchant/refunds'),
        api.get('/merchant/disputes'),
      ]);
      if (refRes.data.success) setRefunds(refRes.data.data);
      if (disRes.data.success) setDisputes(disRes.data.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/merchant/refunds', {
        orderId: orderId.trim(),
        amountInPaise: amountInPaise ? parseInt(amountInPaise, 10) : undefined,
        refundUtr: refundUtr.trim() || undefined,
        reason,
      });
      if (res.data.success) {
        setShowModal(false);
        setOrderId('');
        setAmountInPaise('');
        setRefundUtr('');
        setReason('');
        fetchData();
        alert('Refund recorded and SaaS webhook notified!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Financial Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Refunds & Dispute Resolution</h1>
          <p className="text-sm text-slate-500 mt-1">
            Initiate governed customer refunds and manage bank dispute workflows with full auditability.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate Refund</span>
        </button>
      </div>

      {/* Direct Bank Settlement Refund Architecture Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-950">
        <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <div className="font-bold text-slate-900">How Direct UPI Refunds Work (0% Gateway Holding):</div>
          <p className="text-[11px] text-slate-700">
            Because customer payments settle 100% directly into your own bank account (zero intermediate holding), transfer the refund via your Bank / UPI app, then click <strong>&quot;Initiate Refund&quot;</strong> here with your Refund UTR. SumioPay updates the ledger to <code className="bg-white px-1 rounded font-mono">REFUNDED</code> / <code className="bg-white px-1 rounded font-mono">PARTIALLY_REFUNDED</code> and fires an HMAC-signed <code className="bg-white px-1 rounded font-mono">payment.refunded</code> webhook to your website/SaaS automatically.
          </p>
        </div>
      </div>

      {/* Refunds Ledger */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-blue-600" />
          <span>Processed Refunds</span>
        </h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading refunds...</div>
        ) : refunds.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No refunds issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Refund ID</th>
                  <th className="py-3 px-4 font-semibold">Order ID</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Bank Refund UTR</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {refunds.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{r.refundId}</td>
                    <td className="py-3 px-4 font-mono">{r.orderId}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{(r.amountInPaise / 100).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">{r.providerReference || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{r.reason}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disputes Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Chargeback & Disputes Management</span>
        </h2>

        {disputes.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No active disputes. Your chargeback ratio is 0.00%.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Dispute ID</th>
                  <th className="py-3 px-4 font-semibold">Order ID</th>
                  <th className="py-3 px-4 font-semibold">Disputed Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disputes.map((d) => (
                  <tr key={d._id}>
                    <td className="py-3 px-4 font-mono font-bold">{d.disputeId}</td>
                    <td className="py-3 px-4 font-mono">{d.orderId}</td>
                    <td className="py-3 px-4 font-bold">₹{(d.amountInPaise / 100).toFixed(2)}</td>
                    <td className="py-3 px-4">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Initiate Order Refund</h3>
            <p className="text-xs text-slate-500 mb-4">Refunds can only be processed on settled PAID orders.</p>

            <form onSubmit={handleCreateRefund} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORD-20261125-9481"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Refund Amount in Paise (Leave empty for full refund)</label>
                <input
                  type="number"
                  placeholder="e.g. 49900 for ₹499.00"
                  value={amountInPaise}
                  onChange={(e) => setAmountInPaise(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Bank / UPI Refund UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 12-digit UTR from reverse UPI transfer"
                  value={refundUtr}
                  onChange={(e) => setRefundUtr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Reason for Refund</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Customer cancellation, duplicate payment, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !orderId.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsPage;

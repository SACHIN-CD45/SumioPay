import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Filter,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react';

export const SuperAdminTransactionsPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await adminApi.get('/orders', { params });
      if (res.data.success) {
        setOrders(res.data.data.orders);
      }
    } catch (err) {
      console.error('[SuperAdmin Transactions]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-amber-400" />
            Global Payment Orders Ledger
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Omni-tenant transaction inspection, 12-digit UTR reference tracking, dynamic paise resolution, and bank alert verification.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh Transactions</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, 12-digit UTR, or User ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          {['ALL', 'PAID', 'PENDING', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Order Reference</th>
                <th className="py-3.5 px-4">Merchant Entity</th>
                <th className="py-3.5 px-4">Allocated Exact Amount</th>
                <th className="py-3.5 px-4">Bank UTR / UPI Ref</th>
                <th className="py-3.5 px-4">Customer Account</th>
                <th className="py-3.5 px-4">Lifecycle State</th>
                <th className="py-3.5 px-4">Recorded At</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-sans">
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 text-amber-300 font-bold">
                      {o.orderId}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      <div className="text-white font-semibold text-xs">{o.merchantId?.businessName || 'Merchant'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{o.appName}</div>
                    </td>
                    <td className="py-4 px-4 text-emerald-400 font-bold">
                      ₹{(o.exactAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-slate-200">
                      {o.utrNumber ? (
                        <span className="text-sky-300 font-bold">{o.utrNumber}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-300">
                      {o.customerUserId}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      {o.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID
                        </span>
                      ) : o.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          {o.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Transaction Inspector: {selectedOrder.orderId}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Order ID:</span>
                <span className="text-amber-300 font-bold">{selectedOrder.orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-bold">{selectedOrder.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Exact Amount:</span>
                <span className="text-white font-bold">₹{(selectedOrder.exactAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Bank 12-Digit UTR:</span>
                <span className="text-sky-300 font-bold">{selectedOrder.utrNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Client SaaS App:</span>
                <span className="text-slate-300">{selectedOrder.appName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Customer User ID:</span>
                <span className="text-slate-300">{selectedOrder.customerUserId || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Payer Sender Name:</span>
                <span className="text-slate-300">{selectedOrder.senderName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Receiving UPI / App:</span>
                <span className="text-slate-300">{selectedOrder.bankAppName || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Paid Timestamp:</span>
                <span className="text-slate-300">
                  {selectedOrder.paidAt
                    ? new Date(selectedOrder.paidAt).toLocaleString('en-IN')
                    : 'Pending Confirmation'}
                </span>
              </div>
            </div>

            {selectedOrder.rawNotificationMessage && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">Raw Intercepted Bank Message:</span>
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[10px] overflow-x-auto border border-slate-800 whitespace-pre-wrap">
                  {selectedOrder.rawNotificationMessage}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTransactionsPage;

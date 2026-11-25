import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Link2,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'unmapped'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [unmapped, setUnmapped] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reconcileModal, setReconcileModal] = useState<any>(null);
  const [reconcileOrderId, setReconcileOrderId] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [simulatingOrderId, setSimulatingOrderId] = useState<string | null>(null);

  const handleSimulateOrderPayment = async (orderId: string) => {
    setSimulatingOrderId(orderId);
    try {
      const res = await api.post(`/order/sandbox-simulate-payment/${orderId}`);
      if (res.data.success) {
        fetchOrders();
      } else {
        alert(res.data.message || 'Simulation failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimulatingOrderId(null);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/order/my-orders', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          limit: 50,
        },
      });
      if (res.data.success) {
        setOrders(res.data.data.orders);
        setTotal(res.data.data.pagination.total);
      }
      const unmappedRes = await api.get('/webhook/unmapped');
      if (unmappedRes.data.success) {
        setUnmapped(unmappedRes.data.data);
      }
    } catch (err) {
      console.error(err);
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

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileModal) return;
    try {
      await api.post(`/webhook/reconcile/${reconcileModal._id}`, {
        status: 'RESOLVED',
        orderId: reconcileOrderId.trim(),
        notes: reconcileNotes.trim(),
      });
      alert('Payment reconciled successfully!');
      setReconcileModal(null);
      setReconcileOrderId('');
      setReconcileNotes('');
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Reconciliation failed');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Transactions & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-tenant order audit across SumioLab, SumioBilling, and connected SaaS applications.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'orders'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Orders Ledger ({total})
        </button>
        <button
          onClick={() => setActiveTab('unmapped')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'unmapped'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Unmapped / Unknown Credits ({unmapped.filter((u) => u.status === 'UNRESOLVED').length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-subtle">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Order ID, UTR Number, or Customer User ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses ({total})</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="px-5 py-3.5 font-semibold">Order ID</th>
                    <th className="px-5 py-3.5 font-semibold">App Name</th>
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Exact Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Bank UTR</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Webhook</th>
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{ord.orderId}</span>
                          {ord.isTest && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              TEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          {ord.appName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                        {ord.customerUserId || '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ₹{ord.exactAmount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-emerald-700 font-bold">
                        {ord.utrNumber || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            ord.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ord.status === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {ord.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                          {ord.status === 'EXPIRED' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        <span
                          className={`font-semibold ${
                            ord.webhookDeliveryStatus === 'DELIVERED'
                              ? 'text-emerald-700'
                              : ord.webhookDeliveryStatus === 'FAILED'
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {ord.webhookDeliveryStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                          >
                            Details
                          </button>
                          <a
                            href={`/pay/${ord.orderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition"
                            title="Open Hosted Payment Link"
                          >
                            Pay Link
                          </a>
                          {ord.status === 'PENDING' && (
                            <button
                              onClick={() => handleSimulateOrderPayment(ord.orderId)}
                              disabled={simulatingOrderId === ord.orderId}
                              className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition flex items-center gap-1"
                              title="Simulate instant payment for testing"
                            >
                              {simulatingOrderId === ord.orderId ? 'Simulating...' : 'Simulate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {orders.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No orders match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Unmapped & Disputed Payments Tab */
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-subtle">
          <div className="p-4 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Payments received on your UPI ID where the exact paise did not match any active order.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Bank UTR</th>
                  <th className="px-5 py-3.5 font-semibold">Sender / App</th>
                  <th className="px-5 py-3.5 font-semibold">Raw SMS Alert</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unmapped.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono text-sm">
                      ₹{item.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-700 font-bold">
                      {item.utrNumber || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800 block">{item.senderName || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400">{item.bankAppName}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-[11px] text-slate-600 font-mono">
                      {item.rawMessage}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      {item.status === 'UNRESOLVED' ? (
                        <button
                          onClick={() => setReconcileModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 transition shadow-sm"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Reconcile
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Linked</span>
                      )}
                    </td>
                  </tr>
                ))}

                {unmapped.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No unmapped transactions. All incoming payments were matched automatically!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {reconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <form
            onSubmit={handleReconcileSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Reconcile Bank Credit: ₹{reconcileModal.amount}
              </h3>
              <button
                type="button"
                onClick={() => setReconcileModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 font-medium block">Raw Bank Alert:</span>
              <p className="font-mono text-slate-800 text-[11px]">{reconcileModal.rawMessage}</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Link to Customer Order ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ORD-20261125-ABCD"
                value={reconcileOrderId}
                onChange={(e) => setReconcileOrderId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                If specified, marks that order as PAID and dispatches success webhook.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reconciliation Notes</label>
              <input
                type="text"
                placeholder="e.g. Customer sent ₹500 without paise via PhonePe"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReconcileModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
              >
                Confirm Reconciliation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Order Audit: <span className="font-mono text-blue-600">{selectedOrder.orderId}</span>
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">App Name</span>
                <span className="font-bold text-slate-900">{selectedOrder.appName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">Base Amount</span>
                <span className="font-bold text-slate-900">₹{selectedOrder.baseAmount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">Exact Amount (w/ Paise)</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  ₹{selectedOrder.exactAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">Bank UTR Reference</span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedOrder.utrNumber || 'Not Yet Received'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">Customer Phone/Email</span>
                <span className="text-slate-700">
                  {selectedOrder.customerPhone || selectedOrder.customerEmail || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">Payment Status</span>
                <span className="font-bold text-slate-900">{selectedOrder.status}</span>
              </div>
            </div>

            {selectedOrder.rawNotificationMessage && (
              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">
                  Raw Intercepted Bank SMS/Push
                </span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                  {selectedOrder.rawNotificationMessage}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

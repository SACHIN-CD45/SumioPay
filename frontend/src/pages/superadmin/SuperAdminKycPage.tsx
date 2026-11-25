import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  FileText,
  X,
  Check,
} from 'lucide-react';

export const SuperAdminKycPage: React.FC = () => {
  const [kycList, setKycList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [rejectingOrg, setRejectingOrg] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchKyc = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/kyc');
      if (res.data.success) {
        setKycList(res.data.data);
      }
    } catch (err) {
      console.error('[SuperAdmin KYC]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, []);

  const handleApprove = async (orgId: string) => {
    setActionLoading(true);
    try {
      const res = await adminApi.patch(`/kyc/${orgId}`, {
        kycStatus: 'VERIFIED',
      });
      if (res.data.success) {
        setKycList((prev) =>
          prev.map((k) => (k._id === orgId ? { ...k, kycStatus: 'VERIFIED' } : k))
        );
      }
    } catch (err) {
      alert('Failed to approve KYC');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrg || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminApi.patch(`/kyc/${rejectingOrg._id}`, {
        kycStatus: 'REJECTED',
        kycRejectionReason: rejectionReason,
      });
      if (res.data.success) {
        setKycList((prev) =>
          prev.map((k) =>
            k._id === rejectingOrg._id
              ? { ...k, kycStatus: 'REJECTED', kycRejectionReason: rejectionReason }
              : k
          )
        );
        setRejectingOrg(null);
        setRejectionReason('');
      }
    } catch (err) {
      alert('Failed to reject KYC');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = kycList.filter((k) =>
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.panNumber?.toLowerCase().includes(search.toLowerCase()) ||
    k.gstin?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-amber-400" />
            KYC & Regulatory Compliance Pipeline
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Review merchant identity documentation, verify PAN/GSTIN registration, and audit statutory onboardings.
          </p>
        </div>

        <button
          onClick={fetchKyc}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Reload Queue</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by legal entity name, PAN number, or GSTIN..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Pending Audits: <span className="text-amber-400 font-bold">{kycList.filter(k => k.kycStatus !== 'VERIFIED').length}</span>
        </div>
      </div>

      {/* KYC Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Organization Name</th>
                <th className="py-3.5 px-4">Permanent Account No (PAN)</th>
                <th className="py-3.5 px-4">GST Identification No</th>
                <th className="py-3.5 px-4">Verification State</th>
                <th className="py-3.5 px-4">Compliance Audit</th>
                <th className="py-3.5 px-5 text-right">Governor Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No KYC compliance files matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((k) => (
                  <tr key={k._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-5 font-sans font-bold text-white text-xs">
                      {k.name}
                    </td>
                    <td className="py-4 px-4 text-slate-200">
                      {k.panNumber || 'NOT_SUBMITTED'}
                    </td>
                    <td className="py-4 px-4 text-slate-200">
                      {k.gstin || 'NOT_SUBMITTED'}
                    </td>
                    <td className="py-4 px-4 font-sans">
                      {k.kycStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : k.kycStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                          <Clock className="w-3 h-3" />
                          PENDING REVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-400 text-[10px]">
                      {k.kycRejectionReason ? (
                        <span className="text-rose-400 font-mono">{k.kycRejectionReason}</span>
                      ) : (
                        'Standard Onboarding'
                      )}
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {k.kycStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => handleApprove(k._id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {k.kycStatus !== 'REJECTED' && (
                          <button
                            onClick={() => {
                              setRejectingOrg(k);
                              setRejectionReason('');
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Rejection Reason Modal */}
      {rejectingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Reject KYC: {rejectingOrg.name}
              </h3>
              <button
                onClick={() => setRejectingOrg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              State the precise statutory or document inadequacy (e.g. illegible certificate, name mismatch on PAN, invalid GSTIN).
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter detailed statutory rejection rationale..."
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingOrg(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminKycPage;

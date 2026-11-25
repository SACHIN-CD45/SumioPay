import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, UserPlus, Trash2, Mail, Shield, CheckCircle } from 'lucide-react';

export const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('DEVELOPER');

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant/team');
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/merchant/team/invite', { name, email, role });
      if (res.data.success) {
        setShowModal(false);
        setName('');
        setEmail('');
        fetchTeam();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    try {
      await api.delete(`/merchant/team/${id}`);
      fetchTeam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Role-Based Access Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Members & Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Delegate financial operations, developer integrations, and reconciliation monitoring safely.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No team members invited yet. Only the merchant owner currently has access.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Member</th>
                  <th className="py-3.5 px-6 font-semibold">Assigned Role</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold">Joined / Invited</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {members.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{m.email}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        <Shield className="w-3 h-3 text-blue-600" />
                        <span>{m.role}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleDelete(m._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Invite Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Grant access with specific role permissions.</p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="anand@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Role & Permissions</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="MERCHANT_ADMIN">Merchant Admin (Full Access)</option>
                  <option value="FINANCE_MANAGER">Finance Manager (Reconciliation & Refunds)</option>
                  <option value="DEVELOPER">Developer (API Keys & Webhooks)</option>
                  <option value="ANALYST">Read-only Analyst</option>
                </select>
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;

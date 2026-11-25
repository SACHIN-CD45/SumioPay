import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FolderGit2, Plus, Globe, Copy, Check, ShieldCheck, Zap } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('PRODUCTION');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/v1/projects', {
        name,
        code,
        description,
        environment,
      });
      if (res.data.success) {
        setShowModal(false);
        setName('');
        setCode('');
        setDescription('');
        fetchProjects();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-2">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Multi-Tenant Workspaces</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project Environments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Segment payments, webhooks, and API keys across multiple SaaS products (e.g. SumioLab, SumioBilling).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Workspace</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading workspaces...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-3">
          <p>No dedicated projects created yet. You can create projects to separate your apps.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold text-xs"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    {proj.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{proj.name}</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    proj.environment === 'SANDBOX'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {proj.environment}
                </span>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2">
                {proj.description || 'No description provided.'}
              </p>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Webhook Secret:</span>
                  <button
                    onClick={() => copyText(proj.webhookSecret, proj.id)}
                    className="flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800"
                  >
                    {copiedId === proj.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === proj.id ? 'Copied' : 'Copy Secret'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total Volume:</span>
                  <span className="font-bold text-slate-900">
                    ₹{((proj.totalVolumeInPaise || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Project Workspace</h3>
            <p className="text-xs text-slate-500 mb-4">Add a new isolated environment for your app or service.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SumioLab Diagnostic Cloud"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Project Code (Uppercase ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMIOLAB"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="PRODUCTION">Production</option>
                  <option value="SANDBOX">Sandbox / Testing</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="App purpose or notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

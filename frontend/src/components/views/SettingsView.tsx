import React, { useState, useEffect } from 'react';
import { Check, Key, Trash2, Plus, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { httpApiAdapter, CredentialItem } from '@/api/http-adapter';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Profile' | 'API keys' | 'Models' | 'Notifications' | 'Billing'>('API keys');

  // Profile State
  const [name, setName] = useState('LocalFlow Operator');
  const [workspace, setWorkspace] = useState('Personal Local Workspace');
  const [model, setModel] = useState('gemini-3.5-flash');

  // Credentials State
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [credName, setCredName] = useState('');
  const [credType, setCredType] = useState('gemini_api_key');
  const [credValue, setCredValue] = useState('');
  const [credDesc, setCredDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification Alerts
  const [failedRunsAlert, setFailedRunsAlert] = useState(true);
  const [weeklySummaryAlert, setWeeklySummaryAlert] = useState(true);
  const [productNewsAlert, setProductNewsAlert] = useState(false);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoadingCreds(true);
      const res = await httpApiAdapter.listCredentials();
      setCredentials(res || []);
    } catch (err) {
      console.warn('Failed to load credentials:', err);
    } finally {
      setLoadingCreds(false);
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credName.trim() || !credValue.trim()) return;
    try {
      setIsSubmitting(true);
      await httpApiAdapter.createCredential({
        name: credName.trim(),
        credential_type: credType,
        value: credValue.trim(),
        description: credDesc.trim(),
      });
      setCredName('');
      setCredValue('');
      setCredDesc('');
      setShowAddModal(false);
      await loadCredentials();
    } catch (err) {
      console.error('Failed to create credential:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      await httpApiAdapter.deleteCredential(id);
      await loadCredentials();
    } catch (err) {
      console.error('Failed to delete credential:', err);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: ('Profile' | 'API keys' | 'Models' | 'Notifications' | 'Billing')[] = [
    'API keys',
    'Profile',
    'Models',
    'Notifications',
    'Billing',
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Save Action */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
              Settings & Credentials
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Manage your workspace, encrypted secret vault, models and alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save changes</span>
            )}
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Left Vertical Tab Pills */}
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold text-center transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#0e2118] text-white shadow-2xs'
                    : 'bg-white border border-[#ded8cc] text-[#5c6861] hover:bg-[#ebe7dc]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Setting Cards */}
          <div className="md:col-span-3 space-y-5">
            {/* ─── API Keys & Credential Vault Tab ─────────────────────────── */}
            {activeTab === 'API keys' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#0e2118] flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#15803d]" />
                        <span>Encrypted Credential Vault</span>
                      </h2>
                      <p className="text-xs text-[#6e7d75] mt-1">
                        Keys are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) and never stored in plain text.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0e2118] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Credential</span>
                    </button>
                  </div>

                  {/* Credentials Table */}
                  {loadingCreds ? (
                    <div className="py-8 text-center text-xs text-[#6e7d75]">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#15803d]" />
                      Loading encrypted credentials...
                    </div>
                  ) : credentials.length === 0 ? (
                    <div className="py-8 text-center bg-[#fbfaf8] border border-dashed border-[#ded8cc] rounded-xl">
                      <ShieldCheck className="w-8 h-8 text-[#15803d]/40 mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#0e2118]">No Credentials Stored</p>
                      <p className="text-[11px] text-[#6e7d75] mt-0.5">
                        Add your Gemini API Key or webhook tokens to use across nodes without hardcoding.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#f2eee6] text-[#6e7d75] font-semibold text-[11px]">
                            <th className="pb-2.5">Name</th>
                            <th className="pb-2.5">Type</th>
                            <th className="pb-2.5">Masked Preview</th>
                            <th className="pb-2.5">Description</th>
                            <th className="pb-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2eee6]">
                          {credentials.map((c) => (
                            <tr key={c.id} className="hover:bg-[#fbfaf8] transition-colors">
                              <td className="py-3 font-mono font-bold text-[#0e2118]">{c.name}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#f5f3ec] text-[#5c6861] rounded-md border border-[#ded8cc]">
                                  {c.credential_type}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-[11px] text-[#4b5563]">{c.masked_preview}</td>
                              <td className="py-3 text-[#6e7d75] text-[11px]">{c.description || '—'}</td>
                              <td className="py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCredential(c.id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete credential"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add Credential Modal */}
                {showAddModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
                    <div className="bg-white rounded-2xl border border-[#ded8cc] max-w-md w-full p-6 shadow-2xl space-y-4">
                      <h3 className="text-sm font-bold text-[#0e2118] flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#15803d]" />
                        <span>Store Encrypted Credential</span>
                      </h3>
                      <form onSubmit={handleAddCredential} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#5c6861]">Credential Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. GEMINI_API_KEY, slack_webhook_secret"
                            value={credName}
                            onChange={(e) => setCredName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] font-mono text-[#0e2118]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#5c6861]">Type</label>
                          <select
                            value={credType}
                            onChange={(e) => setCredType(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] text-[#0e2118]"
                          >
                            <option value="gemini_api_key">Google Gemini API Key</option>
                            <option value="ollama_url">Ollama Base URL</option>
                            <option value="webhook_secret">Webhook Ingress Secret</option>
                            <option value="github_token">GitHub Personal Access Token</option>
                            <option value="custom">Custom Token / Secret</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#5c6861]">Secret Value (Plaintext)</label>
                          <input
                            type="password"
                            required
                            placeholder="Enter API key or secret token..."
                            value={credValue}
                            onChange={(e) => setCredValue(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] font-mono text-[#0e2118]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#5c6861]">Description (Optional)</label>
                          <input
                            type="text"
                            placeholder="What this credential is used for"
                            value={credDesc}
                            onChange={(e) => setCredDesc(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] text-[#0e2118]"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f2eee6]">
                          <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 border border-[#ded8cc] text-xs font-bold text-[#5c6861] rounded-xl hover:bg-[#f5f3ec] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? 'Encrypting...' : 'Save & Encrypt'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Profile Tab ────────────────────────────────────────────── */}
            {activeTab === 'Profile' && (
              <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-[#19221d]">Profile & Workspace</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#5c6861]">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#5c6861]">Workspace</label>
                    <input
                      type="text"
                      value={workspace}
                      onChange={(e) => setWorkspace(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Models Tab ─────────────────────────────────────────────── */}
            {activeTab === 'Models' && (
              <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-[#19221d]">Default Model Orchestration</h2>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#5c6861]">Primary LLM Model</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] font-mono text-[#19221d]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Notifications Tab ──────────────────────────────────────── */}
            {activeTab === 'Notifications' && (
              <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-5">
                <h2 className="text-xs font-bold text-[#19221d]">Notifications & Alerts</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#19221d]">Failed execution alerts</h3>
                      <p className="text-[11px] text-[#78857e]">Notify when an automated DAG run fails</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFailedRunsAlert(!failedRunsAlert)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        failedRunsAlert ? 'bg-[#15803d]' : 'bg-[#ded8cc]'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          failedRunsAlert ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#19221d]">Weekly digest</h3>
                      <p className="text-[11px] text-[#78857e]">Summary of executions and tool call metrics</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWeeklySummaryAlert(!weeklySummaryAlert)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        weeklySummaryAlert ? 'bg-[#15803d]' : 'bg-[#ded8cc]'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          weeklySummaryAlert ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Billing Tab ────────────────────────────────────────────── */}
            {activeTab === 'Billing' && (
              <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-[#19221d]">Local Execution & Quotas</h2>
                <div className="p-4 bg-[#fbfaf8] border border-[#ded8cc] rounded-xl text-xs space-y-1">
                  <p className="font-bold text-[#0e2118]">100% Free & Open-Source</p>
                  <p className="text-[#6e7d75]">
                    LocalFlow Agent runs on your local machine with local PostgreSQL, local Ollama models, and native Python tools. Zero subscription fees.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

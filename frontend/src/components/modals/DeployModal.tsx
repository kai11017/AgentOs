import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { X, Check, Copy } from 'lucide-react';

export const DeployModal: React.FC = () => {
  const isDeployModalOpen = useUIStore((s) => s.isDeployModalOpen);
  const setDeployModalOpen = useUIStore((s) => s.setDeployModalOpen);
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);

  const [activeTab, setActiveTab] = useState<'Web' | 'Desktop' | 'API'>('Web');
  const [publicLink, setPublicLink] = useState(true);
  const [requireSignIn, setRequireSignIn] = useState(false);
  const [runLimits, setRunLimits] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deployed, setDeployed] = useState(false);

  if (!isDeployModalOpen) return null;

  const url = `agentos.app/w/${(currentWorkflow?.name || 'research-workflow')
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = () => {
    setDeployed(true);
    setTimeout(() => setDeployed(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 select-none">
      <div className="w-full max-w-3xl bg-[#f5f3ec] border border-[#ded8cc] rounded-3xl shadow-2xl p-7 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setDeployModalOpen(false)}
          className="absolute right-6 top-6 p-1.5 text-[#78857e] hover:text-[#19221d] rounded-xl hover:bg-[#e4ded3] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Status Pill */}
        <div className="flex items-center justify-between pr-8 mb-6">
          <div>
            <h2 className="font-display text-xl font-black text-[#0e2118] tracking-tight">
              Deploy and share
            </h2>
            <p className="font-sans text-xs text-[#6e7d75] mt-0.5">
              {currentWorkflow?.name || 'Research Workflow'} is ready to go live.
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 bg-[#dcfce7] text-[#15803d] border border-[#86efac]/80 rounded-full shadow-2xs">
            Ready
          </span>
        </div>

        {/* Tabs: Web | Desktop | API */}
        <div className="flex items-center gap-2 mb-6">
          {(['Web', 'Desktop', 'API'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#19221d] text-white shadow-2xs'
                  : 'bg-white border border-[#ded8cc] text-[#5c6861] hover:bg-[#f5f2eb]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 2-Column Card Grid (Screenshot 9) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Left Dark Forest Green Banner Card */}
          <div className="bg-[#152e24] text-white rounded-2xl p-6 shadow-sm border border-[#1f3f32] flex flex-col justify-between space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Your workflow is ready
              </h3>
              <p className="text-xs text-[#b0c8bb] leading-relaxed">
                Deploy it to share a link, or run it on your desktop.
              </p>
            </div>

            {/* URL Monospace Box */}
            <div
              onClick={handleCopy}
              className="p-3 bg-[#0d2018] border border-[#1b3d2f] rounded-xl font-mono text-xs text-[#70dbab] flex items-center justify-between cursor-pointer hover:border-[#2f634d] transition-colors"
            >
              <span className="truncate">{url}</span>
              <button type="button" className="text-[#a1cdb9] hover:text-white shrink-0 ml-2">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDeploy}
              className="w-32 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-white font-black text-xs rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              {deployed ? 'Deployed!' : 'Deploy now'}
            </button>
          </div>

          {/* Right Access Settings Card */}
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs flex flex-col justify-between space-y-4">
            <h3 className="text-xs font-bold text-[#19221d]">Access</h3>
            <div className="space-y-4">
              {/* Option 1: Public link */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#19221d]">Public link</h4>
                  <p className="text-[11px] text-[#78857e]">
                    Anyone with the link can run it
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicLink(!publicLink)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    publicLink ? 'bg-[#15803d]' : 'bg-[#e4ded3]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      publicLink ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Require sign in */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#19221d]">Require sign in</h4>
                  <p className="text-[11px] text-[#78857e]">Only your team</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireSignIn(!requireSignIn)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    requireSignIn ? 'bg-[#15803d]' : 'bg-[#e4ded3]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      requireSignIn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Option 3: Run limits */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#19221d]">Run limits</h4>
                  <p className="text-[11px] text-[#78857e]">60 runs per hour</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRunLimits(!runLimits)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    runLimits ? 'bg-[#15803d]' : 'bg-[#e4ded3]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      runLimits ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { ArrowUpRight, Plus, ArrowRight } from 'lucide-react';

export const HomeView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);

  const handleOpenWorkflow = async (id: string) => {
    await loadWorkflow(id);
    setCurrentView('editor');
  };

  const handleNewWorkflow = async () => {
    await createWorkflow('Untitled Workflow');
    setCurrentView('editor');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
              Good afternoon, Rippika
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Create. Automate. Innovate. Here is how your agents are doing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewWorkflow}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New workflow</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-xs flex flex-col justify-between">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Total executions</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#0e2118]">128</span>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                up 12%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-xs flex flex-col justify-between">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Workflows</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#0e2118]">24</span>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                up 8%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-xs flex flex-col justify-between">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Success rate</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#15803d]">99.2%</span>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                up 1%
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Continue where you left off + Start faster */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Continue where you left off (2 cols) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#19221d]">
              Continue where you left off
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#f0ebe0] hover:border-[#dfd8cc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#f1ebfc] text-[#6b3fc9] font-bold text-xs flex items-center justify-center">
                    R
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">Research Workflow</h3>
                    <span className="text-[11px] text-[#86948d]">Edited 2m ago</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflow('demo-workflow-1')}
                  className="px-3.5 py-1.5 border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[#f0ebe0] hover:border-[#dfd8cc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#fef1e6] text-[#b85816] font-bold text-xs flex items-center justify-center">
                    E
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">Email Automation</h3>
                    <span className="text-[11px] text-[#86948d]">Edited 1h ago</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflow('wf-email-auto')}
                  className="px-3.5 py-1.5 border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[#f0ebe0] hover:border-[#dfd8cc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#e5f3fa] text-[#16719e] font-bold text-xs flex items-center justify-center">
                    G
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">Report Generator</h3>
                    <span className="text-[11px] text-[#86948d]">Edited yesterday</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflow('wf-report-gen')}
                  className="px-3.5 py-1.5 border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>
            </div>
          </div>

          {/* Start Faster (1 col) */}
          <div className="bg-white rounded-2xl border border-[#e4ded3] p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#19221d]">Start faster</h2>
              <p className="text-xs text-[#78857e] mt-1">
                Pick a template and have a working agent in minutes.
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setCurrentView('templates')}
                className="w-full py-2.5 px-3 bg-white border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors text-center cursor-pointer"
              >
                Browse templates
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('agents')}
                className="w-full py-2.5 px-3 bg-white border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors text-center cursor-pointer"
              >
                Add an agent
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('tools')}
                className="w-full py-2.5 px-3 bg-white border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors text-center cursor-pointer"
              >
                Connect a tool
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white rounded-2xl border border-[#e4ded3] p-6 shadow-xs space-y-2">
          <h2 className="text-sm font-bold text-[#19221d]">Recent activity</h2>
          <p className="text-xs text-[#78857e] leading-relaxed">
            Research Workflow finished in 42s, 2m ago. Email Automation finished in 35s, 5m ago. Data Sync failed 10m ago.
          </p>
        </div>
      </div>
    </div>
  );
};


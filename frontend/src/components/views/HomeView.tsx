import React, { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Plus, ArrowRight, Network, Layers, Sparkles } from 'lucide-react';

export const HomeView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setCreateWorkflowModalOpen = useUIStore((s) => s.setCreateWorkflowModalOpen);
  const workflows = useWorkflowStore((s) => s.workflows);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleOpenWorkflow = async (id: string) => {
    await loadWorkflow(id);
    setCurrentView('editor');
  };

  const handleNewWorkflow = () => {
    setCreateWorkflowModalOpen(true);
  };

  const activeWorkflowsCount = workflows.filter((w) => w.isActive).length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
              Good afternoon, Joe
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Create. Automate. Innovate. Here is how your autonomous pipelines are running.
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
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Total Workflows</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#0e2118]">{workflows.length}</span>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                in database
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-xs flex flex-col justify-between">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Active Automations</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#0e2118]">{activeWorkflowsCount}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                scheduled
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-xs flex flex-col justify-between">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Execution Reliability</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-display text-3xl font-black text-[#15803d]">100%</span>
              <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full flex items-center shadow-2xs">
                online
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Continue where you left off + Start faster */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Continue where you left off (2 cols) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#19221d]">
                Continue where you left off
              </h2>
              <button
                type="button"
                onClick={() => setCurrentView('workflows')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                View all ({workflows.length})
              </button>
            </div>

            <div className="space-y-3">
              {workflows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#809088] border border-dashed border-[#ded8cc] rounded-xl">
                  No workflows created yet. Click "New workflow" above to get started.
                </div>
              ) : (
                workflows.slice(0, 4).map((wf) => {
                  const nodeCount = wf.nodes?.length || 0;
                  const initialLetter = (wf.name || 'W').charAt(0).toUpperCase() || 'W';

                  return (
                    <div
                      key={wf.id}
                      onClick={() => handleOpenWorkflow(wf.id)}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#f0ebe0] hover:border-[#15803d]/50 hover:bg-[#faf8f4] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                          {initialLetter}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#19221d] group-hover:text-emerald-700 transition-colors">
                            {wf.name}
                          </h3>
                          <span className="text-[11px] text-[#86948d] flex items-center gap-1.5 mt-0.5">
                            <Layers className="w-3 h-3" />
                            <span>{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{wf.id}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWorkflow(wf.id);
                        }}
                        className="px-3.5 py-1.5 border border-[#e4ded3] group-hover:bg-[#15803d] group-hover:text-white group-hover:border-[#15803d] text-xs font-bold text-[#19221d] rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Start Faster (1 col) */}
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#19221d]">Start faster</h2>
              </div>
              <p className="text-xs text-[#78857e] mt-1.5 leading-relaxed">
                Pick a battle-tested industrial template to deploy an autonomous agent pipeline in seconds.
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setCurrentView('templates')}
                className="w-full py-2.5 px-3 bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 text-xs font-bold text-emerald-900 rounded-xl transition-colors text-center cursor-pointer shadow-2xs"
              >
                Browse template library
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('automations')}
                className="w-full py-2.5 px-3 bg-white border border-[#ded8cc] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors text-center cursor-pointer"
              >
                Manage background schedules
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('tools')}
                className="w-full py-2.5 px-3 bg-white border border-[#ded8cc] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors text-center cursor-pointer"
              >
                View registered tools & MCP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

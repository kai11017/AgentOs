import React from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { useUIStore } from '@/stores/ui-store';
import { Play, Square, Share2 } from 'lucide-react';

export const WorkflowToolbar: React.FC = () => {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const executeWorkflow = useExecutionStore((s) => s.executeWorkflow);
  const stopExecution = useExecutionStore((s) => s.stopExecution);

  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setDeployModalOpen = useUIStore((s) => s.setDeployModalOpen);

  const handleRun = () => {
    if (currentWorkflow) {
      executeWorkflow(currentWorkflow.id);
    }
  };

  return (
    <header className="h-16 bg-[#f5f3ec] border-b border-[#ded8cc] px-6 flex items-center justify-between z-20 select-none shrink-0">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col">
        <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">
          Workflows / Research
        </span>
        <div className="flex items-center gap-2.5 mt-0.5">
          <h1 className="font-display text-[17px] font-black text-[#0e2118] tracking-tight">
            {currentWorkflow?.name || 'Research Workflow'}
          </h1>
          <span className="flex items-center gap-2 text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2.5 py-0.5 rounded-full shadow-2xs ml-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16a34a]"></span>
            </span>
            Active
          </span>
        </div>
      </div>

      {/* Segmented Center Control: Editor | Executions | Analytics */}
      <div className="flex items-center bg-[#ebe7dc] p-1 rounded-xl text-xs font-bold text-[#5c6d64]">
        <button
          type="button"
          onClick={() => setCurrentView('editor')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === 'editor'
              ? 'bg-white text-[#0e2118] shadow-xs'
              : 'hover:text-[#0e2118]'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('executions')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === 'executions'
              ? 'bg-white text-[#0e2118] shadow-xs'
              : 'hover:text-[#0e2118]'
          }`}
        >
          Executions
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('home')}
          className="px-4 py-1.5 rounded-lg hover:text-[#0e2118] transition-all cursor-pointer"
        >
          Analytics
        </button>
      </div>

      {/* Right Actions: Share & Run Workflow */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDeployModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#ded8cc] hover:border-[#15803d]/40 text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 stroke-[2]" />
          <span>Share</span>
        </button>

        {isExecuting ? (
          <button
            type="button"
            onClick={stopExecution}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(220,38,38,0.35)] transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop workflow</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRun}
            className="flex items-center gap-2 px-5 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run workflow</span>
          </button>
        )}
      </div>
    </header>
  );
};

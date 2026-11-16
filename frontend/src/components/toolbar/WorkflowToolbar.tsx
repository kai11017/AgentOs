import React, { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { useUIStore } from '@/stores/ui-store';
import { Play, Square, Share2, LayoutTemplate, Save, Check, Plus, Edit2, Mail } from 'lucide-react';

export const WorkflowToolbar: React.FC = () => {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const executeWorkflow = useExecutionStore((s) => s.executeWorkflow);
  const stopExecution = useExecutionStore((s) => s.stopExecution);

  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setDeployModalOpen = useUIStore((s) => s.setDeployModalOpen);
  const setCreateWorkflowModalOpen = useUIStore((s) => s.setCreateWorkflowModalOpen);
  const setEmailOutboxOpen = useUIStore((s) => s.setEmailOutboxOpen);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleRun = async () => {
    if (currentWorkflow) {
      // 1. Immediately persist canvas to backend database so execution runs latest nodes
      await saveWorkflow();
      // 2. Dispatch execution
      await executeWorkflow(currentWorkflow.id);
    }
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await saveWorkflow();
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && currentWorkflow) {
      setWorkflowName(titleInput.trim());
      await saveWorkflow();
    }
  };

  return (
    <header className="h-16 bg-[#f5f3ec] border-b border-[#ded8cc] px-6 flex items-center justify-between z-20 select-none shrink-0">
      {/* Breadcrumb & Editable Title */}
      <div className="flex flex-col">
        <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">
          Workflows / {currentWorkflow?.id || 'demo-workflow-1'}
        </span>
        <div className="flex items-center gap-2.5 mt-0.5">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="font-display text-[16px] font-black text-[#0e2118] bg-white border border-[#15803d] px-2 py-0.5 rounded-lg outline-none shadow-xs"
            />
          ) : (
            <div
              onClick={() => {
                setTitleInput(currentWorkflow?.name || '');
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Click to rename workflow"
            >
              <h1 className="font-display text-[17px] font-black text-[#0e2118] tracking-tight group-hover:text-emerald-700 transition-colors">
                {currentWorkflow?.name || 'Research Workflow'}
              </h1>
              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

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
          onClick={() => setCurrentView('automations')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === 'automations'
              ? 'bg-white text-[#0e2118] shadow-xs'
              : 'hover:text-[#0e2118]'
          }`}
        >
          Automations
        </button>
      </div>

      {/* Right Actions: New, Templates, Save, Share & Run */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCreateWorkflowModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#ded8cc] hover:border-emerald-600/50 text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          title="Create a new workflow"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-700" />
          <span>New</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('templates')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#ded8cc] hover:border-[#15803d]/50 text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 stroke-[2] text-[#15803d]" />
          <span>Templates</span>
        </button>

        {/* Explicit Database Save Button */}
        <button
          type="button"
          onClick={handleManualSave}
          className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer ${
            isDirty
              ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-[0_2px_10px_rgba(217,119,6,0.35)]'
              : 'bg-white border border-[#ded8cc] text-[#55695f] hover:border-[#15803d]/40'
          }`}
          title={isDirty ? 'Unsaved changes (Ctrl+S)' : 'All workflow nodes & edges saved to database'}
        >
          {isDirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Save</span>
            </>
          ) : isSaving ? (
            <>
              <Save className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved</span>
            </>
          )}
        </button>

        {/* Email Outbox Viewer */}
        <button
          type="button"
          onClick={() => setEmailOutboxOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#ded8cc] hover:border-emerald-600/50 text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer group"
          title="Open AgentOS Email Outbox & SMTP Tester"
        >
          <Mail className="w-3.5 h-3.5 stroke-[2] text-emerald-600 group-hover:scale-110 transition-transform" />
          <span>Outbox</span>
        </button>

        <button
          type="button"
          onClick={() => setDeployModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#ded8cc] hover:border-[#15803d]/40 text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
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

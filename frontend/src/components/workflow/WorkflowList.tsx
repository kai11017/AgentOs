import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { formatDate } from '@/lib/utils';
import {
  X,
  Plus,
  Search,
  Copy,
  Trash2,
  FolderOpen,
  ArrowRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface WorkflowListProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ isOpen, onClose }) => {
  const workflows = useWorkflowStore((s) => s.workflows);
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow);

  const [search, setSearch] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkflows();
    }
  }, [isOpen, loadWorkflows]);

  if (!isOpen) return null;

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newWorkflowName.trim()) return;
    const created = await createWorkflow(newWorkflowName.trim());
    setNewWorkflowName('');
    setIsCreating(false);
    onClose();
  };

  const handleSelect = async (id: string) => {
    await loadWorkflow(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Agent Workflows
              </h2>
              <p className="text-xs text-slate-400">
                Manage, duplicate, or switch between automation flows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows by name or description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Workflow
          </button>
        </div>

        {/* Inline Create Input */}
        {isCreating && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Enter new workflow name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg outline-none text-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs px-2.5 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Workflow Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No workflows found.</p>
            </div>
          ) : (
            filteredWorkflows.map((workflow) => {
              const isCurrent = currentWorkflow?.id === workflow.id;
              return (
                <div
                  key={workflow.id}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-indigo-500/80 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    onClick={() => handleSelect(workflow.id)}
                    className="flex-1 cursor-pointer pr-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {workflow.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    {workflow.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {workflow.nodes.length} nodes
                      </span>
                      <span>Updated {formatDate(workflow.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateWorkflow(workflow.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(workflow.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg font-medium ml-1 transition-colors"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};


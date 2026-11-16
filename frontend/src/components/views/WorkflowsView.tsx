import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Search, Plus, Network, Layers, Trash2, Copy, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export const WorkflowsView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setCreateWorkflowModalOpen = useUIStore((s) => s.setCreateWorkflowModalOpen);
  const workflows = useWorkflowStore((s) => s.workflows);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow);

  const [search, setSearch] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleOpen = async (id: string) => {
    await loadWorkflow(id);
    setCurrentView('editor');
  };

  const handleNew = () => {
    setCreateWorkflowModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      await deleteWorkflow(id);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await duplicateWorkflow(id);
  };

  const filtered = (workflows || []).filter((item) =>
    (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#19221d] tracking-tight">
              Workflows
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'} active in this workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows by name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#0e2118]"
              />
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New workflow</span>
            </button>
          </div>
        </div>

        {/* Workflows Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#ded8cc] p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="font-display text-sm font-bold text-[#0e2118]">No workflows found</h3>
            <p className="text-xs text-[#6e7f75] max-w-sm">
              {search ? 'No workflows match your search query.' : 'Create your first automated workflow to connect AI agents, local models, and tools.'}
            </p>
            <button
              type="button"
              onClick={handleNew}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workflow</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const nodeCount = item.nodes?.length || 0;
              const edgeCount = item.edges?.length || 0;
              const isDefaultDemo = item.id === 'demo-workflow-1';

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpen(item.id)}
                  className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-between space-y-4 hover:shadow-md hover:border-[#15803d]/50 transition-all cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                          <Network className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="font-display text-sm font-bold text-[#0e2118] truncate group-hover:text-emerald-700 transition-colors">
                          {item.name}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs ${
                          item.isActive
                            ? 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]/80'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    <p className="font-sans text-xs text-[#6e7f75] line-clamp-2 leading-relaxed min-h-[32px]">
                      {item.description || 'No description provided.'}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold text-[#506358] bg-[#f2eee6] px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Architecture Stats */}
                  <div className="py-2.5 px-3 bg-[#fbf9f4] rounded-xl border border-[#ede8dc] flex items-center justify-between text-[11px] text-[#6e7f75] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>
                    </span>
                    <span className="text-[#a4b1aa]">•</span>
                    <span>{edgeCount} {edgeCount === 1 ? 'connection' : 'connections'}</span>
                    <span className="text-[#a4b1aa]">•</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[80px]">
                      {item.id}
                    </span>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#f2eee6]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Duplicate workflow"
                        onClick={(e) => handleDuplicate(e, item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#ede8dc] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!isDefaultDemo && (
                        <button
                          type="button"
                          title="Delete workflow"
                          onClick={(e) => handleDelete(e, item.id, item.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpen(item.id)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-[#f4f1ea] hover:bg-[#15803d] hover:text-white text-xs font-bold text-[#19221d] rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Open Canvas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

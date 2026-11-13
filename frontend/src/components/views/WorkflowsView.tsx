import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Search, Plus } from 'lucide-react';

interface WorkflowCardItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'failing' | 'paused';
  statusLabel: string;
  runsText: string;
  dots: string[]; // Dot colors for pipeline visualization
}

const WORKFLOW_ITEMS: WorkflowCardItem[] = [
  {
    id: 'demo-workflow-1',
    name: 'Research Workflow',
    description: 'Automate research and reporting',
    status: 'active',
    statusLabel: 'Active',
    runsText: '24 runs, last run 2m ago',
    dots: ['#fef1e6', '#f1ebfc', '#fdecf1', '#1e4d3a'],
  },
  {
    id: 'wf-email-auto',
    name: 'Email Automation',
    description: 'Triage and reply to email',
    status: 'active',
    statusLabel: 'Active',
    runsText: '61 runs, last run 5m ago',
    dots: ['#fef1e6', '#e5f3fa', '#fdecf1', '#1e4d3a'],
  },
  {
    id: 'wf-data-sync',
    name: 'Data Sync',
    description: 'Sync CRM rows nightly',
    status: 'failing',
    statusLabel: 'Failing',
    runsText: '18 runs, last run 10m ago',
    dots: ['#fef1e6', '#f1ebfc', '#fdecf1', '#1e4d3a'],
  },
  {
    id: 'wf-report-gen',
    name: 'Report Generator',
    description: 'Weekly summary to Notion',
    status: 'active',
    statusLabel: 'Active',
    runsText: '9 runs, last run 15m ago',
    dots: ['#fef1e6', '#f1ebfc', '#fdecf1', '#1e4d3a'],
  },
  {
    id: 'wf-social-posts',
    name: 'Social Posts',
    description: 'Draft and schedule posts',
    status: 'paused',
    statusLabel: 'Paused',
    runsText: '12 runs, last run 2d ago',
    dots: ['#fef1e6', '#f1ebfc', '#fdecf1', '#1e4d3a'],
  },
  {
    id: 'wf-daily-brief',
    name: 'Daily Briefing',
    description: 'Morning digest of your day',
    status: 'active',
    statusLabel: 'Active',
    runsText: '40 runs, last run today',
    dots: ['#fef1e6', '#f1ebfc', '#fdecf1', '#1e4d3a'],
  },
];

export const WorkflowsView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);

  const [search, setSearch] = useState('');

  const handleOpen = async (id: string) => {
    await loadWorkflow(id);
    setCurrentView('editor');
  };

  const handleNew = async () => {
    await createWorkflow('New Automation Workflow');
    setCurrentView('editor');
  };

  const filtered = WORKFLOW_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#19221d] tracking-tight">
              Workflows
            </h1>
            <p className="text-xs text-[#6e7d75] mt-1">
              24 workflows in this workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows"
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

        {/* 2-Column Grid of Workflow Cards (Screenshot 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-between space-y-4 hover:shadow-md hover:border-[#15803d]/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#0e2118] truncate">
                    {item.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs ${
                      item.status === 'active'
                        ? 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]/80'
                        : item.status === 'failing'
                        ? 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]/80'
                        : 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]/80'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </div>
                <p className="font-sans text-xs text-[#6e7f75] mt-1">
                  {item.description}
                </p>
              </div>

              {/* Connected Pipeline Dots Graphic */}
              <div className="flex items-center justify-center py-3 relative">
                <div className="absolute h-0.5 bg-[#335d48]/40 w-3/4 left-1/8 z-0" />
                <div className="flex items-center justify-between w-3/4 z-10">
                  {item.dots.map((dotColor, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border-2 border-white shadow-xs transition-transform hover:scale-125"
                      style={{ backgroundColor: dotColor }}
                    />
                  ))}
                </div>
              </div>

              {/* Footer: Runs info & Open button */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f2eee6]">
                <span className="text-[11px] text-[#86948d]">
                  {item.runsText}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpen(item.id)}
                  className="px-3.5 py-1.5 border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


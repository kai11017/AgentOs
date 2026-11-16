import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { httpApiAdapter, TemplateItemSummary } from '@/api/http-adapter';
import { Search, Sparkles, Layers, ArrowRight, Loader2 } from 'lucide-react';

const FALLBACK_TEMPLATES: TemplateItemSummary[] = [
  {
    id: 'tpl-autonomous-researcher',
    name: 'Autonomous Web & Market Research Agent',
    category: 'Autonomous AI',
    description: 'Multi-turn autonomous agent that searches DuckDuckGo, extracts webpage contents, synthesizes structured market intelligence, and stores findings into persistent memory.',
    icon: 'Brain',
    tags: ['AI Agent', 'DuckDuckGo', 'Web Scraping', 'Persistent Memory'],
    node_count: 4,
    edge_count: 3,
  },
  {
    id: 'tpl-scheduled-digest',
    name: 'Scheduled Daily System & Security Digest',
    category: 'Scheduled Automations',
    description: 'Runs on a recurring cron schedule (every morning) to collect local PC hardware metrics, disk storage trends, and generate an executive health digest.',
    icon: 'Clock',
    tags: ['Cron', 'Scheduler', 'System Diagnostics', 'Local MCP'],
    node_count: 3,
    edge_count: 2,
  },
  {
    id: 'tpl-human-approval',
    name: 'Human-in-the-Loop Approval & Action Gate',
    category: 'Human-in-the-Loop',
    description: 'Receives an external payload, drafts a proposed execution plan with an autonomous AI agent, pauses at an interactive operator review gate, and resumes only upon human authorization.',
    icon: 'ShieldAlert',
    tags: ['Human-in-the-Loop', 'Safety Gate', 'Webhook', 'Approval'],
    node_count: 5,
    edge_count: 4,
  },
  {
    id: 'tpl-code-security',
    name: 'Sandboxed Python Code Review & Linter',
    category: 'Developer Tools',
    description: 'Inspects Python snippets, runs sandboxed AST validation, calculates code complexity, and verifies unit test outputs safely.',
    icon: 'FileCode',
    tags: ['Code Review', 'Python Sandbox', 'AST', 'Security'],
    node_count: 3,
    edge_count: 2,
  },
];

export const TemplatesView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);

  const [templates, setTemplates] = useState<TemplateItemSummary[]>(FALLBACK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const res = await httpApiAdapter.listTemplates();
        if (res && res.length > 0) {
          setTemplates(res);
        }
      } catch (err) {
        console.warn('Using fallback templates:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const categories = ['All', 'Autonomous AI', 'Scheduled Automations', 'Human-in-the-Loop', 'Developer Tools'];

  const handleUseTemplate = async (templateId: string) => {
    try {
      setInstantiatingId(templateId);
      const res = await httpApiAdapter.instantiateTemplate(templateId);
      await loadWorkflows();
      if (res?.workflow_id) {
        await loadWorkflow(res.workflow_id);
      }
      setCurrentView('editor');
    } catch (err) {
      console.error('Failed to instantiate template:', err);
      // Fallback
      await loadWorkflow('demo-workflow-1');
      setCurrentView('editor');
    } finally {
      setInstantiatingId(null);
    }
  };

  const filtered = templates.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesQuery =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#19221d] tracking-tight flex items-center gap-2.5">
              <span>Template Library</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac]/80">
                {templates.length} Ready
              </span>
            </h1>
            <p className="text-xs text-[#6e7d75] mt-1">
              Production-ready multi-node blueprints. Instantiate into your canvas with a single click.
            </p>
          </div>

          <div className="relative w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#86948d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by tag, tool, or name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#0e2118] text-white shadow-2xs'
                  : 'bg-white border border-[#ded8cc] text-[#5c6861] hover:bg-[#ebe7dc]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Hero Banner Card */}
        <div className="bg-gradient-to-r from-[#0e2118] via-[#153424] to-[#1e4d35] text-white rounded-3xl p-7 shadow-lg border border-[#2b5a41] flex items-center justify-between">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#f59e0b] bg-[#224430] border border-[#f59e0b]/40 px-2.5 py-0.5 rounded-md shadow-2xs">
                <Sparkles className="w-3 h-3 fill-current" />
                Featured Autonomous Agent
              </span>
              <span className="text-[11px] font-semibold text-[#86efac]">
                4 Nodes • Hybrid Gemini/Qwen
              </span>
            </div>
            <h2 className="font-display text-xl font-black tracking-tight text-white">
              Autonomous Web & Market Research Agent
            </h2>
            <p className="font-sans text-xs text-[#b8d4c4] leading-relaxed">
              Autonomously explores live web sources using DuckDuckGo, parses HTML bodies with SSRF protection, extracts key intelligence, and checkpoints findings into persistent memory.
            </p>
          </div>
          <button
            type="button"
            disabled={instantiatingId !== null}
            onClick={() => handleUseTemplate('tpl-autonomous-researcher')}
            className="flex items-center gap-2 px-5 py-3 bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-[#0e2118] font-black text-xs rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.45)] transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {instantiatingId === 'tpl-autonomous-researcher' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0e2118]" />
            ) : (
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Use Blueprint</span>
          </button>
        </div>

        {/* 2x2 or 3-Column Grid of Blueprint Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const isInstantiating = instantiatingId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-[#15803d]/50 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#f5f3ec] text-[#5c6861] border border-[#ded8cc]">
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#6e7d75]">
                      <Layers className="w-3.5 h-3.5" />
                      {item.node_count} Nodes
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-[#0e2118] group-hover:text-[#15803d] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#6e7d75] mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium bg-[#f5f3ec] text-[#425048] px-2 py-0.5 rounded-md border border-[#e5e0d5]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f2eee6]">
                  <span className="text-[11px] font-bold text-[#15803d]">
                    Ready to run
                  </span>
                  <button
                    type="button"
                    disabled={instantiatingId !== null}
                    onClick={() => handleUseTemplate(item.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0e2118] hover:bg-[#15803d] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isInstantiating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                    )}
                    <span>{isInstantiating ? 'Instantiating...' : 'Use Template'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

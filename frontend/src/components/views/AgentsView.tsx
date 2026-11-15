import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { Search, Plus, Cpu, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { httpApiAdapter, type ModelInfo } from '@/api/http-adapter';

interface AgentCardItem {
  id: string;
  initial: string;
  initialColor: { bg: string; text: string };
  title: string;
  provider: string;
  description: string;
  category: 'Local' | 'API' | 'Tools' | 'Skills';
  tag: string;
  connected?: boolean;
}

const STATIC_AGENTS: AgentCardItem[] = [
  {
    id: 'a-2',
    initial: 'G',
    initialColor: { bg: '#e5f3fa', text: '#16719e' },
    title: 'GPT-4o mini',
    provider: 'OpenAI Cloud',
    description: 'Ultra-fast multimodal reasoning for general synthesis.',
    category: 'API',
    tag: 'Cloud API',
    connected: true,
  },
  {
    id: 'a-3',
    initial: 'M',
    initialColor: { bg: '#e3f2eb', text: '#1e6b47' },
    title: 'MCP Web Search',
    provider: 'Built-in Tool',
    description: 'Autonomous web search and real-time crawling.',
    category: 'Tools',
    tag: 'Tool',
    connected: true,
  },
  {
    id: 'a-4',
    initial: 'J',
    initialColor: { bg: '#fef1e6', text: '#b85816' },
    title: 'JavaScript Sandbox',
    provider: 'Sandboxed Runtime',
    description: 'Subprocess code execution for data transformations.',
    category: 'Skills',
    tag: 'Skill',
    connected: true,
  },
  {
    id: 'a-5',
    initial: 'G',
    initialColor: { bg: '#fdecf1', text: '#b02a5c' },
    title: 'Gmail / SMTP',
    provider: 'Email Integration',
    description: 'Send and receive automated emails with templating.',
    category: 'Tools',
    tag: 'Tool',
    connected: true,
  },
  {
    id: 'a-6',
    initial: 'N',
    initialColor: { bg: '#f5f2eb', text: '#5c6861' },
    title: 'Notion Database',
    provider: 'Storage Integration',
    description: 'Create and update Notion pages, databases, and blocks.',
    category: 'Tools',
    tag: 'Tool',
    connected: true,
  },
];

export const AgentsView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null);

  const filters = ['All', 'Local', 'API', 'Tools', 'Skills'];

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await httpApiAdapter.listModels();
      setLocalModels(models);
    } catch {
      // Fallback
      setLocalModels([
        { name: 'llama3:latest', size: '4.7 GB', status: 'ready', isLocal: true, provider: 'Ollama (Local)' },
        { name: 'qwen2.5-coder:7b', size: '4.7 GB', status: 'ready', isLocal: true, provider: 'Ollama' },
      ]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handlePullModel = async (modelName: string) => {
    setPullingModel(modelName);
    setPullStatusMsg(`Initiating pull for ${modelName}...`);
    try {
      await httpApiAdapter.pullModel(modelName);
      setPullStatusMsg(`Download started for ${modelName}. Pulling in background...`);
      setTimeout(() => {
        fetchModels();
        setPullingModel(null);
      }, 4000);
    } catch (e: any) {
      setPullStatusMsg(`Pull error: ${e.message}`);
      setPullingModel(null);
    }
  };

  // Convert localModels into agent cards
  const dynamicLocalCards: AgentCardItem[] = localModels
    .filter((m) => m.isLocal)
    .map((m, idx) => ({
      id: `local-${idx}-${m.name}`,
      initial: m.name.charAt(0).toUpperCase(),
      initialColor: { bg: '#f3e8ff', text: '#7c3aed' },
      title: m.name,
      provider: `${m.provider} • ${m.size}`,
      description: 'Zero-latency local neural network running completely offline with 100% data privacy.',
      category: 'Local',
      tag: 'Local Model',
      connected: true,
    }));

  const allItems = [...dynamicLocalCards, ...STATIC_AGENTS];

  const filtered = allItems.filter((item) => {
    const matchesFilter = selectedFilter === 'All' || item.category === selectedFilter;
    const matchesQuery =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
              Models & Agents
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Local neural models running on Ollama & Docker, external reasoning APIs, tools, and sandboxed skills.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchModels}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#ded8cc] hover:bg-[#f6f3eb] text-[#0e2118] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              title="Refresh models"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('editor')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Open in Canvas</span>
            </button>
          </div>
        </div>

        {/* Live Local Engine Banner */}
        <div className="bg-white rounded-2xl border border-[#ded8cc] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0 ring-1 ring-[#86efac]">
              <Cpu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-[#0e2118]">
                  Local Engine Active
                </h3>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac] px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-ping" />
                  127.0.0.1:11434
                </span>
              </div>
              <p className="font-sans text-[11px] text-[#6e7f75] mt-0.5">
                Local Agent: <strong className="text-[#0e2118] font-mono">qwen3.5:4b</strong> • Cloud Agent: <strong className="text-[#15803d] font-mono">Gemini 3.5 Flash</strong> (Connected)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePullModel('qwen2.5-coder:7b')}
              disabled={pullingModel !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3eb] hover:bg-[#ebe7dc] text-[#0e2118] font-bold text-xs rounded-xl border border-[#ded8cc] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pull Qwen 2.5 Coder</span>
            </button>
            <button
              type="button"
              onClick={() => handlePullModel('deepseek-r1:8b')}
              disabled={pullingModel !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3eb] hover:bg-[#ebe7dc] text-[#0e2118] font-bold text-xs rounded-xl border border-[#ded8cc] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pull DeepSeek R1</span>
            </button>
          </div>
        </div>

        {pullStatusMsg && (
          <div className="px-4 py-2 bg-[#dcfce7] border border-[#86efac] rounded-xl text-xs font-semibold text-[#15803d] flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>{pullStatusMsg}</span>
          </div>
        )}

        {/* Filters & Search Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedFilter === f
                    ? 'bg-[#19221d] text-white shadow-2xs'
                    : 'bg-white border border-[#e4ded3] text-[#5c6861] hover:bg-[#f5f2eb]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models, tools and skills"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e4ded3] rounded-xl outline-none focus:border-[#15803d] text-[#19221d]"
            />
          </div>
        </div>

        {/* 3-Column Grid of Agent / Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-between space-y-4 hover:shadow-md hover:border-[#15803d]/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: item.initialColor.bg,
                      color: item.initialColor.text,
                    }}
                  >
                    {item.initial}
                  </div>
                  <div>
                    <h3 className="font-display text-xs font-bold text-[#0e2118]">
                      {item.title}
                    </h3>
                    <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">
                      {item.provider}
                    </span>
                  </div>
                </div>
                <p className="font-sans text-xs text-[#6e7f75] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#f0ede4]">
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs"
                  style={{
                    backgroundColor: item.initialColor.bg,
                    color: item.initialColor.text,
                  }}
                >
                  {item.tag}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-xl bg-[#dcfce7] border border-[#86efac]/80 text-[#15803d] shadow-2xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ready</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

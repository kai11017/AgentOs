import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { Search, Plus, Check } from 'lucide-react';

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

const AGENTS_LIST: AgentCardItem[] = [
  {
    id: 'a-1',
    initial: 'L',
    initialColor: { bg: '#f1ebfc', text: '#6b3fc9' },
    title: 'Llama 3.2 Local',
    provider: 'Runs offline',
    description: 'Run offline on your own machine with your model.',
    category: 'Local',
    tag: 'Local',
    connected: false,
  },
  {
    id: 'a-2',
    initial: 'G',
    initialColor: { bg: '#e5f3fa', text: '#16719e' },
    title: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Powerful reasoning for complex agent tasks.',
    category: 'API',
    tag: 'API',
    connected: true,
  },
  {
    id: 'a-3',
    initial: 'M',
    initialColor: { bg: '#e3f2eb', text: '#1e6b47' },
    title: 'MCP Web Search',
    provider: 'Tool',
    description: 'Search the web for fresh information.',
    category: 'Tools',
    tag: 'Tool',
    connected: false,
  },
  {
    id: 'a-4',
    initial: 'J',
    initialColor: { bg: '#fef1e6', text: '#b85816' },
    title: 'JavaScript Skill',
    provider: 'Skill',
    description: 'Run custom JS inside any workflow.',
    category: 'Skills',
    tag: 'Skill',
    connected: false,
  },
  {
    id: 'a-5',
    initial: 'G',
    initialColor: { bg: '#fdecf1', text: '#b02a5c' },
    title: 'Gmail',
    provider: 'Tool',
    description: 'Read, send and label email.',
    category: 'Tools',
    tag: 'Tool',
    connected: true,
  },
  {
    id: 'a-6',
    initial: 'N',
    initialColor: { bg: '#f5f2eb', text: '#5c6861' },
    title: 'Notion',
    provider: 'Tool',
    description: 'Create and update pages and databases.',
    category: 'Tools',
    tag: 'Tool',
    connected: false,
  },
];

export const AgentsView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [connectedState, setConnectedState] = useState<Record<string, boolean>>({
    'a-2': true,
    'a-5': true,
  });

  const filters = ['All', 'Local', 'API', 'Tools', 'Skills'];

  const toggleConnect = (id: string) => {
    setConnectedState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = AGENTS_LIST.filter((item) => {
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
              Agents
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Extend what your workflows can do. Local models, APIs, tools and skills.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('editor')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create agent</span>
          </button>
        </div>

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
              placeholder="Search agents and tools"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e4ded3] rounded-xl outline-none focus:border-[#1e4d3a] text-[#19221d]"
            />
          </div>
        </div>

        {/* 3-Column Grid of Agent / Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isConnected = connectedState[item.id];
            return (
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
                  <p className="font-sans text-xs text-[#6e7f75]">
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
                  <button
                    type="button"
                    onClick={() => toggleConnect(item.id)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isConnected
                        ? 'bg-[#dcfce7] border border-[#86efac]/80 text-[#15803d] shadow-2xs'
                        : 'border border-[#ded8cc] hover:bg-[#15803d] hover:text-white hover:border-[#15803d] text-[#0e2118]'
                    }`}
                  >
                    {isConnected ? 'Connected' : 'Add'}
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


import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface ToolItem {
  id: string;
  initial: string;
  initialColor: { bg: string; text: string };
  name: string;
  category: 'Communication' | 'Data' | 'Dev';
  description: string;
  connected?: boolean;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 't-gmail',
    initial: 'G',
    initialColor: { bg: '#fdecf1', text: '#b02a5c' },
    name: 'Gmail',
    category: 'Communication',
    description: 'Read, send and label email.',
    connected: true,
  },
  {
    id: 't-notion',
    initial: 'N',
    initialColor: { bg: '#f5f2eb', text: '#5c6861' },
    name: 'Notion',
    category: 'Data',
    description: 'Pages and databases.',
    connected: true,
  },
  {
    id: 't-mcp-search',
    initial: 'M',
    initialColor: { bg: '#e3f2eb', text: '#1e6b47' },
    name: 'MCP Web Search',
    category: 'Data',
    description: 'Live web results.',
    connected: false,
  },
  {
    id: 't-slack',
    initial: 'S',
    initialColor: { bg: '#e5f3fa', text: '#16719e' },
    name: 'Slack',
    category: 'Communication',
    description: 'Post to channels.',
    connected: false,
  },
  {
    id: 't-js',
    initial: 'J',
    initialColor: { bg: '#fef1e6', text: '#b85816' },
    name: 'JavaScript Skill',
    category: 'Dev',
    description: 'Run custom code.',
    connected: false,
  },
  {
    id: 't-webhook',
    initial: 'W',
    initialColor: { bg: '#f1ebfc', text: '#6b3fc9' },
    name: 'Webhook',
    category: 'Dev',
    description: 'Receive or send HTTP calls.',
    connected: false,
  },
];

export const ToolsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [connections, setConnections] = useState<Record<string, boolean>>({
    't-gmail': true,
    't-notion': true,
  });

  const filters = ['All', 'Connected', 'Communication', 'Data', 'Dev'];

  const toggleConnect = (id: string) => {
    setConnections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = TOOLS_LIST.filter((t) => {
    const isConn = connections[t.id];
    if (selectedFilter === 'Connected' && !isConn) return false;
    if (selectedFilter !== 'All' && selectedFilter !== 'Connected' && t.category !== selectedFilter) {
      return false;
    }
    return (
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#19221d] tracking-tight">
              Tools
            </h1>
            <p className="text-xs text-[#6e7d75] mt-1">
              Connect apps your agents can read from and act on.
            </p>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e4ded3] rounded-xl outline-none focus:border-[#1e4d3a] text-[#19221d]"
            />
          </div>
        </div>

        {/* Filter Pills */}
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

        {/* 3-Column Grid of Tools Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isConnected = connections[item.id];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex items-center justify-between hover:shadow-md hover:border-[#15803d]/40 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: item.initialColor.bg,
                      color: item.initialColor.text,
                    }}
                  >
                    {item.initial}
                  </div>
                  <div>
                    <h3 className="font-display text-xs font-bold text-[#0e2118]">
                      {item.name}
                    </h3>
                    <p className="font-sans text-[11px] font-semibold text-[#6e7f75]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleConnect(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                    isConnected
                      ? 'bg-[#dcfce7] border border-[#86efac]/80 text-[#15803d] shadow-2xs'
                      : 'border border-[#ded8cc] hover:bg-[#15803d] hover:text-white hover:border-[#15803d] text-[#0e2118]'
                  }`}
                >
                  {isConnected ? 'Connected' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


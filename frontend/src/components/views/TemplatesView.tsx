import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Search } from 'lucide-react';

interface TemplateItem {
  id: string;
  initial: string;
  initialColor: { bg: string; text: string };
  title: string;
  category: 'AI' | 'Productivity' | 'Development' | 'Marketing';
  description: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 't-1',
    initial: 'R',
    initialColor: { bg: '#f1ebfc', text: '#6b3fc9' },
    title: 'Research Assistant',
    category: 'AI',
    description: 'Summarize topics and send a report.',
  },
  {
    id: 't-2',
    initial: 'E',
    initialColor: { bg: '#fef1e6', text: '#b85816' },
    title: 'Email Reporter',
    category: 'Productivity',
    description: 'Track events and notify your team.',
  },
  {
    id: 't-3',
    initial: 'D',
    initialColor: { bg: '#e5f3fa', text: '#16719e' },
    title: 'Data Analyzer',
    category: 'Development',
    description: 'Visualize data and spot trends.',
  },
  {
    id: 't-4',
    initial: 'S',
    initialColor: { bg: '#fdf2dd', text: '#966014' },
    title: 'Social Media Post',
    category: 'Marketing',
    description: 'Generate and publish posts.',
  },
  {
    id: 't-5',
    initial: 'W',
    initialColor: { bg: '#e3f2eb', text: '#1e6b47' },
    title: 'Web Search Agent',
    category: 'AI',
    description: 'Real-time info with source links.',
  },
  {
    id: 't-6',
    initial: 'P',
    initialColor: { bg: '#f5f2eb', text: '#5c6861' },
    title: 'Personal Assistant',
    category: 'Productivity',
    description: 'Automate your daily tasks.',
  },
];

export const TemplatesView: React.FC = () => {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Productivity', 'AI', 'Development', 'Marketing'];

  const handleUseTemplate = async () => {
    await loadWorkflow('demo-workflow-1');
    setCurrentView('editor');
  };

  const filtered = TEMPLATES.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesQuery =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#19221d] tracking-tight">
              Templates
            </h1>
            <p className="text-xs text-[#6e7d75] mt-1">
              Start from a pre-built workflow and make it yours.
            </p>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e4ded3] rounded-xl outline-none focus:border-[#1e4d3a] text-[#19221d]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#19221d] text-white shadow-2xs'
                  : 'bg-white border border-[#e4ded3] text-[#5c6861] hover:bg-[#f5f2eb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Hero Banner Card (Screenshot 5) */}
        <div className="bg-gradient-to-r from-[#0a1c14] to-[#143928] text-white rounded-3xl p-7 shadow-lg border border-[#1d4c38] flex items-center justify-between">
          <div className="space-y-2 max-w-xl">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#f59e0b] bg-[#1d4c38] border border-[#f59e0b]/30 px-2.5 py-0.5 rounded-md shadow-2xs">
              Featured
            </span>
            <h2 className="font-display text-xl font-black tracking-tight text-white">
              Research Assistant
            </h2>
            <p className="font-sans text-xs text-[#b0c8bb] leading-relaxed">
              Reads incoming email, researches the web, then reports to Notion. 5 nodes, about 8s per run.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseTemplate}
            className="px-5 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-white font-black text-xs rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all shrink-0 cursor-pointer"
          >
            Use template
          </button>
        </div>

        {/* 3-Column Grid of Template Cards (Screenshot 5) */}
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
                    <h3 className="text-xs font-bold text-[#19221d]">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-[#78857e]">
                      {item.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#78857e]">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#f2eee6]">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: item.initialColor.bg,
                    color: item.initialColor.text,
                  }}
                >
                  {item.category}
                </span>
                <button
                  type="button"
                  onClick={handleUseTemplate}
                  className="px-3.5 py-1.5 border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-bold text-[#19221d] rounded-xl transition-colors cursor-pointer"
                >
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


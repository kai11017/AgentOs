import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { NODE_CATEGORY_COLORS, NODE_CATEGORY_LABELS, type NodeCategory } from '@/types/node-definitions';
import { getLucideIcon } from '@/lib/utils';
import { Search, Plus, X, Layers, Cpu, Wrench, GitFork, Database, ChevronLeft } from 'lucide-react';

const categoryIcons: Record<NodeCategory, React.ReactNode> = {
  agent: <Cpu className="w-3.5 h-3.5" />,
  model: <Layers className="w-3.5 h-3.5" />,
  tool: <Wrench className="w-3.5 h-3.5" />,
  control: <GitFork className="w-3.5 h-3.5" />,
  data: <Database className="w-3.5 h-3.5" />,
};

export const NodePalette: React.FC = () => {
  const isPaletteOpen = useUIStore((s) => s.isPaletteOpen);
  const togglePalette = useUIStore((s) => s.togglePalette);
  const searchQuery = useUIStore((s) => s.paletteSearchQuery);
  const setSearchQuery = useUIStore((s) => s.setPaletteSearchQuery);
  const selectedCategory = useUIStore((s) => s.paletteCategory);
  const setSelectedCategory = useUIStore((s) => s.setPaletteCategory);
  const getFilteredDefinitions = useUIStore((s) => s.getFilteredDefinitions);
  const addNode = useWorkflowStore((s) => s.addNode);

  if (!isPaletteOpen) return null;

  const definitions = getFilteredDefinitions();
  const categories: (NodeCategory | 'all')[] = ['all', 'agent', 'model', 'tool', 'control', 'data'];

  const onDragStart = (e: React.DragEvent, type: string, label: string) => {
    e.dataTransfer.setData('application/agentos-node-type', type);
    e.dataTransfer.setData('application/agentos-node-label', label);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAddClick = (type: string, label: string) => {
    // Add to center of canvas with a small offset
    const randomOffset = (Math.random() - 0.5) * 80;
    addNode(type, { x: 380 + randomOffset, y: 220 + randomOffset }, label);
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex flex-col h-full z-10 select-none shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Node Library
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Drag to canvas or click (+) to add
          </p>
        </div>
        <button
          type="button"
          onClick={togglePalette}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Collapse library"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents, tools, models..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-lg outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-medium capitalize transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat !== 'all' && categoryIcons[cat]}
              {cat === 'all' ? 'All' : NODE_CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Node Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {definitions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
            No matching nodes found.
          </div>
        ) : (
          definitions.map((def) => {
            const categoryColor = NODE_CATEGORY_COLORS[def.category];
            return (
              <div
                key={def.type}
                draggable
                onDragStart={(e) => onDragStart(e, def.type, def.displayName)}
                className="group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
              >
                {/* Accent icon */}
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-sm shrink-0"
                  style={{ backgroundColor: categoryColor }}
                >
                  {getLucideIcon(def.icon, 'w-4 h-4')}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {def.displayName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-tight mt-0.5">
                    {def.description}
                  </p>
                </div>

                {/* Add (+) quick button */}
                <button
                  type="button"
                  onClick={() => handleAddClick(def.type, def.displayName)}
                  className="absolute right-2 top-2 p-1 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all"
                  title="Add to canvas"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};


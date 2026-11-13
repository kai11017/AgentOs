import React from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Plus } from 'lucide-react';

interface QuickNodeItem {
  type: string;
  label: string;
  dotColor: string;
  glowColor: string;
}

const QUICK_NODES: QuickNodeItem[] = [
  { type: 'research-agent', label: 'AI Agent', dotColor: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.45)' },
  { type: 'trigger', label: 'Trigger', dotColor: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.45)' },
  { type: 'mcp-tool', label: 'MCP Tool', dotColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)' },
  { type: 'doc-reference', label: 'Doc / Image Ref', dotColor: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.45)' },
  { type: 'if-else', label: 'Condition', dotColor: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.45)' },
  { type: 'http-request', label: 'Webhook / Email', dotColor: '#0284c7', glowColor: 'rgba(2, 132, 199, 0.45)' },
  { type: 'loop', label: 'Delay / Loop', dotColor: '#0d9488', glowColor: 'rgba(13, 148, 136, 0.45)' },
];

export const CanvasQuickAddWidget: React.FC = () => {
  const addNode = useWorkflowStore((s) => s.addNode);

  const handleQuickAdd = (type: string, label: string) => {
    // Spawn near the middle-left of the canvas with a dynamic offset
    const randomOffset = (Math.random() - 0.5) * 80;
    addNode(type, { x: 380 + randomOffset, y: 220 + randomOffset }, label);
  };

  return (
    <div className="absolute top-4 left-4 z-20 bg-white rounded-2xl border border-[#ded8cc] shadow-[0_4px_20px_rgba(15,35,25,0.08)] p-3.5 w-52 select-none">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-display text-[10px] font-black uppercase tracking-wider text-[#6a7c72]">
          ADD NODE
        </span>
        <span className="font-mono text-[9px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-1.5 py-0.5 rounded">
          Click +
        </span>
      </div>
      <div className="space-y-1">
        {QUICK_NODES.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => handleQuickAdd(item.type, item.label)}
            className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#14261d] hover:bg-[#f6f3eb] hover:text-[#0a1c14] transition-all text-left cursor-pointer"
            title={`Add ${item.label} to canvas`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                style={{
                  backgroundColor: item.dotColor,
                  boxShadow: `0 0 6px ${item.glowColor}`,
                }}
              />
              <span className="truncate font-sans font-semibold text-xs text-[#1e2f26] group-hover:text-[#0e2118]">
                {item.label}
              </span>
            </div>

            {/* Clear + Action Button */}
            <span className="w-5 h-5 rounded-lg bg-[#f0ede6] text-[#4d5e55] group-hover:bg-[#15803d] group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-2xs">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

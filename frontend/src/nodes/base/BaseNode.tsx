import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode, ExecutionStatus } from '@/types/workflow';
import nodeRegistry from '@/nodes/registry';
import { getLucideIcon, cn } from '@/lib/utils';
import { useExecutionStore } from '@/stores/execution-store';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Check, AlertCircle, Loader2, Settings, Copy, Trash2 } from 'lucide-react';

function BaseNodeComponent({ id, data, selected }: NodeProps<WorkflowNode>) {
  const definition = nodeRegistry.get(data.definitionType);
  const currentExecution = useExecutionStore((s) => s.currentExecution);
  const selectNode = useUIStore((s) => s.selectNode);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);

  const nodeResult = currentExecution?.nodeResults[id];
  const executionStatus: ExecutionStatus = nodeResult?.status || data.executionStatus || 'idle';

  const category = definition?.category || 'agent';

  // High-intensity, vibrant category styling
  const categoryIconStyles: Record<string, { bg: string; text: string; ring: string }> = {
    agent: { bg: '#f3e8ff', text: '#7c3aed', ring: '#d8b4fe' }, // Purple
    model: { bg: '#e0f2fe', text: '#0284c7', ring: '#7dd3fc' }, // Sky Blue
    tool: { bg: '#ffedd5', text: '#ea580c', ring: '#fdba74' },  // Orange/Amber
    control: { bg: '#ffe4e6', text: '#e11d48', ring: '#fda4af' }, // Crimson/Rose
    data: { bg: '#d1fae5', text: '#059669', ring: '#6ee7b7' },   // Emerald/Teal
  };

  const currentCategoryStyle = categoryIconStyles[category] || {
    bg: '#f0f3f1',
    text: '#15803d',
    ring: '#bbf7d0',
  };

  // Check if this node type is a starting trigger (no input) or terminal output (no output)
  const isTrigger = data.definitionType === 'trigger' || (data.label || '').toLowerCase().includes('trigger');
  const isOutput = data.definitionType === 'output' || (data.label || '').toLowerCase().includes('success');
  const isAgent = category === 'agent' || data.definitionType.includes('agent');

  return (
    <div
      onClick={() => selectNode(id)}
      className={cn(
        'group relative min-w-[210px] max-w-[250px] bg-white rounded-2xl border transition-all duration-200 select-none cursor-pointer p-3 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-[""]',
        selected
          ? 'border-[#15803d] ring-2 ring-[#15803d] shadow-[0_0_0_3px_rgba(21,128,61,0.18),0_8px_24px_rgba(21,128,61,0.12)]'
          : 'border-[#ded8cc] shadow-[0_2px_8px_rgba(15,35,25,0.04),0_1px_3px_rgba(15,35,25,0.03)] hover:border-[#15803d]/50 hover:shadow-[0_8px_24px_rgba(15,35,25,0.08),0_2px_6px_rgba(15,35,25,0.04)]',
        executionStatus === 'running' && 'ring-2 ring-sky-500/40 border-sky-500 animate-pulse',
        executionStatus === 'completed' && 'border-[#15803d]',
        executionStatus === 'failed' && 'border-red-500 ring-2 ring-red-500/25'
      )}
    >
      {/* ── Left Target (Input) Handle: Horizontal workflow standard ─────────── */}
      {!isTrigger && (
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-[#2e664c] hover:!bg-[#15803d] !border-2 !border-white transition-transform hover:scale-135 shadow-xs"
          title="Input flow"
        />
      )}

      {/* ── Node Content ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Rounded Icon Box with saturated highlight */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-black/5"
          style={{
            backgroundColor: currentCategoryStyle.bg,
            color: currentCategoryStyle.text,
          }}
        >
          {getLucideIcon(definition?.icon || 'Box', 'w-4 h-4 stroke-[2.2]')}
        </div>

        {/* Crisp Geometric Labels */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-display text-[13px] font-bold text-[#0e2118] truncate tracking-[-0.015em] leading-snug">
            {data.label || definition?.displayName || 'Node'}
          </span>
          <span className="font-sans text-[11px] font-semibold text-[#5a6c62] truncate mt-0.5 tracking-normal">
            {definition?.displayName || 'Step'}
          </span>
        </div>
      </div>

      {/* ── Execution Status Badge Pill ──────────────────────────────────────── */}
      {executionStatus !== 'idle' && (
        <div className="mt-2.5 pt-2 border-t border-[#f0ede4] flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#7d8f85] uppercase tracking-wider">Status</span>
          {executionStatus === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#86efac]/80 px-2 py-0.5 rounded-full shadow-2xs">
              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              Completed 6.4s
            </span>
          )}
          {executionStatus === 'running' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0284c7] bg-[#e0f2fe] border border-[#7dd3fc]/80 px-2 py-0.5 rounded-full shadow-2xs">
              <Loader2 className="w-2.5 h-2.5 animate-spin stroke-[2.5]" />
              Running...
            </span>
          )}
          {executionStatus === 'failed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#dc2626] bg-[#fee2e2] border border-[#fca5a5]/80 px-2 py-0.5 rounded-full shadow-2xs">
              <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
              Failed
            </span>
          )}
          {executionStatus === 'pending' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a]/80 px-2 py-0.5 rounded-full shadow-2xs">
              Queued
            </span>
          )}
        </div>
      )}

      {/* ── Quick Action Floating Controls with Hover Bridge ────────────────── */}
      <div
        className={cn(
          'nodrag absolute -top-8 right-2 items-center gap-1 bg-white border border-[#ded8cc] rounded-xl p-1 shadow-md z-30 transition-all after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-5 after:content-[""]',
          selected ? 'flex' : 'hidden group-hover:flex'
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            selectNode(id);
          }}
          className="p-1.5 hover:bg-[#f5f2eb] rounded-lg text-[#4d5f54] hover:text-[#0e2118] transition-colors cursor-pointer"
          title="Configure node"
        >
          <Settings className="w-3.5 h-3.5 stroke-[2]" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            duplicateNode(id);
          }}
          className="p-1.5 hover:bg-[#f5f2eb] rounded-lg text-[#4d5f54] hover:text-[#0e2118] transition-colors cursor-pointer"
          title="Duplicate node"
        >
          <Copy className="w-3.5 h-3.5 stroke-[2]" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="p-1.5 hover:bg-[#fee2e2] text-[#dc2626] rounded-lg transition-colors cursor-pointer"
          title="Delete node"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
        </button>
      </div>

      {/* ── Right Source (Output) Handle: Horizontal workflow standard ────────── */}
      {!isOutput && (
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-[#2e664c] hover:!bg-[#15803d] !border-2 !border-white transition-transform hover:scale-135 shadow-xs"
          title="Output flow"
        />
      )}

      {/* ── Bottom Sub-Handle for Agent Tools & Multi-model Connections ──────── */}
      {isAgent && (
        <Handle
          id="tools"
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-[#8da597] hover:!bg-[#15803d] !border-2 !border-white transition-transform hover:scale-125"
          title="Sub-tools & models"
        />
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);

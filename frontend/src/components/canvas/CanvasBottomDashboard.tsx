import React from 'react';
import { useExecutionStore } from '@/stores/execution-store';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { formatDuration } from '@/lib/utils';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const CanvasBottomDashboard: React.FC = () => {
  const currentExecution = useExecutionStore((s) => s.currentExecution);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const executionLogs = useExecutionStore((s) => s.executionLogs);
  const executions = useExecutionStore((s) => s.executions);
  const workflows = useWorkflowStore((s) => s.workflows);
  const setDeployModalOpen = useUIStore((s) => s.setDeployModalOpen);

  const status = currentExecution?.status || (isExecuting ? 'running' : 'idle');

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 flex items-stretch gap-3 select-none pointer-events-none">
      {/* 1. Dark Obsidian Live Run Console Card */}
      <div className="pointer-events-auto w-96 bg-gradient-to-b from-[#07160e] to-[#0d2319] text-[#e0ece5] rounded-2xl p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.22)] border border-[#163d2c] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#184230]">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-black text-white tracking-wide">Live run</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isExecuting
                ? 'bg-sky-600 text-white animate-pulse'
                : status === 'failed'
                ? 'bg-red-700 text-white'
                : status === 'completed'
                ? 'bg-[#15803d] text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                : 'bg-[#1b4332] text-[#86efac]'
            }`}>
              {isExecuting ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
                </>
              ) : status === 'failed' ? (
                <>
                  <AlertCircle className="w-2.5 h-2.5 text-red-300" /> Failed
                </>
              ) : status === 'completed' ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" /> Completed
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86efac]" /> Ready
                </>
              )}
            </span>
          </div>
          <span className="text-[10px] text-[#86efac] font-mono font-semibold">
            {currentExecution?.duration ? formatDuration(currentExecution.duration) : '--'}
          </span>
        </div>

        {/* Console Log Lines with Vibrant Color Highlights */}
        <div className="space-y-1 font-mono text-[11px] text-[#bbf7d0] overflow-y-auto max-h-24 leading-relaxed">
          {executionLogs.length > 0 ? (
            executionLogs.slice(-6).map((log) => (
              <div key={log.id} className="truncate">
                <span className="text-[#4ade80]/80">{log.timestamp.slice(11, 19)}</span>{' '}
                <span className={log.level === 'error' ? 'text-red-400 font-semibold' : 'text-[#f0fdf4]'}>
                  {log.message}
                </span>
              </div>
            ))
          ) : isExecuting ? (
            <div className="text-sky-300 italic flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Executing workflow DAG...
            </div>
          ) : (
            <div className="text-[#86efac]/70 text-[10px] italic py-2">
              Ready to execute. Click <strong>"Run workflow"</strong> in the top header to dispatch nodes.
            </div>
          )}
        </div>
      </div>

      {/* 2. Metric Cards & Deploy Banner */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Executions Metric */}
        <div className="bg-white rounded-2xl border border-[#ded8cc] px-5 py-3 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-center min-w-[100px]">
          <span className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
            {executions.length}
          </span>
          <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">Executions</span>
        </div>

        {/* Success Rate Metric */}
        <div className="bg-white rounded-2xl border border-[#ded8cc] px-5 py-3 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-center min-w-[100px]">
          <span className="font-display text-2xl font-black text-[#15803d] tracking-tight">
            {executions.length > 0
              ? `${Math.round((executions.filter((e) => e.status === 'completed').length / executions.length) * 100)}%`
              : '100%'}
          </span>
          <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">Success rate</span>
        </div>

        {/* Workflows Metric */}
        <div className="bg-white rounded-2xl border border-[#ded8cc] px-5 py-3 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex flex-col justify-center min-w-[100px]">
          <span className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
            {workflows.length}
          </span>
          <span className="font-sans text-[11px] font-semibold text-[#6e7f75]">Workflows</span>
        </div>

        {/* Deploy as Web App or Desktop Card */}
        <div className="bg-white rounded-2xl border border-[#ded8cc] px-5 py-3 shadow-[0_2px_8px_rgba(15,35,25,0.04)] flex items-center gap-4">
          <span className="font-sans text-xs font-bold text-[#0e2118]">
            Deploy as web app or desktop
          </span>
          <button
            type="button"
            onClick={() => setDeployModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-white text-xs font-black rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            Deploy now
          </button>
        </div>
      </div>
    </div>
  );
};

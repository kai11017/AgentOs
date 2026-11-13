import React, { useState } from 'react';
import { useExecutionStore } from '@/stores/execution-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useUIStore } from '@/stores/ui-store';
import { formatDuration, formatDate, cn } from '@/lib/utils';
import {
  Play,
  Square,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  History,
  FileJson,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const ExecutionPanel: React.FC = () => {
  const isExecutionPanelOpen = useUIStore((s) => s.isExecutionPanelOpen);
  const toggleExecutionPanel = useUIStore((s) => s.toggleExecutionPanel);

  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const currentExecution = useExecutionStore((s) => s.currentExecution);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const executionLogs = useExecutionStore((s) => s.executionLogs);
  const executions = useExecutionStore((s) => s.executions);
  const executeWorkflow = useExecutionStore((s) => s.executeWorkflow);
  const stopExecution = useExecutionStore((s) => s.stopExecution);
  const loadExecution = useExecutionStore((s) => s.loadExecution);

  const [activeTab, setActiveTab] = useState<'logs' | 'nodes' | 'history'>('logs');
  const [selectedNodeOutput, setSelectedNodeOutput] = useState<string | null>(null);

  if (!isExecutionPanelOpen) return null;

  const handleRun = () => {
    if (currentWorkflow) {
      executeWorkflow(currentWorkflow.id);
    }
  };

  const status = currentExecution?.status || 'idle';

  return (
    <aside className="h-64 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex flex-col z-20 shadow-xl transition-all select-none">
      {/* Panel Header & Controls */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Execution Monitor
            </span>
            {status !== 'idle' && (
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1',
                  status === 'running' && 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
                  status === 'completed' && 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
                  status === 'failed' && 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
                  status === 'cancelled' && 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {status === 'completed' && <CheckCircle className="w-3 h-3" />}
                {status === 'failed' && <AlertCircle className="w-3 h-3" />}
                {status}
              </span>
            )}
            {currentExecution?.duration && (
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(currentExecution.duration)}
              </span>
            )}
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 ml-4 border-l border-slate-200 dark:border-slate-800 pl-4">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors',
                activeTab === 'logs'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Terminal className="w-3 h-3" /> Logs ({executionLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nodes')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors',
                activeTab === 'nodes'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <FileJson className="w-3 h-3" /> Node Payloads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors',
                activeTab === 'history'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <History className="w-3 h-3" /> History
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isExecuting ? (
            <button
              type="button"
              onClick={stopExecution}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              disabled={!currentWorkflow}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              <Play className="w-3 h-3 fill-current" /> Run Workflow
            </button>
          )}

          <button
            type="button"
            onClick={toggleExecutionPanel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-1">
            {executionLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 font-sans italic text-xs">
                No logs recorded yet. Click "Run Workflow" to execute.
              </div>
            ) : (
              executionLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-0.5 leading-relaxed">
                  <span className="text-[10px] text-slate-400 select-none shrink-0">
                    {formatDate(log.timestamp)}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1 rounded uppercase select-none shrink-0',
                      log.level === 'info' && 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
                      log.level === 'warn' && 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
                      log.level === 'error' && 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
                      log.level === 'debug' && 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    )}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 break-all">
                    {log.message}
                  </span>
                  {Boolean(log.data) && (
                    <span className="text-[11px] text-indigo-500 truncate max-w-sm">
                      {JSON.stringify(log.data)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Node Payloads Tab */}
        {activeTab === 'nodes' && (
          <div className="space-y-2">
            {!currentExecution?.nodeResults || Object.keys(currentExecution.nodeResults).length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 font-sans italic text-xs">
                No node output payloads available.
              </div>
            ) : (
              Object.entries(currentExecution.nodeResults).map(([nodeId, res]) => {
                const isExpanded = selectedNodeOutput === nodeId;
                return (
                  <div
                    key={nodeId}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/50"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedNodeOutput(isExpanded ? null : nodeId)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Node {nodeId}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded font-sans capitalize',
                            res.status === 'completed' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
                            res.status === 'running' && 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
                            res.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                            res.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          )}
                        >
                          {res.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatDuration(res.duration)}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-900 text-emerald-400 overflow-x-auto text-[11px]">
                        <pre>{JSON.stringify(res.outputData || { note: 'No data output emitted' }, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-1">
            {executions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 font-sans italic text-xs">
                No previous runs found for this workflow.
              </div>
            ) : (
              executions.map((exec) => (
                <div
                  key={exec.id}
                  onClick={() => loadExecution(exec.id)}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">
                      Run #{exec.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(exec.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{formatDuration(exec.duration)}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded capitalize font-sans',
                        exec.status === 'completed' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
                        exec.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                        exec.status === 'cancelled' && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {exec.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

import { create } from 'zustand';
import type { Execution, ExecutionLog, ExecutionStatus } from '@/types/workflow';
import { getApiAdapter } from '@/api';

interface ExecutionState {
  // Current execution
  currentExecution: Execution | null;
  isExecuting: boolean;
  executionLogs: ExecutionLog[];

  // Execution history
  executions: Execution[];
  isLoadingExecutions: boolean;

  // Polling
  pollingInterval: ReturnType<typeof setInterval> | null;

  // Actions
  executeWorkflow: (workflowId: string) => Promise<void>;
  stopExecution: () => Promise<void>;
  loadExecutions: (workflowId: string) => Promise<void>;
  loadExecution: (executionId: string) => Promise<void>;
  getNodeStatus: (nodeId: string) => ExecutionStatus;
  startPolling: (executionId: string) => void;
  stopPolling: () => void;
  clearExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  currentExecution: null,
  isExecuting: false,
  executionLogs: [],
  executions: [],
  isLoadingExecutions: false,
  pollingInterval: null,

  executeWorkflow: async (workflowId: string) => {
    try {
      set({ isExecuting: true });
      const execution = await getApiAdapter().executeWorkflow(workflowId);
      set({ currentExecution: execution });
      get().startPolling(execution.id);
    } catch (e) {
      console.error('Execution failed:', e);
      set({ isExecuting: false });
    }
  },

  stopExecution: async () => {
    const { currentExecution } = get();
    if (!currentExecution) return;
    try {
      await getApiAdapter().stopExecution(currentExecution.id);
      get().stopPolling();
      set({ isExecuting: false });
      // Refresh execution state
      const updated = await getApiAdapter().getExecution(currentExecution.id);
      set({ currentExecution: updated });
    } catch (e) {
      console.error('Failed to stop execution:', e);
    }
  },

  loadExecutions: async (workflowId: string) => {
    set({ isLoadingExecutions: true });
    try {
      const executions = await getApiAdapter().listExecutions(workflowId);
      set({ executions, isLoadingExecutions: false });
    } catch {
      set({ isLoadingExecutions: false });
    }
  },

  loadExecution: async (executionId: string) => {
    try {
      const execution = await getApiAdapter().getExecution(executionId);
      const logs = await getApiAdapter().getExecutionLogs(executionId);
      set({ currentExecution: execution, executionLogs: logs });
    } catch (e) {
      console.error('Failed to load execution:', e);
    }
  },

  getNodeStatus: (nodeId: string): ExecutionStatus => {
    const { currentExecution } = get();
    if (!currentExecution) return 'idle';
    return currentExecution.nodeResults[nodeId]?.status || 'idle';
  },

  startPolling: (executionId: string) => {
    get().stopPolling();
    const interval = setInterval(async () => {
      try {
        const execution = await getApiAdapter().getExecution(executionId);
        const logs = await getApiAdapter().getExecutionLogs(executionId);
        set({ currentExecution: execution, executionLogs: logs });

        if (
          execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled'
        ) {
          get().stopPolling();
          set({ isExecuting: false });
        }
      } catch {
        get().stopPolling();
        set({ isExecuting: false });
      }
    }, 500);
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  clearExecution: () => {
    get().stopPolling();
    set({
      currentExecution: null,
      isExecuting: false,
      executionLogs: [],
    });
  },
}));


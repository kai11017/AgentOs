import { create } from 'zustand';
import type { Execution, ExecutionLog, ExecutionStatus } from '@/types/workflow';
import { getApiAdapter } from '@/api';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8005')
  .replace(/^http/, 'ws');

interface ExecutionState {
  // Current execution
  currentExecution: Execution | null;
  isExecuting: boolean;
  executionLogs: ExecutionLog[];

  // Execution history
  executions: Execution[];
  isLoadingExecutions: boolean;

  // Real-time connections
  pollingInterval: ReturnType<typeof setInterval> | null;
  activeWebSocket: WebSocket | null;

  // Actions
  executeWorkflow: (workflowId: string) => Promise<void>;
  stopExecution: () => Promise<void>;
  loadExecutions: (workflowId: string) => Promise<void>;
  loadExecution: (executionId: string) => Promise<void>;
  getNodeStatus: (nodeId: string) => ExecutionStatus;
  startPolling: (executionId: string) => void;
  stopPolling: () => void;
  connectWebSocket: (executionId: string) => void;
  disconnectWebSocket: () => void;
  clearExecution: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  currentExecution: null,
  isExecuting: false,
  executionLogs: [],
  executions: [],
  isLoadingExecutions: false,
  pollingInterval: null,
  activeWebSocket: null,

  executeWorkflow: async (workflowId: string) => {
    try {
      set({ isExecuting: true, executionLogs: [] });
      const execution = await getApiAdapter().executeWorkflow(workflowId);
      set({ currentExecution: execution });
      
      // Connect live WebSocket event stream with polling fallback
      get().connectWebSocket(execution.id);
      get().startPolling(execution.id);
    } catch (e) {
      console.error('Execution failed:', e);
      set({ isExecuting: false });
    }
  },

  connectWebSocket: (executionId: string) => {
    get().disconnectWebSocket();

    try {
      const wsUrl = `${WS_BASE}/ws/executions/${executionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.message) {
            const newLog: ExecutionLog = {
              id: `log-${payload.seq || Date.now()}`,
              timestamp: payload.timestamp || new Date().toISOString(),
              level: payload.level || 'info',
              message: payload.message,
              nodeId: payload.nodeId,
            };

            set((state) => {
              const logs = [...state.executionLogs, newLog];
              let updatedExecution = state.currentExecution;

              if (updatedExecution && payload.nodeId) {
                const nodeResults = { ...updatedExecution.nodeResults };
                let nodeStatus: ExecutionStatus = nodeResults[payload.nodeId]?.status || 'idle';

                if (payload.message.includes('Starting node')) {
                  nodeStatus = 'running';
                } else if (payload.message.includes('Completed node')) {
                  nodeStatus = 'completed';
                } else if (payload.message.includes('Failed node')) {
                  nodeStatus = 'failed';
                }

                nodeResults[payload.nodeId] = {
                  ...(nodeResults[payload.nodeId] || {}),
                  status: nodeStatus,
                };
                updatedExecution = { ...updatedExecution, nodeResults };
              }

              return { executionLogs: logs, currentExecution: updatedExecution };
            });

            if (payload.message.includes('Workflow completed') || payload.message.includes('Workflow failed')) {
              set({ isExecuting: false });
              get().stopPolling();
            }
          }
        } catch {
          // Non-JSON message (e.g. pong)
        }
      };

      ws.onerror = () => {
        // Gracefully keep polling active if WebSocket is blocked
      };

      ws.onclose = () => {
        set({ activeWebSocket: null });
      };

      set({ activeWebSocket: ws });
    } catch (e) {
      console.warn('Could not establish WebSocket connection, continuing with HTTP polling:', e);
    }
  },

  disconnectWebSocket: () => {
    const { activeWebSocket } = get();
    if (activeWebSocket) {
      try {
        activeWebSocket.close();
      } catch {
        // Ignore close errors
      }
      set({ activeWebSocket: null });
    }
  },

  stopExecution: async () => {
    const { currentExecution } = get();
    if (!currentExecution) return;
    try {
      await getApiAdapter().stopExecution(currentExecution.id);
      get().stopPolling();
      get().disconnectWebSocket();
      set({ isExecuting: false });
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
        set((state) => ({
          currentExecution: execution,
          // Merge logs avoiding duplicates
          executionLogs: logs.length > state.executionLogs.length ? logs : state.executionLogs,
        }));

        if (
          execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled'
        ) {
          get().stopPolling();
          get().disconnectWebSocket();
          set({ isExecuting: false });
        }
      } catch {
        get().stopPolling();
        get().disconnectWebSocket();
        set({ isExecuting: false });
      }
    }, 600);
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
    get().disconnectWebSocket();
    set({
      currentExecution: null,
      isExecuting: false,
      executionLogs: [],
    });
  },
}));

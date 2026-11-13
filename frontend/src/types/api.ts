import type { Workflow, Execution, ExecutionLog } from './workflow';
import type { NodeDefinition } from './node-definitions';

// ─── API Adapter Interface ──────────────────────────────────────────────────

export interface WorkflowApiAdapter {
  // Workflow CRUD
  listWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow>;
  createWorkflow(workflow: Partial<Workflow>): Promise<Workflow>;
  updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  duplicateWorkflow(id: string): Promise<Workflow>;

  // Execution
  executeWorkflow(workflowId: string): Promise<Execution>;
  stopExecution(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<Execution>;
  listExecutions(workflowId: string): Promise<Execution[]>;
  getExecutionLogs(executionId: string): Promise<ExecutionLog[]>;

  // Node Registry
  getNodeDefinitions(): Promise<NodeDefinition[]>;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}


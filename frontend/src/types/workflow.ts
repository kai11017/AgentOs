import type { Node, Edge } from '@xyflow/react';

// ─── Execution Types ────────────────────────────────────────────────────────

export type ExecutionStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: unknown;
}

export interface ExecutionNodeData {
  status: ExecutionStatus;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
  logs?: ExecutionLog[];
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  nodeResults: Record<string, ExecutionNodeData>;
  error?: string;
  duration?: number;
}

// ─── Node Data Types ────────────────────────────────────────────────────────

export interface NodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  config: Record<string, unknown>;
  executionStatus?: ExecutionStatus;
  executionData?: ExecutionNodeData;
  definitionType: string;
}

// Conforms directly with React Flow v12
export type WorkflowNode = Node<NodeData>;
export type WorkflowEdge = Edge;

// ─── Workflow Types ──────────────────────────────────────────────────────────

export interface WorkflowSettings {
  executionTimeout?: number;
  retryOnFail?: boolean;
  maxRetries?: number;
  saveExecutionData?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  settings?: WorkflowSettings;
  tags?: string[];
}

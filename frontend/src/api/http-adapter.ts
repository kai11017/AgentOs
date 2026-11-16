import type { WorkflowApiAdapter } from '@/types/api';
import type { Workflow, Execution, ExecutionLog, ExecutionStatus } from '@/types/workflow';
import type { NodeDefinition } from '@/types/node-definitions';
import { mockApiAdapter } from './mock-adapter';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface ModelInfo {
  name: string;
  size: string;
  status: string;
  isLocal: boolean;
  provider: string;
}

export interface DockerStatus {
  available: boolean;
  version?: string;
  os?: string;
  containers: Array<{
    id: string;
    name: string;
    status: string;
    image: string;
    ports?: Record<string, unknown>;
  }>;
}

export interface McpServerInfo {
  name: string;
  label: string;
  description: string;
  command: string;
  args: string[];
  enabled: boolean;
  status: 'connected' | 'disconnected';
  toolCount: number;
  tools: any[];
}

export interface AvailableToolInfo {
  name: string;
  description: string;
  isMcp: boolean;
  serverName?: string;
}

export class HttpApiAdapter implements WorkflowApiAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`API Request to ${path} failed (${res.status}): ${errorText || res.statusText}`);
    }
    return res.json();
  }

  // ─── Workflow CRUD ──────────────────────────────────────────────────────────

  async listWorkflows(): Promise<Workflow[]> {
    try {
      const wfs = await this.request<any[]>('/workflows');
      if (wfs && wfs.length > 0) {
        return wfs.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description || '',
          nodes: (w.nodes || []).map((n: any) => ({
            id: n.id,
            type: n.type || 'default',
            position: n.position || { x: 0, y: 0 },
            data: {
              label: n.data?.label || n.id,
              definitionType: n.data?.definitionType || 'custom-agent',
              config: n.data?.config || {},
              executionStatus: (n.data?.executionStatus as ExecutionStatus) || 'idle',
            },
          })),
          edges: (w.edges || []).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          tags: w.tags || [],
          isActive: w.isActive ?? true,
        }));
      }
    } catch (err) {
      console.warn('Live backend not reachable, using local storage/mock fallback:', err);
    }
    return mockApiAdapter.listWorkflows();
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const w = await this.request<any>(`/workflows/${id}`);
      return {
        id: w.id,
        name: w.name,
        description: w.description || '',
        nodes: (w.nodes || []).map((n: any) => ({
          id: n.id,
          type: n.type || 'default',
          position: n.position || { x: 0, y: 0 },
          data: {
            label: n.data?.label || n.id,
            definitionType: n.data?.definitionType || 'custom-agent',
            config: n.data?.config || {},
            executionStatus: (n.data?.executionStatus as ExecutionStatus) || 'idle',
          },
        })),
        edges: (w.edges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        tags: w.tags || [],
        isActive: w.isActive ?? true,
      };
    } catch {
      return mockApiAdapter.getWorkflow(id);
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const payload = {
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || '',
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        tags: workflow.tags || [],
      };
      const created = await this.request<any>('/workflows', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return this.getWorkflow(created.id);
    } catch {
      return mockApiAdapter.createWorkflow(workflow);
    }
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const payload: Record<string, unknown> = {};
      if (workflow.name !== undefined) payload.name = workflow.name;
      if (workflow.description !== undefined) payload.description = workflow.description;
      if (workflow.nodes !== undefined) payload.nodes = workflow.nodes;
      if (workflow.edges !== undefined) payload.edges = workflow.edges;
      if (workflow.tags !== undefined) payload.tags = workflow.tags;
      if (workflow.isActive !== undefined) payload.isActive = workflow.isActive;

      const updated = await this.request<any>(`/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return this.getWorkflow(updated.id);
    } catch {
      return mockApiAdapter.updateWorkflow(id, workflow);
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.request<void>(`/workflows/${id}`, { method: 'DELETE' });
    } catch {
      await mockApiAdapter.deleteWorkflow(id);
    }
  }

  async duplicateWorkflow(id: string): Promise<Workflow> {
    try {
      const source = await this.getWorkflow(id);
      return this.createWorkflow({
        ...source,
        name: `${source.name} (Copy)`,
      });
    } catch {
      return mockApiAdapter.duplicateWorkflow(id);
    }
  }

  // ─── Execution ──────────────────────────────────────────────────────────────

  async executeWorkflow(workflowId: string): Promise<Execution> {
    try {
      const res = await this.request<any>(`/workflows/${workflowId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ inputData: {} }),
      });

      const nodeResults: Record<string, any> = {};
      for (const [nid, result] of Object.entries(res.nodeResults || {})) {
        const r = result as any;
        nodeResults[nid] = {
          status: (r.status as ExecutionStatus) || 'idle',
          duration: r.durationMs,
          outputData: r.output,
          error: r.error,
        };
      }

      return {
        id: res.id,
        workflowId: res.workflowId,
        workflowName: 'AgentOS Workflow',
        status: res.status as ExecutionStatus,
        startedAt: res.startedAt,
        finishedAt: res.completedAt || undefined,
        duration: res.durationMs,
        nodeResults,
      };
    } catch {
      return mockApiAdapter.executeWorkflow(workflowId);
    }
  }

  async stopExecution(executionId: string): Promise<void> {
    try {
      await this.request<void>(`/executions/${executionId}/stop`, { method: 'POST' });
    } catch {
      await mockApiAdapter.stopExecution(executionId);
    }
  }

  async getExecution(executionId: string): Promise<Execution> {
    try {
      const res = await this.request<any>(`/executions/${executionId}`);
      const nodeResults: Record<string, any> = {};
      for (const [nid, result] of Object.entries(res.nodeResults || {})) {
        const r = result as any;
        nodeResults[nid] = {
          status: (r.status as ExecutionStatus) || 'idle',
          duration: r.durationMs,
          outputData: r.output,
          error: r.error,
        };
      }

      return {
        id: res.id,
        workflowId: res.workflowId,
        workflowName: 'AgentOS Workflow',
        status: res.status as ExecutionStatus,
        startedAt: res.startedAt,
        finishedAt: res.completedAt || undefined,
        duration: res.durationMs,
        nodeResults,
      };
    } catch {
      return mockApiAdapter.getExecution(executionId);
    }
  }

  async listExecutions(workflowId: string): Promise<Execution[]> {
    try {
      const list = await this.request<any[]>(`/executions?workflow_id=${encodeURIComponent(workflowId)}`);
      return list.map(res => {
        const nodeResults: Record<string, any> = {};
        for (const [nid, result] of Object.entries(res.nodeResults || {})) {
          const r = result as any;
          nodeResults[nid] = {
            status: (r.status as ExecutionStatus) || 'idle',
            duration: r.durationMs,
            outputData: r.output,
            error: r.error,
          };
        }
        return {
          id: res.id,
          workflowId: res.workflowId,
          workflowName: 'AgentOS Workflow',
          status: res.status as ExecutionStatus,
          startedAt: res.startedAt,
          finishedAt: res.completedAt || undefined,
          duration: res.durationMs,
          nodeResults,
        };
      });
    } catch {
      return mockApiAdapter.listExecutions(workflowId);
    }
  }

  async getExecutionLogs(executionId: string): Promise<ExecutionLog[]> {
    try {
      const logs = await this.request<any[]>(`/executions/${executionId}/logs`);
      return logs.map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        level: l.level || 'info',
        message: l.message,
        nodeId: l.nodeId || undefined,
        data: l.payload || undefined,
      }));
    } catch {
      return mockApiAdapter.getExecutionLogs(executionId);
    }
  }

  // ─── Node Definitions Registry ──────────────────────────────────────────────

  async getNodeDefinitions(): Promise<NodeDefinition[]> {
    // Uses the rich 26 frontend definitions
    return mockApiAdapter.getNodeDefinitions();
  }

  // ─── Model & Docker Integrations ────────────────────────────────────────────

  async listModels(): Promise<ModelInfo[]> {
    return this.request<ModelInfo[]>('/models');
  }

  async pullModel(modelName: string): Promise<any> {
    return this.request<any>('/models/pull', {
      method: 'POST',
      body: JSON.stringify({ model: modelName }),
    });
  }

  async getDockerStatus(): Promise<DockerStatus> {
    return this.request<DockerStatus>('/models/docker/status');
  }

  // ─── Model Context Protocol (MCP) Integrations ──────────────────────────────

  async listMcpServers(): Promise<McpServerInfo[]> {
    try {
      const res = await this.request<{ servers: McpServerInfo[] }>('/mcp/servers');
      return res.servers;
    } catch {
      return [
        {
          name: 'filesystem',
          label: 'Local Filesystem MCP',
          description: 'Secure file operations via Model Context Protocol.',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
          enabled: false,
          status: 'disconnected',
          toolCount: 4,
          tools: [],
        },
        {
          name: 'memory',
          label: 'Knowledge Graph Memory MCP',
          description: 'Persistent memory for cross-workflow recall.',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
          enabled: false,
          status: 'disconnected',
          toolCount: 5,
          tools: [],
        },
      ];
    }
  }

  async connectMcpServer(name: string): Promise<any> {
    return this.request(`/mcp/servers/${name}/connect`, { method: 'POST' });
  }

  async disconnectMcpServer(name: string): Promise<any> {
    return this.request(`/mcp/servers/${name}/disconnect`, { method: 'POST' });
  }

  async listAvailableTools(): Promise<AvailableToolInfo[]> {
    try {
      const res = await this.request<{ tools: AvailableToolInfo[] }>('/mcp/tools');
      return res.tools;
    } catch {
      return [
        { name: 'web_search', description: 'DuckDuckGo web search', isMcp: false },
        { name: 'calculator', description: 'Safe math evaluator', isMcp: false },
        { name: 'fetch_url', description: 'SSRF-safe web extractor', isMcp: false },
        { name: 'code_runner', description: 'Sandboxed Python runner', isMcp: false },
        { name: 'memory', description: 'Persistent key-value memory', isMcp: false },
        { name: 'knowledge_retriever', description: 'Local Document Vector Search', isMcp: false },
      ];
    }
  }

  // ─── Human in the Loop (Approval / Rejection) ────────────────────────────────

  async getApprovalStatus(executionId: string): Promise<{ waiting: boolean; details?: any }> {
    return this.request(`/executions/${executionId}/approval`);
  }

  async approveExecution(executionId: string, comment: string = '', modifiedData?: any): Promise<any> {
    return this.request(`/executions/${executionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment, modifiedData }),
    });
  }

  async rejectExecution(executionId: string, reason: string = 'Rejected by user'): Promise<any> {
    return this.request(`/executions/${executionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ─── Workflow JSON Export & Import ──────────────────────────────────────────

  async exportWorkflowJson(workflowId: string): Promise<any> {
    return this.request(`/workflows/${workflowId}/export`);
  }

  async importWorkflowJson(payload: any): Promise<Workflow> {
    const imported = await this.request<any>('/workflows/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return this.getWorkflow(imported.id);
  }

  // ─── Cron & Schedule Triggers ───────────────────────────────────────────────

  async listSchedules(): Promise<{ jobs: any[] }> {
    return this.request('/schedules');
  }

  async syncSchedules(): Promise<any> {
    return this.request('/schedules/sync', { method: 'POST' });
  }

  // ─── Secure Credential Vault ────────────────────────────────────────────────

  async listCredentials(): Promise<CredentialItem[]> {
    return this.request('/credentials');
  }

  async createCredential(payload: {
    name: string;
    credential_type: string;
    value: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<CredentialItem> {
    return this.request('/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteCredential(credentialId: string): Promise<any> {
    return this.request(`/credentials/${credentialId}`, {
      method: 'DELETE',
    });
  }

  // ─── Prebuilt Workflow Templates ────────────────────────────────────────────

  async listTemplates(): Promise<TemplateItemSummary[]> {
    return this.request('/templates');
  }

  async instantiateTemplate(templateId: string): Promise<{ status: string; workflow_id: string; name: string }> {
    return this.request(`/templates/${templateId}/instantiate`, {
      method: 'POST',
    });
  }

  // ─── Local Document RAG & Vector Knowledge Base ─────────────────────────────

  async listKnowledgeCollections(): Promise<{ collections: KnowledgeCollectionItem[] }> {
    return this.request('/knowledge/collections');
  }

  async createKnowledgeCollection(name: string, description: string = ''): Promise<any> {
    return this.request('/knowledge/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async uploadKnowledgeDocument(payload: {
    collection: string;
    filename: string;
    content: string;
    chunk_size?: number;
    chunk_overlap?: number;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request('/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async queryKnowledge(payload: {
    collection: string;
    query: string;
    top_k?: number;
  }): Promise<{ collection: string; query: string; total_results: number; results: any[] }> {
    return this.request('/knowledge/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteKnowledgeCollection(collectionId: string): Promise<any> {
    return this.request(`/knowledge/collections/${collectionId}`, {
      method: 'DELETE',
    });
  }

  // ─── Step Testing & Expression Evaluation ─────────────────────────────────

  async testNodeStep(payload: TestNodeStepPayload): Promise<TestNodeStepResult> {
    try {
      return await this.request<TestNodeStepResult>('/nodes/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      return {
        status: 'error',
        duration_ms: 0,
        output: null,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: err.message || 'Network request error',
          },
        ],
        error: err.message || 'Failed to execute node step test',
      };
    }
  }

  async evaluateExpression(payload: EvaluateExpressionPayload): Promise<EvaluateExpressionResult> {
    try {
      return await this.request<EvaluateExpressionResult>('/nodes/evaluate-expression', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      return {
        success: false,
        result: null,
        type: 'error',
        preview: 'Error',
        error: err.message || 'Evaluation error',
      };
    }
  }
}

export interface TestNodeStepPayload {
  node_id: string;
  node_type: string;
  label?: string;
  config: Record<string, any>;
  input_data: Record<string, any>;
  upstream_nodes?: Record<string, any>;
}

export interface StepLogItem {
  timestamp: string;
  level: string;
  message: string;
}

export interface TestNodeStepResult {
  status: 'success' | 'error';
  duration_ms: number;
  output: any;
  logs: StepLogItem[];
  error?: string | null;
}

export interface EvaluateExpressionPayload {
  expression: string;
  context: Record<string, any>;
}

export interface EvaluateExpressionResult {
  success: boolean;
  result: any;
  type: string;
  preview: string;
  error?: string | null;
}

export interface KnowledgeCollectionItem {
  id: string;
  name: string;
  description: string;
  document_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface CredentialItem {
  id: string;
  name: string;
  credential_type: string;
  masked_preview: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TemplateItemSummary {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  tags: string[];
  node_count: number;
  edge_count: number;
}

export const httpApiAdapter = new HttpApiAdapter();

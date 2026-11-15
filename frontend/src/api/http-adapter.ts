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
      ];
    }
  }
}

export const httpApiAdapter = new HttpApiAdapter();

import type { WorkflowApiAdapter } from '@/types/api';
import type { Workflow, Execution, ExecutionLog } from '@/types/workflow';
import type { NodeDefinition } from '@/types/node-definitions';
import { v4 as uuidv4 } from 'uuid';
import nodeRegistry from '@/nodes/registry';

// ─── In-Memory Storage ──────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockWorkflows: Workflow[] = [
  {
    id: 'demo-workflow-1',
    name: 'Research Workflow',
    description: 'Automate research and reporting',
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'trigger',
        position: { x: 180, y: 260 },
        data: {
          label: 'Gmail Trigger',
          definitionType: 'trigger',
          config: { triggerType: 'webhook', note: 'New email' },
        },
      },
      {
        id: 'node-agent-1',
        type: 'research-agent',
        position: { x: 460, y: 260 },
        data: {
          label: 'AI Agent',
          definitionType: 'research-agent',
          config: {
            name: 'Research',
            model: 'GPT-4o mini',
            systemPrompt:
              'Summarize the incoming email, research the topic on the web, and return key insights with sources.',
            tools: ['web_search', 'memory', 'js_skill'],
            onError: 'Retry twice, then notify me',
          },
        },
      },
      {
        id: 'node-email-1',
        type: 'http-request',
        position: { x: 740, y: 180 },
        data: {
          label: 'Send Email',
          definitionType: 'http-request',
          config: { method: 'POST', provider: 'Gmail' },
        },
      },
      {
        id: 'node-notion-1',
        type: 'database',
        position: { x: 740, y: 340 },
        data: {
          label: 'Save to Notion',
          definitionType: 'database',
          config: { dbType: 'notion', provider: 'Database' },
        },
      },
      {
        id: 'node-output-1',
        type: 'output',
        position: { x: 1000, y: 260 },
        data: {
          label: 'Success',
          definitionType: 'output',
          config: { outputType: 'json' },
        },
      },
    ],
    edges: [
      { id: 'e-1-2', source: 'node-trigger-1', target: 'node-agent-1' },
      { id: 'e-2-3', source: 'node-agent-1', target: 'node-email-1' },
      { id: 'e-2-4', source: 'node-agent-1', target: 'node-notion-1' },
      { id: 'e-3-5', source: 'node-email-1', target: 'node-output-1' },
      { id: 'e-4-5', source: 'node-notion-1', target: 'node-output-1' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['research', 'active'],
  },
  {
    id: 'wf-email-auto',
    name: 'Email Automation',
    description: 'Triage and reply to email',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    tags: ['email', 'active'],
  },
  {
    id: 'wf-data-sync',
    name: 'Data Sync',
    description: 'Sync CRM rows nightly',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
    tags: ['crm', 'failing'],
  },
  {
    id: 'wf-report-gen',
    name: 'Report Generator',
    description: 'Weekly summary to Notion',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    tags: ['reporting', 'active'],
  },
  {
    id: 'wf-social-posts',
    name: 'Social Posts',
    description: 'Draft and schedule posts',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['marketing', 'paused'],
  },
  {
    id: 'wf-daily-brief',
    name: 'Daily Briefing',
    description: 'Morning digest of your day',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['assistant', 'active'],
  },
];

let mockExecutions: Execution[] = [
  {
    id: 'exec-demo-1',
    workflowId: 'demo-workflow-1',
    workflowName: 'Research Workflow',
    status: 'completed',
    startedAt: new Date(Date.now() - 120000).toISOString(),
    finishedAt: new Date(Date.now() - 111800).toISOString(),
    duration: 8200,
    nodeResults: {
      'node-trigger-1': { status: 'completed', duration: 120 },
      'node-agent-1': { status: 'completed', duration: 6400 },
      'node-email-1': { status: 'completed', duration: 800 },
      'node-notion-1': { status: 'completed', duration: 750 },
      'node-output-1': { status: 'completed', duration: 130 },
    },
  },
  {
    id: 'exec-email-1',
    workflowId: 'wf-email-auto',
    workflowName: 'Email Automation',
    status: 'completed',
    startedAt: new Date(Date.now() - 300000).toISOString(),
    finishedAt: new Date(Date.now() - 265000).toISOString(),
    duration: 35000,
    nodeResults: {},
  },
  {
    id: 'exec-sync-1',
    workflowId: 'wf-data-sync',
    workflowName: 'Data Sync',
    status: 'failed',
    startedAt: new Date(Date.now() - 600000).toISOString(),
    finishedAt: new Date(Date.now() - 520000).toISOString(),
    duration: 80000,
    error: 'Timeout from source API',
    nodeResults: {},
  },
];

export const mockApiAdapter: WorkflowApiAdapter = {
  async listWorkflows(): Promise<Workflow[]> {
    await delay(100);
    return [...mockWorkflows];
  },

  async getWorkflow(id: string): Promise<Workflow> {
    await delay(50);
    const workflow = mockWorkflows.find((w) => w.id === id);
    if (!workflow) throw new Error(`Workflow ${id} not found`);
    return { ...workflow };
  },

  async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    await delay(100);
    const workflow: Workflow = {
      id: uuidv4(),
      name: data.name || 'Untitled Workflow',
      description: data.description || 'Custom agent workflow',
      nodes: data.nodes || [],
      edges: data.edges || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: data.tags || ['active'],
    };
    mockWorkflows.push(workflow);
    return { ...workflow };
  },

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    await delay(80);
    const index = mockWorkflows.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Workflow ${id} not found`);
    mockWorkflows[index] = {
      ...mockWorkflows[index]!,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockWorkflows[index]! };
  },

  async deleteWorkflow(id: string): Promise<void> {
    await delay(80);
    mockWorkflows = mockWorkflows.filter((w) => w.id !== id);
  },

  async duplicateWorkflow(id: string): Promise<Workflow> {
    await delay(100);
    const original = mockWorkflows.find((w) => w.id === id);
    if (!original) throw new Error(`Workflow ${id} not found`);
    const duplicate: Workflow = {
      ...original,
      id: uuidv4(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockWorkflows.push(duplicate);
    return { ...duplicate };
  },

  async executeWorkflow(workflowId: string): Promise<Execution> {
    await delay(150);
    const workflow = mockWorkflows.find((w) => w.id === workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const execution: Execution = {
      id: uuidv4(),
      workflowId,
      workflowName: workflow.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      nodeResults: {},
    };

    for (const node of workflow.nodes) {
      execution.nodeResults[node.id] = { status: 'pending' };
    }

    mockExecutions.unshift(execution);

    // Simulate node-by-node execution
    setTimeout(() => {
      let idx = 0;
      const runStep = () => {
        if (idx >= workflow.nodes.length || execution.status === 'cancelled') {
          execution.status = execution.status === 'cancelled' ? 'cancelled' : 'completed';
          execution.finishedAt = new Date().toISOString();
          execution.duration = Date.now() - new Date(execution.startedAt).getTime();
          return;
        }

        const currNode = workflow.nodes[idx]!;
        execution.nodeResults[currNode.id] = {
          status: 'running',
          startedAt: new Date().toISOString(),
        };

        setTimeout(() => {
          execution.nodeResults[currNode.id] = {
            status: 'completed',
            startedAt: execution.nodeResults[currNode.id]!.startedAt,
            finishedAt: new Date().toISOString(),
            duration: 600 + Math.random() * 800,
            outputData: { result: `Output from ${currNode.data.label}` },
          };
          idx++;
          runStep();
        }, 500 + Math.random() * 800);
      };

      runStep();
    }, 100);

    return { ...execution };
  },

  async stopExecution(executionId: string): Promise<void> {
    await delay(50);
    const execution = mockExecutions.find((e) => e.id === executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.finishedAt = new Date().toISOString();
    }
  },

  async getExecution(executionId: string): Promise<Execution> {
    await delay(50);
    const execution = mockExecutions.find((e) => e.id === executionId);
    if (!execution) throw new Error(`Execution ${executionId} not found`);
    return { ...execution };
  },

  async listExecutions(workflowId: string): Promise<Execution[]> {
    await delay(80);
    return mockExecutions.filter((e) => e.workflowId === workflowId);
  },

  async getExecutionLogs(executionId: string): Promise<ExecutionLog[]> {
    await delay(50);
    const execution = mockExecutions.find((e) => e.id === executionId);
    if (!execution) return [];

    return [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Workflow started',
      },
      {
        id: '2',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Gmail trigger received new email',
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'AI Agent researching with 3 tools',
      },
      {
        id: '4',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Send Email and Save to Notion ran in parallel',
      },
      {
        id: '5',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Finished in 8.2s',
      },
    ];
  },

  async getNodeDefinitions(): Promise<NodeDefinition[]> {
    await delay(50);
    return nodeRegistry.getAll();
  },
};

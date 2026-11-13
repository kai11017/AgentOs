import { create } from 'zustand';
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import type { Connection, NodeChange, EdgeChange } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { getApiAdapter } from '@/api';

// ─── Undo/Redo History ──────────────────────────────────────────────────────

interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// ─── Store State ────────────────────────────────────────────────────────────

interface WorkflowState {
  // Current workflow
  currentWorkflow: Workflow | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isDirty: boolean;

  // Workflow list
  workflows: Workflow[];
  isLoadingWorkflows: boolean;

  // Undo/Redo
  history: HistoryEntry[];
  historyIndex: number;

  // Actions — Workflow CRUD
  loadWorkflows: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  createWorkflow: (name?: string) => Promise<Workflow>;
  saveWorkflow: () => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<void>;
  setWorkflowName: (name: string) => void;

  // Actions — Canvas
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }, label: string) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;

  // Actions — Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Reset
  reset: () => void;
}

const MAX_HISTORY = 50;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────────

  currentWorkflow: null,
  nodes: [],
  edges: [],
  isDirty: false,
  workflows: [],
  isLoadingWorkflows: false,
  history: [],
  historyIndex: -1,

  // ── Workflow CRUD ──────────────────────────────────────────────────

  loadWorkflows: async () => {
    set({ isLoadingWorkflows: true });
    try {
      const workflows = await getApiAdapter().listWorkflows();
      set({ workflows, isLoadingWorkflows: false });
    } catch {
      set({ isLoadingWorkflows: false });
    }
  },

  loadWorkflow: async (id: string) => {
    try {
      const workflow = await getApiAdapter().getWorkflow(id);
      set({
        currentWorkflow: workflow,
        nodes: workflow.nodes,
        edges: workflow.edges,
        isDirty: false,
        history: [{ nodes: workflow.nodes, edges: workflow.edges }],
        historyIndex: 0,
      });
    } catch (e) {
      console.error('Failed to load workflow:', e);
    }
  },

  createWorkflow: async (name?: string) => {
    const workflow = await getApiAdapter().createWorkflow({
      name: name || 'Untitled Workflow',
    });
    set({
      currentWorkflow: workflow,
      nodes: [],
      edges: [],
      isDirty: false,
      history: [{ nodes: [], edges: [] }],
      historyIndex: 0,
    });
    get().loadWorkflows();
    return workflow;
  },

  saveWorkflow: async () => {
    const { currentWorkflow, nodes, edges } = get();
    if (!currentWorkflow) return;

    await getApiAdapter().updateWorkflow(currentWorkflow.id, {
      ...currentWorkflow,
      nodes,
      edges,
    });
    set({ isDirty: false });
    get().loadWorkflows();
  },

  deleteWorkflow: async (id: string) => {
    await getApiAdapter().deleteWorkflow(id);
    const { currentWorkflow } = get();
    if (currentWorkflow?.id === id) {
      set({ currentWorkflow: null, nodes: [], edges: [], isDirty: false });
    }
    get().loadWorkflows();
  },

  duplicateWorkflow: async (id: string) => {
    await getApiAdapter().duplicateWorkflow(id);
    get().loadWorkflows();
  },

  setWorkflowName: (name: string) => {
    const { currentWorkflow } = get();
    if (!currentWorkflow) return;
    set({
      currentWorkflow: { ...currentWorkflow, name },
      isDirty: true,
    });
  },

  // ── Canvas Changes ─────────────────────────────────────────────────

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as WorkflowEdge[],
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    get().pushHistory();
    set((state) => ({
      edges: addEdge(
        { ...connection, id: `e-${uuidv4().slice(0, 8)}`, type: 'smoothstep' },
        state.edges,
      ) as WorkflowEdge[],
      isDirty: true,
    }));
  },

  addNode: (type, position, label) => {
    get().pushHistory();
    const newNode: WorkflowNode = {
      id: `node-${uuidv4().slice(0, 8)}`,
      type,
      position,
      data: {
        label,
        definitionType: type,
        config: {},
      },
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      isDirty: true,
    }));
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      isDirty: true,
    }));
  },

  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    get().pushHistory();
    const newNode: WorkflowNode = {
      ...node,
      id: `node-${uuidv4().slice(0, 8)}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data, label: `${node.data.label} (Copy)` },
      selected: false,
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));
  },

  deleteEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      isDirty: true,
    }));
  },

  // ── Undo/Redo ──────────────────────────────────────────────────────

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1]!;
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      historyIndex: historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1]!;
    set({
      nodes: next.nodes,
      edges: next.edges,
      historyIndex: historyIndex + 1,
      isDirty: true,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── Reset ──────────────────────────────────────────────────────────

  reset: () => {
    set({
      currentWorkflow: null,
      nodes: [],
      edges: [],
      isDirty: false,
      history: [],
      historyIndex: -1,
    });
  },
}));


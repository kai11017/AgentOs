import type { WorkflowNode, WorkflowEdge } from '@/types/workflow';

/**
 * Clean layered hierarchical auto-layout without external native binaries.
 * Arranges nodes logically from top to bottom based on graph edges.
 */
export function layoutWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  if (nodes.length === 0) return [];

  // Build adjacency list & calculate in-degrees
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Topological / BFS rank assignment
  const levels = new Map<string, number>();
  const queue: string[] = [];

  // Start with nodes that have in-degree 0 (triggers, inputs, or root nodes)
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
      levels.set(nodeId, 0);
    }
  }

  // Fallback for cycles or disconnected components
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0]!.id);
    levels.set(nodes[0]!.id, 0);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLevel = levels.get(curr) || 0;

    for (const neighbor of adj.get(curr) || []) {
      const neighborLevel = levels.get(neighbor) || 0;
      if (currLevel + 1 > neighborLevel) {
        levels.set(neighbor, currLevel + 1);
        queue.push(neighbor);
      }
    }
  }

  // Group nodes by level
  const levelGroups = new Map<number, WorkflowNode[]>();
  for (const node of nodes) {
    const lvl = levels.get(node.id) || 0;
    if (!levelGroups.has(lvl)) {
      levelGroups.set(lvl, []);
    }
    levelGroups.get(lvl)!.push(node);
  }

  // Calculate coordinates: level is Y (top to bottom), rank within level is X
  const NODE_WIDTH = 260;
  const NODE_HEIGHT = 120;
  const HORIZONTAL_GAP = 60;
  const VERTICAL_GAP = 100;
  const START_X = 200;
  const START_Y = 80;

  const positionedNodes: WorkflowNode[] = [];

  for (const [level, groupNodes] of levelGroups.entries()) {
    const totalWidth = groupNodes.length * NODE_WIDTH + (groupNodes.length - 1) * HORIZONTAL_GAP;
    const startXForLevel = START_X - totalWidth / 2 + NODE_WIDTH / 2;

    groupNodes.forEach((node, index) => {
      const x = startXForLevel + index * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = START_Y + level * (NODE_HEIGHT + VERTICAL_GAP);

      positionedNodes.push({
        ...node,
        position: { x: Math.round(x), y: Math.round(y) },
      });
    });
  }

  return positionedNodes;
}


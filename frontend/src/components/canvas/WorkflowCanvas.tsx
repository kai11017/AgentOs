import React, { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  useReactFlow,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { BaseNode } from '@/nodes/base/BaseNode';
import nodeRegistry from '@/nodes/registry';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useUIStore } from '@/stores/ui-store';
import { CanvasContextMenu } from './CanvasContextMenu';
import { CanvasQuickAddWidget } from './CanvasQuickAddWidget';
import { CanvasBottomDashboard } from './CanvasBottomDashboard';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { Undo2 } from 'lucide-react';

export const WorkflowCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const undo = useWorkflowStore((s) => s.undo);
  const canUndo = useWorkflowStore((s) => s.canUndo());

  const selectNode = useUIStore((s) => s.selectNode);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);

  const { screenToFlowPosition, fitView, zoomTo } = useReactFlow();

  // Register all available node types to BaseNode renderer
  const nodeTypes = useMemo(() => {
    const types: Record<string, typeof BaseNode> = {
      default: BaseNode,
    };
    for (const def of nodeRegistry.getAll()) {
      types[def.type] = BaseNode;
    }
    return types;
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/agentos-node-type');
      const label = event.dataTransfer.getData('application/agentos-node-label');

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position, label || 'New Node');
    },
    [screenToFlowPosition, addNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    hideContextMenu();
  }, [selectNode, hideContextMenu]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      selectNode(node.id);
      hideContextMenu();
    },
    [selectNode, hideContextMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, 'canvas');
    },
    [showContextMenu]
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, 'node', node.id);
    },
    [showContextMenu]
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, 'edge', edge.id);
    },
    [showContextMenu]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative bg-[#f7f5ef] overflow-hidden">
      {/* Floating Canvas Quick Add Menu (Top-Left, Screenshot 1) */}
      <CanvasQuickAddWidget />

      {/* Floating Undo & 100% Zoom Controls (Top-Right, Screenshot 1) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 select-none">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="px-3 py-1.5 bg-white border border-[#e4ded3] hover:bg-[#f5f2eb] disabled:opacity-40 text-xs font-semibold text-[#19221d] rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        <button
          type="button"
          onClick={() => zoomTo(1, { duration: 300 })}
          className="px-3 py-1.5 bg-white border border-[#e4ded3] hover:bg-[#f5f2eb] text-xs font-semibold text-[#19221d] rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          100%
        </button>
      </div>

      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 2.6, stroke: '#335d48' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#cfc7ba"
          gap={20}
          size={1.6}
        />
      </ReactFlow>

      {/* Floating Bottom Console & Stats Dashboard (Bottom, Screenshot 1) */}
      <CanvasBottomDashboard />

      {/* Context Menu */}
      <CanvasContextMenu onFitView={() => fitView({ duration: 300 })} />
    </div>
  );
};

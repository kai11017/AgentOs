import React, { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { layoutWorkflowGraph } from '@/lib/auto-layout';
import { Settings, Copy, Trash2, LayoutGrid, Maximize, Plus, CornerDownRight } from 'lucide-react';

interface CanvasContextMenuProps {
  onFitView?: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ onFitView }) => {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const selectNode = useUIStore((s) => s.selectNode);
  const togglePalette = useUIStore((s) => s.togglePalette);

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const deleteEdge = useWorkflowStore((s) => s.deleteEdge);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [hideContextMenu]);

  if (!contextMenu?.visible) return null;

  const handleAutoLayout = () => {
    const laidOut = layoutWorkflowGraph(nodes, edges);
    // Apply changes
    const changes = laidOut.map((n) => ({
      type: 'position' as const,
      id: n.id,
      position: n.position,
    }));
    onNodesChange(changes);
    hideContextMenu();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: contextMenu.x, top: contextMenu.y }}
      className="fixed z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 text-xs select-none backdrop-blur animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Node context menu */}
      {contextMenu.type === 'node' && contextMenu.targetId && (
        <>
          <button
            type="button"
            onClick={() => {
              selectNode(contextMenu.targetId!);
              hideContextMenu();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" /> Configure Node
          </button>
          <button
            type="button"
            onClick={() => {
              duplicateNode(contextMenu.targetId!);
              hideContextMenu();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
          <button
            type="button"
            onClick={() => {
              deleteNode(contextMenu.targetId!);
              hideContextMenu();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 text-left transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Node
          </button>
        </>
      )}

      {/* Edge context menu */}
      {contextMenu.type === 'edge' && contextMenu.targetId && (
        <button
          type="button"
          onClick={() => {
            deleteEdge(contextMenu.targetId!);
            hideContextMenu();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 text-left transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Connection
        </button>
      )}

      {/* Canvas context menu */}
      {contextMenu.type === 'canvas' && (
        <>
          <button
            type="button"
            onClick={() => {
              togglePalette();
              hideContextMenu();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" /> Open Node Library
          </button>
          <button
            type="button"
            onClick={handleAutoLayout}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" /> Auto-Layout Graph
          </button>
          {onFitView && (
            <button
              type="button"
              onClick={() => {
                onFitView();
                hideContextMenu();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
            >
              <Maximize className="w-3.5 h-3.5 text-slate-400" /> Fit to Screen
            </button>
          )}
        </>
      )}
    </div>
  );
};


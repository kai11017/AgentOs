import { create } from 'zustand';
import type { NodeDefinition, NodeCategory } from '@/types/node-definitions';
import nodeRegistry from '@/nodes/registry';

export type AppView =
  | 'home'
  | 'workflows'
  | 'editor'
  | 'templates'
  | 'agents'
  | 'tools'
  | 'executions'
  | 'settings';

interface UIState {
  // Navigation View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Selected node for config panel
  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;

  // Panel visibility
  isPaletteOpen: boolean;
  isConfigPanelOpen: boolean;
  isExecutionPanelOpen: boolean;
  isDeployModalOpen: boolean;
  togglePalette: () => void;
  toggleConfigPanel: () => void;
  toggleExecutionPanel: () => void;
  setDeployModalOpen: (open: boolean) => void;

  // Node palette filter
  paletteSearchQuery: string;
  paletteCategory: NodeCategory | 'all';
  setPaletteSearchQuery: (query: string) => void;
  setPaletteCategory: (category: NodeCategory | 'all') => void;
  getFilteredDefinitions: () => NodeDefinition[];

  // Context menu
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    type: 'canvas' | 'node' | 'edge';
    targetId?: string;
  } | null;
  showContextMenu: (x: number, y: number, type: 'canvas' | 'node' | 'edge', targetId?: string) => void;
  hideContextMenu: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Navigation View
  currentView: 'editor',
  setCurrentView: (view) => set({ currentView: view }),

  // Selected node
  selectedNodeId: null,
  selectNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      isConfigPanelOpen: nodeId !== null,
    });
  },

  // Panel visibility
  isPaletteOpen: true,
  isConfigPanelOpen: true,
  isExecutionPanelOpen: true,
  isDeployModalOpen: false,
  togglePalette: () => set((s) => ({ isPaletteOpen: !s.isPaletteOpen })),
  toggleConfigPanel: () => set((s) => ({ isConfigPanelOpen: !s.isConfigPanelOpen })),
  toggleExecutionPanel: () => set((s) => ({ isExecutionPanelOpen: !s.isExecutionPanelOpen })),
  setDeployModalOpen: (open) => set({ isDeployModalOpen: open }),

  // Node palette filter
  paletteSearchQuery: '',
  paletteCategory: 'all',
  setPaletteSearchQuery: (query) => set({ paletteSearchQuery: query }),
  setPaletteCategory: (category) => set({ paletteCategory: category }),
  getFilteredDefinitions: () => {
    const { paletteSearchQuery, paletteCategory } = get();
    let defs = nodeRegistry.getAll();

    if (paletteCategory !== 'all') {
      defs = defs.filter((d) => d.category === categoryFilterMap(paletteCategory));
    }

    if (paletteSearchQuery.trim()) {
      const q = paletteSearchQuery.toLowerCase();
      defs = defs.filter(
        (d) =>
          d.displayName.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }

    return defs;
  },

  // Context menu
  contextMenu: null,
  showContextMenu: (x, y, type, targetId) =>
    set({ contextMenu: { visible: true, x, y, type, targetId } }),
  hideContextMenu: () => set({ contextMenu: null }),
}));

function categoryFilterMap(cat: string): NodeCategory {
  return cat as NodeCategory;
}

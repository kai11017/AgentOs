import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WorkflowToolbar } from '@/components/toolbar/WorkflowToolbar';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { NodeConfigPanel } from '@/components/panels/NodeConfigPanel';
import { DeployModal } from '@/components/modals/DeployModal';

// Views matching the 9 design mockups
import { HomeView } from '@/components/views/HomeView';
import { WorkflowsView } from '@/components/views/WorkflowsView';
import { AutomationsView } from '@/components/views/AutomationsView';
import { TemplatesView } from '@/components/views/TemplatesView';
import { AgentsView } from '@/components/views/AgentsView';
import { ToolsView } from '@/components/views/ToolsView';
import { ExecutionsView } from '@/components/views/ExecutionsView';
import { SettingsView } from '@/components/views/SettingsView';

import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { useUIStore } from '@/stores/ui-store';

export default function App() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const executeWorkflow = useExecutionStore((s) => s.executeWorkflow);

  const currentView = useUIStore((s) => s.currentView);
  const selectNode = useUIStore((s) => s.selectNode);

  // Initialize demo workflow
  useEffect(() => {
    async function init() {
      await loadWorkflows();
      if (!currentWorkflow) {
        await loadWorkflow('demo-workflow-1');
      }
    }
    init();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveWorkflow();
      }

      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      if (
        (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (cmdOrCtrl && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redo();
      }

      if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (currentWorkflow) {
          executeWorkflow(currentWorkflow.id);
        }
      }

      if (e.key === 'Escape') {
        selectNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWorkflow, saveWorkflow, undo, redo, executeWorkflow, selectNode]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f3ec] text-[#19221d] antialiased">
      {/* 1. Left Dark Forest Green Sidebar (All 9 Screenshots) */}
      <AppSidebar />

      {/* 2. Main Content View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {currentView === 'editor' && (
          <ReactFlowProvider>
            {/* Top Toolbar */}
            <WorkflowToolbar />

            {/* Central Canvas + Right Config Inspector */}
            <div className="flex-1 flex overflow-hidden relative">
              <main className="flex-1 h-full relative overflow-hidden bg-[#f7f5ef]">
                <WorkflowCanvas />
              </main>

              {/* Right Side Node Inspector (Screenshot 1) */}
              <NodeConfigPanel />
            </div>
          </ReactFlowProvider>
        )}

        {currentView === 'home' && <HomeView />}
        {currentView === 'workflows' && <WorkflowsView />}
        {currentView === 'automations' && <AutomationsView />}
        {currentView === 'templates' && <TemplatesView />}
        {currentView === 'agents' && <AgentsView />}
        {currentView === 'tools' && <ToolsView />}
        {currentView === 'executions' && <ExecutionsView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

      {/* Deploy and Share Modal (Screenshot 9) */}
      <DeployModal />
    </div>
  );
}

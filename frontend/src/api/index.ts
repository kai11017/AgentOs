import type { WorkflowApiAdapter } from '@/types/api';
import { mockApiAdapter } from './mock-adapter';

// ─── Active API Adapter ─────────────────────────────────────────────────────
// Switch this to httpAdapter when the backend is ready

let activeAdapter: WorkflowApiAdapter = mockApiAdapter;

export function setApiAdapter(adapter: WorkflowApiAdapter): void {
  activeAdapter = adapter;
}

export function getApiAdapter(): WorkflowApiAdapter {
  return activeAdapter;
}

export { mockApiAdapter };


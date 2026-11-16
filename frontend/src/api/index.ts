import type { WorkflowApiAdapter } from '@/types/api';
import { mockApiAdapter } from './mock-adapter';
import { httpApiAdapter } from './http-adapter';

// ─── Active API Adapter ─────────────────────────────────────────────────────
// Defaults to the live HTTP API Adapter connected to the FastAPI backend
let activeAdapter: WorkflowApiAdapter = httpApiAdapter;

export function setApiAdapter(adapter: WorkflowApiAdapter): void {
  activeAdapter = adapter;
}

export function getApiAdapter(): WorkflowApiAdapter {
  return activeAdapter;
}

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:8005/health', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export { mockApiAdapter, httpApiAdapter };


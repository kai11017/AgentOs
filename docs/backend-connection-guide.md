# AgentOS — Custom Backend Connection Guide

This document explains how the **AgentOS Frontend** communicates with the backend, and how to connect our custom Python/FastAPI execution backend when ready.

---

## 1. Architectural Overview

The frontend communicates exclusively through an **API Adapter Interface** (`WorkflowApiAdapter`). It has zero direct dependencies on internal engine structures or databases.

```text
Frontend React Flow Canvas & Stores
                │
                ▼
   WorkflowApiAdapter (TypeScript)
      ├── Mock Adapter (Default development mode: in-memory + simulated execution)
      └── Http Adapter (Production mode: REST / WebSockets)
                │
                ▼
      AgentOS Backend API (FastAPI)
                │
                ▼
      Workflow Orchestrator (Celery + Redis)
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
Local Models  MCP Tools  Vector DB
  (Ollama)    (System)  (Supabase)
```

---

## 2. API Contract Specification

Any backend implementation must fulfill the following REST endpoints:

### Workflows

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/workflows` | List all workflows | None | `Workflow[]` |
| `GET` | `/api/v1/workflows/:id` | Get workflow details | None | `Workflow` |
| `POST` | `/api/v1/workflows` | Create new workflow | `Partial<Workflow>` | `Workflow` |
| `PUT` | `/api/v1/workflows/:id` | Update workflow | `Partial<Workflow>` | `Workflow` |
| `DELETE` | `/api/v1/workflows/:id` | Delete workflow | None | `{ success: true }` |
| `POST` | `/api/v1/workflows/:id/duplicate` | Duplicate workflow | None | `Workflow` |

### Executions

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/v1/workflows/:id/execute` | Start workflow execution | `{ inputData?: any }` | `Execution` |
| `POST` | `/api/v1/executions/:id/stop` | Stop running execution | None | `{ success: true }` |
| `GET` | `/api/v1/executions/:id` | Get execution status & node results | None | `Execution` |
| `GET` | `/api/v1/workflows/:id/executions` | List executions for workflow | None | `Execution[]` |
| `GET` | `/api/v1/executions/:id/logs` | Get execution logs | None | `ExecutionLog[]` |

---

## 3. Switching from Mock to Real Backend

In `frontend/src/api/index.ts`, the active adapter is exposed via `getApiAdapter()`:

```typescript
import type { WorkflowApiAdapter } from '@/types/api';
import { mockApiAdapter } from './mock-adapter';
import { httpApiAdapter } from './http-adapter'; // Create this when backend is running

// Set to mockApiAdapter for offline dev, or httpApiAdapter for live FastAPI
const activeAdapter: WorkflowApiAdapter = 
  import.meta.env.VITE_USE_MOCK_API === 'false' ? httpApiAdapter : mockApiAdapter;
```

---

## 4. Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The application will start at `http://localhost:3000` with the demo workflow loaded and the mock engine active.


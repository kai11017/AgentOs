# AgentOS Backend Architecture & Implementation Plan (Production Grade)

## Executive Summary

This specification addresses all security, correctness, durability, and reliability requirements for the **AgentOS Backend**. The backend is designed as an independent, local-first platform running on **PostgreSQL (via Docker or Supabase)**, featuring native local model auto-detection with Docker container fallback, hardened security boundaries, an async DAG execution engine with persisted node state, and real-time WebSocket log streaming.

---

## 1. Core Architecture Decisions

### A. Database: PostgreSQL (Docker / Supabase)
- **Primary Driver**: `SQLAlchemy 2.0 (Async)` + `asyncpg`.
- **Deployment Options**:
  - **Docker Compose**: Lightweight `postgres:16-alpine` container bound to `127.0.0.1:5432`.
  - **Supabase**: Direct connection via Supabase connection string (`postgresql+asyncpg://...`).
  - **Test Fallback**: `sqlite+aiosqlite` for zero-dependency unit testing.
- **Relational + JSONB**: Workflow metadata, execution logs, and credentials use relational schema with foreign key constraints; arbitrary node configurations and dynamic payloads are stored in native `JSONB` columns with GIN indexing.

### B. Local Model Runtime: Native-First Detection with Docker Fallback
- **macOS Metal GPU Fix**: Docker on macOS cannot access Apple Silicon Metal (MPS), running local LLMs on CPU at 10x slower speeds.
- **Hierarchical Detection Strategy**:
  1. **Native Ollama Detection**: Probe `http://127.0.0.1:11434` at startup. If native Ollama is installed (giving native GPU Metal on macOS and native CUDA on Linux/Windows), connect directly with zero Docker overhead.
  2. **Docker Fallback**: If no native Ollama is running, the model manager spins up the `agentos-ollama` container (with NVIDIA GPU passthrough on Linux/WSL2, or CPU fallback).
  3. **Cloud API Fallback**: Direct HTTPS calls to OpenAI / Anthropic / custom endpoints when configured.
- **Unified SDK**: Standard `openai` Python SDK with `base_url="http://127.0.0.1:11434/v1"` (no heavy LiteLLM dependency).

### C. Security & Sandboxing Architecture
- **Host Protection (`docker.sock`)**: Docker socket access is strictly isolated inside the `model-manager` service. All backend ports bind strictly to `127.0.0.1`.
- **Local API Authentication**: Backend generates an ephemeral API token on startup (`X-AgentOS-Token`), written to a protected local session file read by the frontend, blocking unauthorized local processes from executing workflows.
- **CORS Policy**: Strict origin lockdown (`http://localhost:5173`, `http://127.0.0.1:5173`).
- **Encrypted Credentials**: API keys (OpenAI, Claude) and OAuth tokens (Gmail, Notion) are encrypted at rest using `cryptography.fernet.Fernet` with a machine-derived key stored in the OS keyring.
- **Code Node Sandboxing**: JavaScript and Python execution nodes execute inside isolated subprocesses with CPU/memory limits, hard execution timeouts (default 10s), and network access blocked by default.
- **SSRF Protection (HTTP Node)**: All outgoing HTTP requests validate destination IPs against private/internal ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 equivalents), rejecting loopback/LAN probes unless explicitly permitted.
- **Sandboxed Expression Engine**: Expressions like `{{$json.summary}}` are evaluated using a secure AST sandbox (`simpleeval` or `jmespath`), completely prohibiting `eval()`.

---

## 2. DAG Engine: Reliability & Durability

### 1. Crash Recovery & State Persistence
- Every node transition (`pending` → `running` → `completed` | `failed`) and its output payload is written immediately to PostgreSQL.
- If the server restarts, interrupted workflows are detected as `interrupted` and can be resumed from the last completed node checkpoint.
- Enables long-running workflows and **Human Approval** pause/resume.

### 2. Run Controls
- **Cancellation**: `asyncio.Event` cancellation tokens checked before and during each node execution.
- **Timeouts**: Configurable per-node timeouts (e.g. 30s default, 120s for deep research).
- **Retries with Exponential Backoff**: Automatic retries for transient HTTP and LLM failures.
- **Loop Guards**: Maximum iteration counter (default 50) preventing infinite loop cycles.

### 3. Model Concurrency & VRAM Protection
- An `asyncio.Semaphore(max_concurrent_inferences)` ensures multiple agent nodes do not overwhelm local GPU VRAM simultaneously.
- Sets Ollama `OLLAMA_NUM_PARALLEL=2` and `OLLAMA_MAX_LOADED_MODELS=1` to prevent out-of-memory errors.

### 4. Merge Semantics
- Nodes with multiple incoming parents (e.g., `Success` waiting on `Send Email` and `Save to Notion`) support configurable merge policies:
  - `WAIT_ALL` (Default): Node waits until all incoming branches successfully complete.
  - `WAIT_ANY`: Triggers as soon as the first incoming branch finishes (race / or-logic).

---

## 3. Real-Time Streaming & Observability

### Resumable WebSocket Protocol
- Messages carry strictly increasing sequence IDs:
  ```json
  { "seq": 104, "execution_id": "exec_8f2", "type": "node_completed", "node_id": "node-agent-1", "duration_ms": 6400 }
  ```
- If network drops, the frontend reconnects with `?last_event_id=103`, and the backend replays missed events from the database log buffer.

### Observability & Metrics
- Per-node execution tracking:
  - Wall-clock latency (ms).
  - Token metrics: Prompt tokens, completion tokens, total tokens.
  - Structured JSON logs with log level, node ID, and timestamp.

---

## 4. Reordered Implementation Roadmap

### Phase 1: Vertical Slice (Immediate Foundation)
- Scaffold `backend/` with FastAPI, PostgreSQL (`asyncpg` / SQLAlchemy), and Pydantic v2 schemas.
- Build the core DAG engine with a mock model running `Gmail Trigger → AI Agent → Success Output` end-to-end.
- Implement WebSocket real-time log streaming with sequence IDs.

### Phase 2: Model Manager (Native + Docker Fallback)
- Implement `OllamaClient` probing `127.0.0.1:11434` first.
- Implement Docker fallback container lifecycle (`agentos-ollama`) bound to `127.0.0.1`.
- Implement `POST /api/v1/models/pull` using Ollama's HTTP streaming API with disk space & RAM preflight checks.

### Phase 3: Engine Durability & Concurrency
- Implement node-level database state checkpoints.
- Add cancellation tokens, per-node timeouts, retry backoff, and max loop count.
- Add VRAM concurrency semaphore and `WAIT_ALL` / `WAIT_ANY` merge semantics.

### Phase 4: Triggers & Encrypted Credentials
- Implement `APScheduler` for cron / interval workflows.
- Implement secure webhook receiver with HMAC signature verification.
- Implement Fernet-encrypted credentials table with OS keyring master key.

### Phase 5: Real Node Handlers & Sandboxing
- Implement ReAct tool-calling loop with `max_iterations` cap and token budgets.
- Check model capabilities (e.g., tool calling supported vs text-only).
- Implement sandboxed expression evaluation (`simpleeval`) for `{{$json...}}`.
- Implement SSRF-safe HTTP request handler and sandboxed code execution.

### Phase 6: Integration & Desktop Packaging
- Generate TypeScript types from FastAPI OpenAPI schema (`openapi-typescript`).
- Connect frontend `http-adapter.ts` to live backend.
- Author `docker-compose.yml` for PostgreSQL + backend + optional Ollama.

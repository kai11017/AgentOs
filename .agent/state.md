# Current State

## Last Updated
2026-11-13

## Current Commit
3ec60b2

## Current Milestone
Production Backend Architecture & Vertical Slice (PostgreSQL + Native/Docker Ollama)

## Completed
- **Architecture Finalized & Hardened**:
  - **Database**: Standardized on **PostgreSQL** (`asyncpg` + `SQLAlchemy 2.0`) with Docker container (`postgres:16-alpine`) and Supabase support, with seamless SQLite async fallback for local dev.
  - **Model Runtime**: Native Ollama detection at `127.0.0.1:11434` first (preserving Apple Silicon Metal GPU and native CUDA performance) with Docker container as an optional fallback.
  - **Security**: Local token authentication (`X-AgentOS-Token`), strict CORS, encrypted credentials with Fernet, SSRF protection on HTTP nodes, sandboxed code execution, and sandboxed expression evaluation (`simpleeval` instead of `eval`).
  - **Durability**: Node-level database state persistence for crash recovery and pause/resume, concurrency semaphores to protect local GPU VRAM, and `WAIT_ALL` merge semantics.
  - **Real-Time Observability**: Resumable WebSockets with event sequence IDs and token tracking.
- **Frontend UI & Canvas**: Production build passing cleanly with Outfit & Plus Jakarta Sans typography, intensified colors, and Left-to-Right connection routing.
- **Phase 1: Backend Vertical Slice**:
  - Scaffolded `backend/app/` with FastAPI, SQLAlchemy 2.0, DAG engine, handlers, REST endpoints, and WebSocket streaming.
  - Full test suite passed (4/4 tests: safe expressions, SSRF protection, DAG parallel tiers, end-to-end API execution).
- **Docker Integration & Setup Completed**:
  - Created root `docker-compose.yml` with `agentos-postgres` (PostgreSQL 16 Alpine on isolated port 5433:5432) and optional `agentos-ollama`.
  - Started and validated live container `agentos-postgres` (healthy).
  - Backend verified connected to live PostgreSQL 16 container via asyncpg (`postgresql+asyncpg://agentos:agentos@127.0.0.1:5433/agentos`).
  - Added programmatic Docker SDK controller (`backend/app/services/docker_service.py`) and `/api/v1/models/docker/status` endpoint.

## Next Steps
1. Connect Frontend to Live Backend (`WorkflowApiAdapter` HTTP + WebSocket client).
2. Wire Model Manager UI in frontend to `/api/v1/models` and `/api/v1/models/docker/status`.

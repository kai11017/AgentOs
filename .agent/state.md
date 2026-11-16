# Current State

## Last Updated
2026-11-16

## Current Commit
a80a2be

## Current Milestone
Phase 4: Encrypted Credential Vault, Bundled Python MCP Servers & Workflow Template Library

## Completed
- **Architecture Finalized & Hardened**:
  - **Database**: Standardized on **PostgreSQL** (`asyncpg` + `SQLAlchemy 2.0`) with Docker container (`postgres:16-alpine`) on port 5433, with seamless SQLite async fallback for local dev.
  - **Model Runtime**: Native Ollama detection at `127.0.0.1:11434` with live `qwen3.5:4b` (3.3 GB) and `llama3:latest` (8.0B parameters) model execution, with Docker container fallback.
  - **Security**: Local token authentication (`X-AgentOS-Token`), strict CORS, encrypted credentials with Fernet, SSRF protection on HTTP nodes, sandboxed code execution, and sandboxed expression evaluation (`simpleeval`).
  - **Durability**: Node-level database state persistence for crash recovery and pause/resume, concurrency semaphores to protect local GPU VRAM, and `WAIT_ALL` merge semantics.
  - **Real-Time Observability**: Resumable WebSockets with event sequence IDs and token tracking.
- **Frontend UI & Canvas**: Production build passing cleanly with Outfit & Plus Jakarta Sans typography, intensified colors, and Left-to-Right connection routing.
- **Hybrid Model Runtime (Cloud + Local)**:
  - Integrated user's Google AI Studio Gemini API key (`GEMINI_API_KEY`) safely in `backend/.env`.
  - Verified live Google Generative Language API connection (`gemini-3.5-flash` Status 200).
  - Detected and integrated user's local model `qwen3.5:4b` (3.3 GB) via Ollama for offline execution.
  - Implemented automatic routing in `AgentNodeHandler`: users can seamlessly select between `gemini-3.5-flash` (Cloud AI) and `qwen3.5:4b` (Local Ollama) in the node configuration sidebar.
  - Full automated test suite passing.
  - Production frontend build validated with 0 errors.
- **Autonomous Agent Tool Loop & Built-in Tools Engine**:
  - Implemented `BaseTool` with dual schema generation: Gemini `function_declarations` (with `thoughtSignature` support) and Ollama/OpenAI `function` tools.
  - Built 4 native core tools: `web_search` (DuckDuckGo search), `calculator` (safe math evaluator), `fetch_url` (SSRF-protected web reader), and `code_runner` (sandboxed Python script runner).
  - Upgraded `AgentNodeHandler` with an autonomous multi-turn reasoning and tool-calling loop (up to 5 iterations) with real-time log streaming over WebSockets.
- **Model Context Protocol (MCP) Integration**:
  - Developed `MCPClient` supporting JSON-RPC 2.0 stdio subprocess communication and handshake.
  - Implemented `MCPToolWrapper` adapting remote MCP tools into standard agent tools.
  - Built `MCPManager` managing servers (Filesystem, Memory, GitHub, custom) and registering tools dynamically into the global tool registry.
  - Created REST API endpoints: `/api/v1/mcp/servers`, `/api/v1/mcp/tools`, connect, and disconnect.
- **Context Window Management & Persistent Memory**:
  - Implemented `ContextWindowManager` with token budgeting, output truncation, Anchor + Tail multi-turn turn compaction, and upstream DAG distillation.
  - Added `MemoryTool` allowing agents to store, retrieve, and share key-value state across workflow nodes.
- **Production Trigger & Human-in-the-Loop Nodes**:
  - **External Webhook Ingress**: `/api/v1/triggers/webhook/{token}` supporting GET challenge verification and POST async execution.
  - **Human-in-the-Loop Approval Node**: `ApprovalNodeHandler` pausing execution on `asyncio.Future`, with UI review banner and operator approve/reject endpoints (`/api/v1/executions/{id}/approve`, `/reject`).
  - **Cron & Interval Background Scheduler**: APScheduler integration with `/api/v1/schedules` for recurring automated executions.
  - **Workflow JSON Export & Import**: `.agentflow.json` serialization with collision-free node/edge ID remapping.
- **Encrypted Credential Vault**:
  - Created `backend/app/core/security.py` featuring AES-128-CBC + HMAC-SHA256 authenticated encryption (`Fernet`) with PBKDF2 key derivation.
  - Implemented `CredentialModel` and REST API endpoints (`/api/v1/credentials`) with automated secret masking (`••••••••abcd`) and runtime decryption resolution (`resolve_credential`).
  - Added interactive Credential Management UI in `SettingsView.tsx` with modal for adding, masking, and deleting credentials.
- **Bundled Standalone Python MCP Servers**:
  - Created zero-dependency, local Python MCP servers:
    - `mcp_tools/filesystem/server.py`: Safe workspace filesystem operations (`list_files`, `read_file`, `write_file`, `search_files`).
    - `mcp_tools/system_info/server.py`: Hardware specs, storage telemetry, and safe TCP socket reachability diagnostics.
  - Pre-registered into `MCPManager` using `sys.executable` for 100% offline, zero-NPM execution.
- **Workflow Template Library**:
  - Created `backend/app/templates/registry.py` with 4 industrial templates (Autonomous Research, Scheduled Health Digest, Human-in-the-Loop Approval, Code Security Audit).
  - Implemented `/api/v1/templates` and `/api/v1/templates/{id}/instantiate` with unique node/edge UUID generation.
  - Wired into `TemplatesView.tsx` with category filters, hero banner, and 1-click instantiation directly into the React Flow editor canvas.
  - Added "Templates" quick launcher button in `WorkflowToolbar.tsx`.
- **Testing & Verification**:
  - All 15 comprehensive architecture tests passing cleanly in `backend/tests/run_tests.py`.
  - Frontend TypeScript & Vite production build compiles with 0 errors in 14.20s.

## Next Steps
1. Package standalone desktop application (Tauri or Electron).
2. Add community integration nodes (Slack/Discord Webhooks, Google Sheets, local vector store ChromaDB/FAISS).

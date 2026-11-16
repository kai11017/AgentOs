# Current State

## Last Updated
2026-11-16

## Current Commit
a80a2be

## Current Milestone
Phase 8: Workflow Creation Dialog, Database Canvas Auto-Saving, Email Node with Simulated Outbox & Live SMTP, Info Retrieval Node, and In-App Email Outbox

## Completed
- **Workflow Creation Modal & Database Persistence**:
  - Built `CreateWorkflowModal.tsx` asking for workflow name, description, starter presets (Clean Canvas, AI Research & Email, Info Retrieval & Export, Conditional Quality Gate), and tags.
  - Automatically saves the newly created workflow directly into PostgreSQL and routes to the canvas editor.
  - Refactored `WorkflowsView.tsx` and `HomeView.tsx` to remove all static mock arrays and display real database workflows with accurate node counts and status.
- **Workflow Canvas Auto-Save & Manual Save**:
  - Updated `WorkflowToolbar.tsx` with an explicit "Save" / "Saved" status button with dirty indicator.
  - Made "Run workflow" asynchronously auto-persist the latest canvas nodes and edges to PostgreSQL before executing.
  - Added inline rename for workflows that automatically updates PostgreSQL on enter/blur.
- **Email Node with Simulated Outbox & Live SMTP**:
  - Built dedicated `EmailNodeHandler` (`backend/app/engine/handlers/email.py`) supporting dynamic expression evaluation for sender, recipient, subject, and body.
  - Transparent Delivery Modes:
    - **Simulated Local Outbox (Dev Mode)**: Captures agent-dispatched emails without requiring SMTP credentials, saves styled HTML previews to `./outputs/emails/`, and emits real-time WebSocket progress.
    - **Live SMTP**: Dispatches real emails via Gmail (port 587 STARTTLS with Google App Passwords) or custom SMTP servers (port 465 SSL or 587).
  - Built `EmailOutboxModal.tsx` in frontend and wired "Outbox" button on toolbar and inspector. Provides a full interactive email viewer with live search, email header inspection, HTML iframe rendering, and SMTP connection testing.
  - Added backend endpoints: `GET /api/v1/emails`, `GET /api/v1/emails/{filename}`, `DELETE /api/v1/emails/{filename}`, and `POST /api/v1/emails/test-smtp`.
- **Info Retrieval & Search Node**:
  - Built `InfoRetrievalNodeHandler` (`backend/app/engine/handlers/retrieval.py`) supporting DuckDuckGo live web search, public URL fetching, and document knowledge base retrieval.
  - Added `InfoRetrieval.ts` node definition and rich inspector configuration in `NodeConfigPanel.tsx`.
- **Dynamic Ollama Model Auto-Discovery**:
  - Updated `AgentNodeHandler` to query Ollama's `/api/tags` and automatically bind the installed model (e.g. `qwen3.5:4b`) when `llama3:latest` or missing models are requested, preventing 404 breaks.
- **Full Architecture Test Validation**:
  - 18/18 production architecture tests verified passing.
  - Frontend production build compiling with 0 errors.

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
- **Local Document RAG & Vector Knowledge Base Engine**:
  - Created `KnowledgeCollectionModel`, `KnowledgeDocumentModel`, and `KnowledgeChunkModel` in `backend/app/models/knowledge.py`.
  - Implemented `RecursiveTextSplitter` with recursive multi-delimiter chunking and configurable overlap.
  - Implemented `EmbeddingService` supporting Gemini `text-embedding-004`, Ollama `/api/embed`, and deterministic 128-dim sublinear TF-IDF fallback vectorizer.
  - Built `LocalVectorStore` with cosine similarity, collection management, and weighted hybrid (70% semantic / 30% keyword) search.
  - Added `KnowledgeRetrieverTool` allowing autonomous agents to query knowledge collections during ReAct reasoning loops.
  - Created `KnowledgeNodeHandler` executing in DAG workflows (`"document-rag"`, `"vector-search"`, `"knowledge"`).
  - Implemented REST endpoints (`/api/v1/knowledge/collections`, `/upload`, `/query`, `/delete`) and frontend adapter methods.
- **Visual Expression Builder & Node-Level Step Testing**:
  - Created `ExpressionBuilderModal.tsx` allowing visual variable inspection across upstream DAG nodes, current `$json` payload, and system `$env`.
  - Built live expression evaluator backend endpoint `POST /api/v1/nodes/evaluate-expression` with real-time type inspection.
  - Built `NodeTestModal.tsx` runner allowing custom JSON payload inputs, isolated step execution, latency tracking, formatted output tree, and real-time step execution telemetry logs.
  - Created `CodeNodeHandler` and `TransformNodeHandler` for standalone python scripts and schema transforms.
  - Added `FieldLabelWithExpression` one-click `{{ fx }}` buttons across all configuration fields in `NodeConfigPanel.tsx`.
  - Enabled "Save as sample for next nodes" storing execution results directly in node data for downstream DAG schema discovery.
- **Dynamic DAG Routing, Conditional Branching & Local Output Exporters**:
  - Implemented `IfElseNodeHandler` supporting boolean formulas and comparison operators (`equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `not_empty`) returning `active_handle: "true" | "false"`.
  - Added port-aware edge routing and Kahn's algorithm branch pruning: when a condition evaluates, non-matching edges and their downstream descendants are added to `skipped_nodes` and bypass handler execution in 0ms.
  - Implemented dynamic runtime expression resolution in `WorkflowExecutor`: resolves `{{ ... }}` expressions in node configs immediately before execution against merged `$json`, `$prev`, `$nodes`, and `$env`.
  - Created `FileExportNodeHandler` writing workflow reports/data directly to disk (`.md`, `.json`, `.csv`, `.txt`) with automatic directory scaffolding, append/write modes, and templated paths.
  - Created `NotificationNodeHandler` formatting and dispatching Discord embeds, Slack blocks, and generic HTTP webhooks.
  - Upgraded React Flow `BaseNode` with distinct color-coded true (emerald) and false (rose) handles and visual branch badges.
  - Created comprehensive `AutomationsView.tsx` dashboard providing automation metrics, schedule search, active toggle switches (`POST /schedules/{id}/toggle`), and manual "Run Now" execution triggers (`POST /schedules/{id}/run-now`).
  - Added 1-click zero-setup launchers `start.bat` and `start.ps1` for local desktop execution.
- **Testing & Verification**:
  - All 18 comprehensive architecture tests passing cleanly in `backend/tests/run_tests.py`.
  - Frontend TypeScript & Vite production build compiles with 0 errors in 22.38s.

## Next Steps
1. Task WF-008: Standalone Desktop Packaging (Tauri v2) or Native Windows installer.
2. Production Deployment & Containerized Runbooks.

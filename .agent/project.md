# Project

## Purpose
LocalFlow Agent is a local-first, privacy-focused visual workflow automation platform running natively on desktop environments. It allows users to orchestrate tasks across their local system, shell, browser, and external APIs using local LLMs.

## Technology

### Frontend
- React 18+ (TypeScript)
- React Flow (`@xyflow/react`) for the node-based visual editor
- Tailwind CSS for styling
- Desktop packaging via Tauri or Electron (TBD)

### Backend
- FastAPI (Python) for API and execution engine
- Celery for distributed task execution
- Redis as a broker and cache

### Database
- Supabase (PostgreSQL with `pgvector` for vector similarity search)
- Fallback local SQLite support for completely offline execution

### AI
- Local LLM inference (Ollama or vLLM)
- Model Context Protocol (MCP) clients and servers for integrating local tools
- LangChain / LlamaIndex for agent abstraction loops

## Major Features
- Visual drag-and-drop workflow canvas
- Native Model Context Protocol (MCP) tool integration (filesystem, terminal, browser)
- Fully offline / local-first inference mode
- Asynchronous queueing for long-running agent workflows
- Multi-agent collaboration nodes (e.g., Coder, Executor, Reviewer)

## Important Paths
- `frontend/`: React application, UI components, React Flow canvas
- `backend/`: FastAPI server, workflow parser, and Celery worker
- `mcp_tools/`: Individual MCP servers (filesystem, terminal, browser)
- `docker/`: Docker Compose configurations and Dockerfiles
- `.agent/`: Agent Development Control Plane
- `.github/workflows/`: CI/CD pipelines

## External Services
- Local Ollama/vLLM instance (User managed)
- Local Redis and PostgreSQL/Supabase (Containerized via Docker)

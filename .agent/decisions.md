# Architectural Decisions

## ADR-001: Separation of Frontend and Backend

Status: Accepted

Date: 2026-08-19

Context:
We need a robust, scalable architecture to manage the UI state of complex node-based graphs while handling heavy background asynchronous LLM execution tasks.

Decision:
We will split the application into a React/Tailwind frontend running in a desktop container (Tauri/Electron) and a FastAPI/Celery backend. 

Reason:
Python (FastAPI) is ideal for AI/LLM integrations (LangChain, Celery) and interacting with local MCP servers. React Flow provides the best ecosystem for visual node editing. A clear separation ensures the UI remains responsive during long-running background tasks.

Consequences:
- Increased setup complexity with separate dependencies (npm vs pip).
- Requires a communication bridge (REST APIs or WebSockets) between UI and Backend.

---

## ADR-002: Local-First Focus

Status: Accepted

Date: 2026-08-19

Context:
To ensure privacy and reduce token costs, users need a way to run agentic workflows completely locally.

Decision:
The system will default to integrating with Ollama/vLLM for model inference and Local SQLite for fallback persistence if Supabase/PostgreSQL is unavailable.

Reason:
Ensures a zero-telemetry, zero-SaaS option out-of-the-box. 

Consequences:
- Workflows might run slower on weak hardware.
- The system must explicitly handle low-resource environments gracefully.

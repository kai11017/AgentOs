# Architecture

## High-Level Architecture

The system operates as a native desktop application orchestrating local models and services.

```text
Desktop UI (React/Tauri)
       ↓
API Layer (FastAPI)
       ↓
Execution Engine (Celery/LangChain)
       ↓
Tool/MCP Layer
       ↓
Local Services & OS
```

## Frontend Architecture
- The frontend is responsible strictly for state presentation, node graph interaction, and capturing user intent.
- It must communicate only with the API Layer.

## Backend Architecture
- The FastAPI application parses incoming workflows, manages database operations, and queues background tasks.
- Heavy lifting (LLM inference coordination, tool usage) is delegated to Celery workers.
- Redis manages the Celery task queue and caching.

## Data Flow & State
- **Database**: Stores workflow definitions, execution history, and configuration.
- **Queue**: Handles asynchronous task graphs to prevent UI blocking.

## Architectural Constraints

1. **No direct DB from UI**: The UI must not directly access the database or local filesystem; it must proxy through the FastAPI backend or Tauri commands (where absolutely necessary).
2. **Local-First Mandate**: The execution engine should default to local Ollama inference unless a user explicitly provides a remote API key.
3. **MCP Boundaries**: The MCP tool servers run as independent processes/servers and communicate with the Backend Engine via the Model Context Protocol standard over HTTP/stdio.

```text
UI
 ↓
API
 ↓
Service Layer / Celery Worker
 ↓
Database / Local LLM / MCP Server
```

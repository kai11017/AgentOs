# LocalFlow Agent 🌊

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Node](https://img.shields.io/badge/Node.js->=20-green)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![CI/CD](https://github.com/placeholder/localflow-agent/actions/workflows/build.yml/badge.svg)

**A local-first, privacy-focused visual workflow automation platform running natively on desktop environments.**  
LocalFlow Agent leverages local LLMs and the Model Context Protocol (MCP) to automate desktop tasks, system scripts, and API integrations—without the recurring costs of cloud LLMs.

---

## 🏗 System Architecture & Tech Stack

LocalFlow Agent is built with a modern, scalable, and modular architecture designed for local execution without compromising on developer experience.

### Frontend / Desktop UI
*   **Framework**: React (TypeScript)
*   **Workflow Canvas**: React Flow (`@xyflow/react`)
*   **Styling**: Tailwind CSS
*   **Desktop Packaging**: Tauri / Electron

### Backend & Orchestration
*   **API & Engine**: FastAPI / Python
*   **Task Execution**: Celery (Distributed Task Execution)
*   **Broker & Cache**: Redis

### Database & Storage
*   **Primary Database**: Supabase (PostgreSQL with `pgvector` for vector search)
*   **Fallback Storage**: Local SQLite (for fully disconnected setups)

### Local AI & Tooling
*   **Local LLM Runtime**: Ollama / vLLM
*   **Tooling Standard**: Model Context Protocol (MCP) clients and servers for local PC system tools
*   **Agent Execution**: LangChain, LlamaIndex, and custom multi-agent execution loops

### DevOps & Testing
*   **Containerization**: Docker & Docker Compose
*   **CI/CD**: GitHub Actions
*   **API Testing**: Postman Collections

---

## ✨ Core Features & Capabilities

*   **Visual Workflow Builder**: Intuitive drag-and-drop canvas powered by React Flow for designing complex automation pipelines.
*   **Native MCP Integration**: Connect seamlessly to the Model Context Protocol to control your filesystem, execute terminal commands, and automate browser tasks directly from the agent.
*   **100% Local Execution**: Fully offline inference mode using local LLMs. Your data never leaves your machine.
*   **Robust Asynchronous Queueing**: Handle long-running agent workflows smoothly with Celery and Redis.
*   **Multi-Agent Collaboration**: Specialized node execution environments for different roles (e.g., Coder, Executor, Reviewer) to break down complex tasks.

---

## 🗺 Project Roadmap (2-Month MVP Sprint)

<details>
<summary><b>Phase 1 (Weeks 1–2): Frontend Canvas & Node Schema</b></summary>

*   Initialize React frontend and setup Tailwind CSS.
*   Implement interactive React Flow canvas.
*   Define standard JSON schemas for nodes and edges.
*   Build custom node interfaces (Triggers, Actions, Logic).
*   Add workflow import/export functionality.
</details>

<details>
<summary><b>Phase 2 (Weeks 3–4): Backend Engine & Execution Runtime</b></summary>

*   Setup FastAPI backend architecture.
*   Implement workflow JSON parser and execution engine.
*   Integrate Redis and Celery for task graph execution.
*   Setup Supabase persistence layer (and SQLite fallback).
</details>

<details>
<summary><b>Phase 3 (Weeks 5–6): Local LLM & MCP Tooling</b></summary>

*   Integrate Ollama runtime for local model inference.
*   Build MCP client into the backend execution engine.
*   Develop essential MCP servers (Filesystem, Terminal, Browser).
*   Implement dynamic context management and memory for agents.
</details>

<details>
<summary><b>Phase 4 (Weeks 7–8): Desktop Packaging, CI/CD & Polish</b></summary>

*   Bundle the application using Tauri or Electron.
*   Finalize Docker Compose setup for easy onboarding.
*   Establish CI/CD pipelines via GitHub Actions.
*   Write Postman test suites and perform end-to-end testing.
</details>

---

## 🚀 Quickstart & Setup Guide

Get LocalFlow Agent / AgentOS running on your local machine in seconds.

### Prerequisites
*   [Node.js](https://nodejs.org/) (>= 20)
*   [Python](https://www.python.org/) (>= 3.11)
*   [Docker](https://www.docker.com/) (Optional: for local PostgreSQL 16 container, SQLite fallback is included)
*   [Ollama](https://ollama.ai/) (Optional: for 100% offline local model execution with `qwen3.5:4b` or `llama3`)

---

### ⚡ One-Click Startup (Recommended)

You can launch the entire ecosystem (PostgreSQL container, FastAPI backend, and Vite frontend) with a single command:

**On Windows (PowerShell):**
```powershell
.\start.ps1
```

**On Windows (Command Prompt / Double Click):**
```cmd
start.bat
```

The script will automatically:
1. Detect or start the PostgreSQL container (`agentos-postgres` on port 5433).
2. Activate your backend virtual environment and launch FastAPI on `http://127.0.0.1:8000`.
3. Launch the Vite React frontend on `http://localhost:5173`.
4. Open the visual workflow builder in your default web browser.

---

### Manual Step-by-Step Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kai11017/AgentOs.git
    cd AgentOs
    ```

2.  **Backend Environment Setup:**
    ```bash
    cd backend
    python -m venv .venv
    # Windows:
    .\.venv\Scripts\activate
    # Linux/macOS:
    source .venv/bin/activate

    pip install -r requirements.txt
    ```
    Create `backend/.env` with your desired configuration:
    ```env
    DATABASE_URL=postgresql+asyncpg://agentos:agentos_secret@localhost:5433/agentos
    OLLAMA_BASE_URL=http://127.0.0.1:11434
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

4.  **Running the Comprehensive Test Suite:**
    Verify all 12 platform architectural components:
    ```bash
    python backend/tests/run_tests.py
    ```

---

## 🧩 Architectural Highlights & Capabilities

*   **Hybrid Model Runtime**: Seamlessly switch between local models via Ollama (`qwen3.5:4b`, `llama3:8b`) and cloud LLMs (`gemini-3.5-flash`) directly inside agent node configurations.
*   **Autonomous Tool-Calling Loop**: Built-in ReAct reasoning loop (up to 5 autonomous turns) with live WebSocket streaming.
*   **Built-in Tools**: Safe math evaluation (`calculator`), web search (`web_search`), SSRF-safe URL scraping (`fetch_url`), sandboxed Python execution (`code_runner`), and cross-node persistent state (`agent_memory`).
*   **Model Context Protocol (MCP)**: Native JSON-RPC stdio client connecting external tools (Filesystem, Memory, GitHub).
*   **Context Window Manager**: Heuristic token budgeting, output truncation, and Anchor + Tail multi-turn turn compaction to prevent context overflow.
*   **External Webhook Ingress**: `/api/v1/triggers/webhook/{token}` supporting challenge verification and asynchronous execution triggers.
*   **Human-in-the-Loop Node**: Pause executions at review gates with real-time UI banners and operator approve/reject endpoints.
*   **Background Scheduler**: Built-in APScheduler for recurring cron and interval automations (`/api/v1/schedules`).
*   **Workflow Portability**: Export and import full graphs as `.agentflow.json` with collision-free ID remapping.

---

## 📁 Directory Structure

```text
localflow-agent/
├── .github/
│   └── workflows/          # CI/CD pipelines (GitHub Actions)
├── backend/
│   ├── app/                # FastAPI application code
│   ├── worker/             # Celery tasks and queue logic
│   ├── requirements.txt
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/     # React Flow canvas and custom nodes
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── package.json
│   └── tailwind.config.js
├── mcp_tools/
│   ├── filesystem/         # MCP server for local file ops
│   ├── terminal/           # MCP server for CLI execution
│   └── browser/            # MCP server for web automation
├── docker/
│   ├── docker-compose.yml  # Infrastructure (Redis, Postgres)
│   └── Dockerfile          # App containerization
├── .env.example            # Environment variables template
└── README.md               # You are here!
```

---

## 🤝 Contribution & Testing

We welcome contributions! Please follow these steps to ensure quality and consistency.

### Running Unit Tests
**Backend (Python):**
```bash
cd backend
pytest tests/
```
**Frontend (TypeScript):**
```bash
cd frontend
npm test
```

### API Testing via Postman
1. Open Postman.
2. Import the collection located at `docs/postman_collection.json`.
3. Set your environment variables in Postman (e.g., `base_url = http://localhost:8000`).
4. Run the suite to verify API endpoints.

### Linting Standards
Ensure your code meets our linting requirements before submitting a PR.
*   **Backend**: We use `flake8` and `black`. Run `black . && flake8 .`
*   **Frontend**: We use ESLint and Prettier. Run `npm run lint && npm run format`

---

*Built with ❤️ for the open-source automation community.*
# AgentOs

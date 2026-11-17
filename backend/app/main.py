import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.api.v1.router import api_router
from backend.app.models.workflow import WorkflowModel, WorkflowNodeModel, WorkflowEdgeModel
from backend.app.engine.scheduler.manager import global_scheduler_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("agentos.main")

async def seed_initial_demo_workflow():
    """Seeds the demo research workflow if the database is newly initialized."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(WorkflowModel).where(WorkflowModel.id == "demo-workflow-1"))
        if not result.scalar_one_or_none():
            logger.info("Seeding initial Demo Research Workflow into database...")
            demo_wf = WorkflowModel(
                id="demo-workflow-1",
                name="Research Workflow",
                description="Automate research and reporting",
                is_active=True,
                tags=["research", "active"],
            )
            session.add(demo_wf)
            await session.flush()

            nodes = [
                WorkflowNodeModel(
                    id="node-trigger-1",
                    workflow_id="demo-workflow-1",
                    label="Gmail Trigger",
                    definition_type="trigger",
                    position_x=180.0,
                    position_y=260.0,
                    config={"triggerType": "webhook", "note": "New email"},
                ),
                WorkflowNodeModel(
                    id="node-agent-1",
                    workflow_id="demo-workflow-1",
                    label="AI Agent",
                    definition_type="research-agent",
                    position_x=460.0,
                    position_y=260.0,
                    config={
                        "name": "Research",
                        "model": "qwen3.5:4b",
                        "instructions": "Summarize the incoming email, research the topic on the web, and return key insights with sources.",
                        "tools": ["web_search", "calculator", "fetch_url", "code_runner"],
                    },
                ),
                WorkflowNodeModel(
                    id="node-email-1",
                    workflow_id="demo-workflow-1",
                    label="Send Email",
                    definition_type="email-send",
                    position_x=740.0,
                    position_y=180.0,
                    config={"toEmail": "team@company.com", "subject": "Executive Brief: Q4 AI Strategy", "fromEmail": "rippika@gmail.com"},
                ),
                WorkflowNodeModel(
                    id="node-notion-1",
                    workflow_id="demo-workflow-1",
                    label="Save to Notion",
                    definition_type="database",
                    position_x=740.0,
                    position_y=340.0,
                    config={"service": "Notion", "operation": "Create Page in Database"},
                ),
                WorkflowNodeModel(
                    id="node-output-1",
                    workflow_id="demo-workflow-1",
                    label="Success",
                    definition_type="output",
                    position_x=1000.0,
                    position_y=260.0,
                    config={"outputType": "json"},
                ),
            ]
            for n in nodes:
                session.add(n)

            edges = [
                WorkflowEdgeModel(id="e-1-2", workflow_id="demo-workflow-1", source="node-trigger-1", target="node-agent-1"),
                WorkflowEdgeModel(id="e-2-3", workflow_id="demo-workflow-1", source="node-agent-1", target="node-email-1"),
                WorkflowEdgeModel(id="e-2-4", workflow_id="demo-workflow-1", source="node-agent-1", target="node-notion-1"),
                WorkflowEdgeModel(id="e-3-5", workflow_id="demo-workflow-1", source="node-email-1", target="node-output-1"),
                WorkflowEdgeModel(id="e-4-5", workflow_id="demo-workflow-1", source="node-notion-1", target="node-output-1"),
            ]
            for e in edges:
                session.add(e)

            await session.commit()
            logger.info("Demo workflow seeded successfully.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables & seed demo workflow
    await init_db()
    await seed_initial_demo_workflow()
    global_scheduler_manager.start()
    try:
        await global_scheduler_manager.sync_all_workflows()
    except Exception as e:
        logger.warning(f"Initial schedule sync warning: {e}")
    logger.info("AgentOS Backend started successfully.")
    yield
    # Shutdown
    global_scheduler_manager.shutdown()
    logger.info("AgentOS Backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Strict CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Also expose WebSocket endpoint at root path for universal client compatibility
from backend.app.api.v1.websockets import router as websockets_root_router
app.include_router(websockets_root_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)


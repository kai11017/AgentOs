from fastapi import APIRouter
from backend.app.api.v1.workflows import router as workflows_router
from backend.app.api.v1.executions import router as executions_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.websockets import router as websockets_router
from backend.app.api.v1.mcp import router as mcp_router
from backend.app.api.v1.triggers import router as triggers_router
from backend.app.api.v1.schedules import router as schedules_router
from backend.app.api.v1.credentials import router as credentials_router
from backend.app.api.v1.templates import router as templates_router
from backend.app.api.v1.knowledge import router as knowledge_router

api_router = APIRouter()
api_router.include_router(workflows_router)
api_router.include_router(executions_router)
api_router.include_router(models_router)
api_router.include_router(websockets_router)
api_router.include_router(mcp_router)
api_router.include_router(triggers_router)
api_router.include_router(schedules_router)
api_router.include_router(credentials_router)
api_router.include_router(templates_router)
api_router.include_router(knowledge_router)





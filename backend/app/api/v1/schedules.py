from fastapi import APIRouter
from backend.app.engine.scheduler.manager import global_scheduler_manager

router = APIRouter(prefix="/schedules", tags=["Cron & Schedule Triggers"])

@router.get("")
async def list_scheduled_jobs():
    """Lists all active background scheduled jobs and their upcoming run times."""
    return {"jobs": global_scheduler_manager.list_jobs()}

@router.post("/sync")
async def sync_scheduled_jobs():
    """Scans the database and synchronizes all active schedule trigger nodes with the background scheduler."""
    synced = await global_scheduler_manager.sync_all_workflows()
    return {
        "success": True,
        "syncedCount": len(synced),
        "jobs": synced,
        "message": f"Successfully synced {len(synced)} scheduled workflow triggers.",
    }

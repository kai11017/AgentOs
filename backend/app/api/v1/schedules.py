from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models.workflow import WorkflowModel
from backend.app.engine.scheduler.manager import global_scheduler_manager

router = APIRouter(prefix="/schedules", tags=["Cron & Schedule Triggers"])

class ToggleScheduleRequest(BaseModel):
    is_active: Optional[bool] = None

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

@router.post("/{workflow_id}/toggle")
async def toggle_workflow_schedule(
    workflow_id: str,
    payload: Optional[ToggleScheduleRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Enables or disables automatic scheduled execution for a workflow."""
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if payload and payload.is_active is not None:
        wf.is_active = payload.is_active
    else:
        wf.is_active = not wf.is_active

    await db.commit()
    await db.refresh(wf)

    # Resync scheduler to update active background crons
    synced = await global_scheduler_manager.sync_all_workflows()

    return {
        "success": True,
        "workflowId": wf.id,
        "isActive": wf.is_active,
        "message": f"Workflow schedule {'activated' if wf.is_active else 'deactivated'}.",
        "activeJobs": synced,
    }

@router.post("/{workflow_id}/run-now")
async def run_scheduled_workflow_now(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Triggers an immediate background execution of a scheduled workflow."""
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Invoke background run
    import asyncio
    asyncio.create_task(global_scheduler_manager._trigger_workflow_execution(workflow_id))

    return {
        "success": True,
        "workflowId": wf.id,
        "message": f"Immediate execution dispatched for workflow '{wf.name}'.",
    }

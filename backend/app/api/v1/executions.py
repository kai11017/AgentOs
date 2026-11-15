import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.models.workflow import WorkflowModel
from backend.app.models.execution import ExecutionModel, ExecutionLogModel
from backend.app.schemas.execution import (
    ExecutionResponse,
    ExecutionLogResponse,
    ExecuteWorkflowRequest,
    NodeExecutionResult,
)
from backend.app.engine.executor import WorkflowExecutor
from backend.app.engine.handlers.approval import PENDING_APPROVAL_FUTURES, PENDING_APPROVAL_METADATA
from backend.app.api.v1.websockets import broadcast_execution_event

router = APIRouter(tags=["Executions"])

# Track running tasks and cancellation tokens in memory
ACTIVE_CANCELLATION_TOKENS: Dict[str, asyncio.Event] = {}

def execution_to_schema(ex: ExecutionModel) -> ExecutionResponse:
    node_results = {
        nid: NodeExecutionResult(
            status=res.get("status", "completed"),
            output=res.get("output"),
            durationMs=res.get("durationMs", 0),
            error=res.get("error"),
        )
        for nid, res in (ex.node_results or {}).items()
    }
    return ExecutionResponse(
        id=ex.id,
        workflowId=ex.workflow_id,
        status=ex.status,
        durationMs=ex.duration_ms,
        startedAt=ex.started_at.isoformat() if ex.started_at else datetime.now(timezone.utc).isoformat(),
        completedAt=ex.completed_at.isoformat() if ex.completed_at else None,
        nodeResults=node_results,
    )

async def run_executor_background(workflow_dict: dict, execution_id: str, cancel_token: asyncio.Event):
    """Runs DAG executor in background with dedicated database session."""
    async with AsyncSessionLocal() as session:
        try:
            executor = WorkflowExecutor(
                workflow=workflow_dict,
                execution_id=execution_id,
                db_session=session,
                event_callback=lambda evt: broadcast_execution_event(execution_id, evt),
                cancellation_token=cancel_token,
            )
            await executor.run()
        except Exception as e:
            pass
        finally:
            ACTIVE_CANCELLATION_TOKENS.pop(execution_id, None)

@router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse)
async def execute_workflow(
    workflow_id: str,
    req: ExecuteWorkflowRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    exec_id = f"exec-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    # Initial checkpoint in DB
    execution = ExecutionModel(
        id=exec_id,
        workflow_id=workflow_id,
        status="running",
        duration_ms=0,
        started_at=now,
        node_results={},
    )
    db.add(execution)
    await db.commit()

    # Convert workflow model to dictionary for the executor
    workflow_dict = {
        "id": wf.id,
        "name": wf.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.definition_type,
                "data": {
                    "label": n.label,
                    "definitionType": n.definition_type,
                    "config": n.config or {},
                },
            }
            for n in (wf.nodes or [])
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "sourceHandle": e.source_handle,
                "targetHandle": e.target_handle,
            }
            for e in (wf.edges or [])
        ],
    }

    cancel_token = asyncio.Event()
    ACTIVE_CANCELLATION_TOKENS[exec_id] = cancel_token

    # Launch background executor
    background_tasks.add_task(run_executor_background, workflow_dict, exec_id, cancel_token)

    return execution_to_schema(execution)

@router.post("/executions/{execution_id}/stop")
async def stop_execution(execution_id: str, db: AsyncSession = Depends(get_db)):
    cancel_token = ACTIVE_CANCELLATION_TOKENS.get(execution_id)
    if cancel_token:
        cancel_token.set()

    result = await db.execute(select(ExecutionModel).where(ExecutionModel.id == execution_id))
    ex = result.scalar_one_or_none()
    if ex and ex.status == "running":
        ex.status = "cancelled"
        ex.completed_at = datetime.now(timezone.utc)
        await db.commit()

    return {"success": True}

@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExecutionModel).where(ExecutionModel.id == execution_id))
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution_to_schema(ex)

@router.get("/workflows/{workflow_id}/executions", response_model=List[ExecutionResponse])
async def list_workflow_executions(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExecutionModel).where(ExecutionModel.workflow_id == workflow_id).order_by(ExecutionModel.started_at.desc())
    )
    executions = result.scalars().all()
    return [execution_to_schema(ex) for ex in executions]

@router.get("/executions/{execution_id}/logs", response_model=List[ExecutionLogResponse])
async def get_execution_logs(execution_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExecutionLogModel).where(ExecutionLogModel.execution_id == execution_id).order_by(ExecutionLogModel.seq.asc())
    )
    logs = result.scalars().all()
    return [
        ExecutionLogResponse(
            id=log.id,
            executionId=log.execution_id,
            seq=log.seq,
            nodeId=log.node_id,
            level=log.level,
            message=log.message,
            timestamp=log.timestamp.isoformat() if log.timestamp else datetime.now(timezone.utc).isoformat(),
            payload=log.payload,
        )
        for log in logs
    ]

# ─── Human in the Loop (Approval / Rejection) ────────────────────────────────

class ApprovalDecisionRequest(BaseModel):
    comment: Optional[str] = Field(None, description="Optional operator comment or feedback")
    modifiedData: Optional[Dict[str, Any]] = Field(None, description="Optional modified data overriding upstream payload")

class RejectionDecisionRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for rejecting execution")

@router.get("/executions/{execution_id}/approval")
async def get_approval_status(execution_id: str):
    """Returns whether this execution is currently paused waiting for human review."""
    metadata = PENDING_APPROVAL_METADATA.get(execution_id)
    if not metadata:
        return {"waiting": False}
    return {"waiting": True, "details": metadata}

@router.post("/executions/{execution_id}/approve")
async def approve_execution(execution_id: str, req: ApprovalDecisionRequest):
    """Authorizes a paused execution, unblocking the Approval node to proceed."""
    future = PENDING_APPROVAL_FUTURES.get(execution_id)
    if not future or future.done():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution is not currently paused waiting for approval.",
        )
    future.set_result({
        "approved": True,
        "comment": req.comment or "",
        "modifiedData": req.modifiedData,
    })
    return {"success": True, "message": "Execution authorized. Resuming workflow."}

@router.post("/executions/{execution_id}/reject")
async def reject_execution(execution_id: str, req: RejectionDecisionRequest):
    """Rejects a paused execution, safely terminating downstream actions."""
    future = PENDING_APPROVAL_FUTURES.get(execution_id)
    if not future or future.done():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution is not currently paused waiting for approval.",
        )
    future.set_result({
        "approved": False,
        "reason": req.reason or "Rejected by operator.",
    })
    return {"success": True, "message": "Execution rejected and halted."}


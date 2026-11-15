import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.models.workflow import WorkflowModel, WorkflowNodeModel
from backend.app.models.execution import ExecutionModel
from backend.app.api.v1.executions import run_executor_background, ACTIVE_CANCELLATION_TOKENS
import asyncio

logger = logging.getLogger("agentos.triggers.webhook")
router = APIRouter(prefix="/triggers", tags=["Triggers & Webhooks"])

@router.get("/webhook/{webhook_token}")
async def handle_webhook_challenge(webhook_token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles webhook handshake / verification challenges (e.g. Slack URL verification, Facebook/Meta webhook verify).
    """
    challenge = request.query_params.get("challenge") or request.query_params.get("hub.challenge")
    if challenge:
        return challenge

    # Check if workflow exists for this token
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == webhook_token))
    wf = result.scalar_one_or_none()
    return {
        "status": "listening",
        "webhookToken": webhook_token,
        "workflowFound": wf is not None,
        "workflowName": wf.name if wf else None,
    }

@router.post("/webhook/{webhook_token}")
async def handle_webhook_ingress(
    webhook_token: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Industry-grade Webhook Ingress:
    Accepts external webhook POST requests (GitHub, Stripe, Slack, curl, Typeform)
    and executes matching workflow asynchronously.
    """
    # 1. Locate Workflow by ID or Node config token
    target_wf = None
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == webhook_token))
    target_wf = result.scalar_one_or_none()

    if not target_wf:
        # Search workflow nodes for matching webhookToken
        nodes_result = await db.execute(select(WorkflowNodeModel))
        all_nodes = nodes_result.scalars().all()
        for node in all_nodes:
            cfg = node.config or {}
            if cfg.get("webhookToken") == webhook_token or cfg.get("path") == webhook_token:
                wf_result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == node.workflow_id))
                target_wf = wf_result.scalar_one_or_none()
                if target_wf:
                    break

    # If still not found, search first active workflow as default receiver
    if not target_wf:
        active_wf_res = await db.execute(select(WorkflowModel).where(WorkflowModel.is_active == True))
        target_wf = active_wf_res.scalars().first()

    if not target_wf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active workflow found matching webhook token '{webhook_token}'.",
        )

    # 2. Parse payload safely (JSON, form, or text)
    content_type = request.headers.get("content-type", "").lower()
    body_data: Any = {}
    try:
        if "application/json" in content_type:
            body_data = await request.json()
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            body_data = dict(form)
        else:
            raw_text = (await request.body()).decode("utf-8", errors="replace")
            try:
                body_data = json.loads(raw_text)
            except Exception:
                body_data = {"raw": raw_text}
    except Exception as e:
        logger.warning(f"Error parsing webhook body: {e}")
        body_data = {"error": f"Failed to parse body: {str(e)}"}

    # 3. Create initial trigger payload for workflow DAG
    trigger_payload = {
        "body": body_data,
        "headers": {k: v for k, v in request.headers.items() if not k.lower().startswith("authorization")},
        "query": dict(request.query_params),
        "webhookToken": webhook_token,
        "source": "webhook",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # 4. Initialize Execution record
    exec_id = f"exec-wh-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    execution = ExecutionModel(
        id=exec_id,
        workflow_id=target_wf.id,
        status="running",
        duration_ms=0,
        started_at=now,
        node_results={
            # Seed the trigger node with the incoming webhook data
            "trigger": {
                "status": "completed",
                "output": trigger_payload,
                "durationMs": 1,
            }
        },
    )
    db.add(execution)
    await db.commit()

    # 5. Build workflow dict and launch execution in background
    nodes_res = await db.execute(select(WorkflowNodeModel).where(WorkflowNodeModel.workflow_id == target_wf.id))
    nodes = nodes_res.scalars().all()
    from backend.app.models.workflow import WorkflowEdgeModel
    edges_res = await db.execute(select(WorkflowEdgeModel).where(WorkflowEdgeModel.workflow_id == target_wf.id))
    edges = edges_res.scalars().all()

    workflow_dict = {
        "id": target_wf.id,
        "name": target_wf.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.definition_type,
                "data": {
                    "label": n.label,
                    "definitionType": n.definition_type,
                    "config": {
                        **(n.config or {}),
                        # If this is the trigger node, provide the webhook payload
                        **({"inputData": trigger_payload} if "trigger" in n.definition_type else {})
                    },
                },
            }
            for n in nodes
        ],
        "edges": [
            {"id": e.id, "source": e.source, "target": e.target}
            for e in edges
        ],
    }

    cancel_token = asyncio.Event()
    ACTIVE_CANCELLATION_TOKENS[exec_id] = cancel_token
    background_tasks.add_task(run_executor_background, workflow_dict, exec_id, cancel_token)

    return {
        "success": True,
        "executionId": exec_id,
        "workflowId": target_wf.id,
        "workflowName": target_wf.name,
        "status": "running",
        "message": f"Webhook ingress accepted. Workflow '{target_wf.name}' launched in background.",
    }

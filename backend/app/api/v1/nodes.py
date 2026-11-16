import asyncio
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.engine.executor import HANDLERS
from backend.app.engine.handlers.output import OutputNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator
from backend.app.api.v1.credentials import resolve_credential

logger = logging.getLogger("agentos.api.nodes")

router = APIRouter(prefix="/nodes", tags=["Nodes & Step Execution"])

class TestNodeStepRequest(BaseModel):
    node_id: str = Field(default_factory=lambda: f"test-node-{uuid.uuid4().hex[:6]}")
    node_type: str
    label: Optional[str] = "Step Runner"
    config: Dict[str, Any] = Field(default_factory=dict)
    input_data: Dict[str, Any] = Field(default_factory=dict)
    upstream_nodes: Dict[str, Any] = Field(default_factory=dict)

class StepLogItem(BaseModel):
    timestamp: str
    level: str
    message: str

class TestNodeStepResponse(BaseModel):
    status: str
    duration_ms: float
    output: Any
    logs: List[StepLogItem]
    error: Optional[str] = None

class EvaluateExpressionRequest(BaseModel):
    expression: str
    context: Dict[str, Any] = Field(default_factory=dict)

class EvaluateExpressionResponse(BaseModel):
    success: bool
    result: Any
    type: str
    preview: str
    error: Optional[str] = None


@router.post("/test", response_model=TestNodeStepResponse, status_code=status.HTTP_200_OK)
async def test_node_step(
    payload: TestNodeStepRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Executes an isolated single workflow node in step-test mode.
    Allows developers to verify inputs, configurations, expressions, and tools in isolation
    with live timing and structured execution logs.
    """
    logs: List[StepLogItem] = []

    async def emit_step_log(message: str, level: str = "info"):
        logs.append(
            StepLogItem(
                timestamp=datetime.now(timezone.utc).isoformat(),
                level=level,
                message=message,
            )
        )

    await emit_step_log(f"Initializing step test for node '{payload.label}' ({payload.node_type})...", "info")
    start_time = time.perf_counter()

    # Construct execution context
    context = {
        "$json": payload.input_data,
        "$prev": payload.input_data,
        "$nodes": payload.upstream_nodes,
        "execution_id": f"step-test-{uuid.uuid4().hex[:8]}",
        "emit_log": emit_step_log,
        "get_credential": lambda cred_name: resolve_credential(cred_name, db),
    }

    # Resolve dynamic expressions in configuration
    resolved_config = ExpressionEvaluator.resolve_config(payload.config, context)

    node_def = {
        "id": payload.node_id,
        "type": payload.node_type,
        "data": {
            "label": payload.label,
            "definitionType": payload.node_type,
            "config": resolved_config,
        },
    }

    # Locate handler
    handler = HANDLERS.get(payload.node_type)
    if not handler:
        # Check prefix match (e.g. custom agents)
        if "agent" in payload.node_type:
            handler = HANDLERS.get("custom-agent")
        elif "tool" in payload.node_type or "code" in payload.node_type:
            handler = HANDLERS.get("python-execution")
        else:
            handler = OutputNodeHandler()

    try:
        output = await handler.execute(node_def, context)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        await emit_step_log(f"Step test completed successfully in {duration_ms}ms.", "info")

        return TestNodeStepResponse(
            status="success",
            duration_ms=duration_ms,
            output=output,
            logs=logs,
            error=None,
        )

    except Exception as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        err_msg = str(e)
        logger.warning(f"Step test failed for node '{payload.node_id}': {err_msg}", exc_info=True)
        await emit_step_log(f"Step execution encountered exception: {err_msg}", "error")

        return TestNodeStepResponse(
            status="error",
            duration_ms=duration_ms,
            output=None,
            logs=logs,
            error=err_msg,
        )


@router.post("/evaluate-expression", response_model=EvaluateExpressionResponse, status_code=status.HTTP_200_OK)
async def evaluate_expression(
    payload: EvaluateExpressionRequest,
):
    """
    Evaluates a dynamic {{ ... }} template or bare expression against context in real time.
    Supplies the visual Expression Builder with type inspection and evaluated preview.
    """
    eval_result = ExpressionEvaluator.evaluate_live(payload.expression, payload.context)
    return EvaluateExpressionResponse(**eval_result)

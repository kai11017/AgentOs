import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.approval")

# Global in-memory dictionary of pending approval futures: { execution_id: asyncio.Future }
PENDING_APPROVAL_FUTURES: Dict[str, asyncio.Future] = {}
PENDING_APPROVAL_METADATA: Dict[str, Dict[str, Any]] = {}

class ApprovalNodeHandler(BaseNodeHandler):
    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        raw_config = node.get("data", {}).get("config", {})
        config = ExpressionEvaluator.resolve_config(raw_config, context)
        
        node_id = node.get("id", "approval-node")
        node_label = node.get("data", {}).get("label") or "Human Approval"
        instructions = config.get("instructions") or "Please review workflow output and authorize execution."
        timeout_seconds = int(config.get("timeoutSeconds", 3600))

        execution_id = context.get("execution_id") or "standalone"
        emit_log = context.get("emit_log")

        async def log(msg: str, level: str = "info"):
            if emit_log:
                try:
                    await emit_log(msg, level=level)
                except Exception:
                    pass

        # Check if pre-approved in context
        approval_ctx = context.get("$approval")
        if approval_ctx and approval_ctx.get("approved"):
            await log(f"[Human Approval] Node '{node_label}' previously authorized.", level="info")
            return {
                "status": "completed",
                "approved": True,
                "comment": approval_ctx.get("comment", ""),
                "decidedAt": datetime.now(timezone.utc).isoformat(),
            }

        # Upstream context to review
        input_data = context.get("$json", {})
        await log(
            f"[Human Approval] ⏸️ Execution paused at '{node_label}'. Waiting for operator approval.",
            level="warn",
        )

        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()
        PENDING_APPROVAL_FUTURES[execution_id] = future
        PENDING_APPROVAL_METADATA[execution_id] = {
            "nodeId": node_id,
            "nodeLabel": node_label,
            "instructions": instructions,
            "inputData": input_data,
            "requestedAt": datetime.now(timezone.utc).isoformat(),
        }

        try:
            # Await user interaction via /api/v1/executions/{execution_id}/approve or reject
            decision: Dict[str, Any] = await asyncio.wait_for(future, timeout=timeout_seconds)
            
            approved = decision.get("approved", False)
            comment = decision.get("comment", "")
            modified_data = decision.get("modifiedData")

            if approved:
                await log(f"[Human Approval] ✅ Operator approved: '{comment or 'No comment'}'. Resuming workflow.", level="info")
                return {
                    "status": "completed",
                    "approved": True,
                    "comment": comment,
                    "modifiedData": modified_data,
                    "decidedAt": datetime.now(timezone.utc).isoformat(),
                }
            else:
                reason = decision.get("reason", "Operator rejected execution.")
                await log(f"[Human Approval] 🛑 Operator rejected execution: {reason}", level="error")
                raise RuntimeError(f"Workflow halted: {reason}")

        except asyncio.TimeoutError:
            await log(f"[Human Approval] ⏱️ Approval timed out after {timeout_seconds}s. Halting workflow.", level="error")
            raise TimeoutError(f"Human approval timed out after {timeout_seconds}s.")
        finally:
            PENDING_APPROVAL_FUTURES.pop(execution_id, None)
            PENDING_APPROVAL_METADATA.pop(execution_id, None)

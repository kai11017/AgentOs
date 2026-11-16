import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, Any, Callable, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.engine.dag import WorkflowDAG
from backend.app.engine.handlers.trigger import TriggerNodeHandler
from backend.app.engine.handlers.agent import AgentNodeHandler
from backend.app.engine.handlers.http import HTTPNodeHandler
from backend.app.engine.handlers.database import DatabaseNodeHandler
from backend.app.engine.handlers.output import OutputNodeHandler
from backend.app.engine.handlers.approval import ApprovalNodeHandler
from backend.app.engine.handlers.knowledge import KnowledgeNodeHandler
from backend.app.engine.handlers.code import CodeNodeHandler
from backend.app.engine.handlers.transform import TransformNodeHandler
from backend.app.models.execution import ExecutionModel, ExecutionLogModel
from backend.app.api.v1.credentials import resolve_credential

# Handler Dispatch Registry
HANDLERS = {
    "trigger": TriggerNodeHandler(),
    "research-agent": AgentNodeHandler(),
    "coding-agent": AgentNodeHandler(),
    "planning-agent": AgentNodeHandler(),
    "execution-agent": AgentNodeHandler(),
    "custom-agent": AgentNodeHandler(),
    "reviewer-agent": AgentNodeHandler(),
    "http-request": HTTPNodeHandler(),
    "database": DatabaseNodeHandler(),
    "output": OutputNodeHandler(),
    "approval": ApprovalNodeHandler(),
    "human-approval": ApprovalNodeHandler(),
    "manual-review": ApprovalNodeHandler(),
    "document-rag": KnowledgeNodeHandler(),
    "vector-search": KnowledgeNodeHandler(),
    "knowledge": KnowledgeNodeHandler(),
    "knowledge-base": KnowledgeNodeHandler(),
    "doc-reference": KnowledgeNodeHandler(),
    "python-execution": CodeNodeHandler(),
    "javascript-skill": CodeNodeHandler(),
    "code-runner": CodeNodeHandler(),
    "transform": TransformNodeHandler(),
    "variable": TransformNodeHandler(),
    "input": TransformNodeHandler(),
    "merge": TransformNodeHandler(),
}

class WorkflowExecutor:
    def __init__(
        self,
        workflow: Dict[str, Any],
        execution_id: str,
        db_session: AsyncSession,
        event_callback: Optional[Callable[[Dict[str, Any]], Any]] = None,
        cancellation_token: Optional[asyncio.Event] = None,
    ):
        self.workflow = workflow
        self.execution_id = execution_id
        self.db = db_session
        self.on_event = event_callback
        self.cancel_token = cancellation_token or asyncio.Event()
        
        # Concurrency guard to protect local GPU VRAM
        self.vram_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_INFERENCES)
        # Lock to serialize database transactions across parallel DAG branches
        self.db_lock = asyncio.Lock()
        
        # In-memory execution state map { [nodeId]: output_dict }
        self.node_outputs: Dict[str, Any] = {}
        self.node_results: Dict[str, Any] = {}
        self.seq_counter = 0

    async def emit_log(self, message: str, level: str = "info", node_id: Optional[str] = None):
        """Persists a structured log and emits it over the resumable event stream."""
        now_iso = datetime.now(timezone.utc).isoformat()
        
        async with self.db_lock:
            self.seq_counter += 1
            log_entry = ExecutionLogModel(
                id=f"log-{self.execution_id}-{self.seq_counter}",
                execution_id=self.execution_id,
                seq=self.seq_counter,
                node_id=node_id,
                level=level,
                message=message,
                timestamp=datetime.now(timezone.utc),
            )
            self.db.add(log_entry)
            await self.db.commit()

        if self.on_event:
            event_payload = {
                "seq": self.seq_counter,
                "executionId": self.execution_id,
                "nodeId": node_id,
                "level": level,
                "message": message,
                "timestamp": now_iso,
            }
            if asyncio.iscoroutinefunction(self.on_event):
                await self.on_event(event_payload)
            else:
                self.on_event(event_payload)

    async def execute_node(self, node: Dict[str, Any], dag: WorkflowDAG) -> Dict[str, Any]:
        node_id = node["id"]
        node_type = node.get("data", {}).get("definitionType") or node.get("type", "default")
        label = node.get("data", {}).get("label") or node_id

        # Check for user cancellation
        if self.cancel_token.is_set():
            raise asyncio.CancelledError(f"Execution cancelled before executing node: {label}")

        # Assemble merge semantics & upstream context
        parent_ids = dag.get_parent_ids(node_id)
        parent_outputs = [self.node_outputs[pid] for pid in parent_ids if pid in self.node_outputs]
        
        # Merge all parent outputs into $json
        merged_input: Dict[str, Any] = {}
        for po in parent_outputs:
            if isinstance(po, dict):
                merged_input.update(po)

        prev_output = parent_outputs[-1] if parent_outputs else {}
        context = {
            "$json": merged_input,
            "$prev": prev_output,
            "$nodes": self.node_outputs,
            "execution_id": self.execution_id,
            "emit_log": lambda msg, level="info": self.emit_log(msg, level=level, node_id=node_id),
            "get_credential": lambda cred_name: resolve_credential(cred_name, self.db),
        }

        # Dispatch handler
        handler = HANDLERS.get(node_type, OutputNodeHandler())
        
        # Emit node running event
        await self.emit_log(f"Starting node: {label}", level="info", node_id=node_id)
        start_time = time.time()

        # If agent node, acquire VRAM concurrency semaphore
        is_agent = "agent" in node_type
        if is_agent:
            await self.vram_semaphore.acquire()

        try:
            output = await handler.execute(node, context)
            duration_ms = int((time.time() - start_time) * 1000)

            # Checkpoint node completion in memory and DB
            self.node_outputs[node_id] = output
            self.node_results[node_id] = {
                "status": "completed",
                "output": output,
                "durationMs": duration_ms,
            }
            
            await self.emit_log(
                f"Completed node: {label} ({duration_ms}ms)",
                level="info",
                node_id=node_id,
            )
            return output
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.node_results[node_id] = {
                "status": "failed",
                "error": str(e),
                "durationMs": duration_ms,
            }
            await self.emit_log(f"Failed node: {label} - {str(e)}", level="error", node_id=node_id)
            raise
        finally:
            if is_agent:
                self.vram_semaphore.release()

    async def run(self) -> Dict[str, Any]:
        nodes = self.workflow.get("nodes", [])
        edges = self.workflow.get("edges", [])
        
        start_time = time.time()
        await self.emit_log(f"Workflow '{self.workflow.get('name', 'Untitled')}' started", level="info")

        dag = WorkflowDAG(nodes, edges)
        tiers = dag.validate_and_sort()
        node_lookup = {n["id"]: n for n in nodes}

        try:
            # Execute wave-by-wave (nodes in each tier run in parallel!)
            for tier in tiers:
                tasks = [self.execute_node(node_lookup[nid], dag) for nid in tier]
                await asyncio.gather(*tasks)

            total_duration = int((time.time() - start_time) * 1000)
            await self.emit_log(f"Workflow completed successfully in {total_duration / 1000:.2f}s", level="info")
            
            # Final database checkpoint
            async with self.db_lock:
                result = await self.db.execute(select(ExecutionModel).where(ExecutionModel.id == self.execution_id))
                exec_row = result.scalar_one_or_none()
                if exec_row:
                    exec_row.status = "completed"
                    exec_row.duration_ms = total_duration
                    exec_row.completed_at = datetime.now(timezone.utc)
                    exec_row.node_results = self.node_results
                    await self.db.commit()

            return {
                "status": "completed",
                "durationMs": total_duration,
                "nodeResults": self.node_results,
            }

        except (asyncio.CancelledError, Exception) as e:
            total_duration = int((time.time() - start_time) * 1000)
            status = "cancelled" if isinstance(e, asyncio.CancelledError) else "failed"
            await self.emit_log(f"Workflow {status}: {str(e)}", level="error")

            async with self.db_lock:
                result = await self.db.execute(select(ExecutionModel).where(ExecutionModel.id == self.execution_id))
                exec_row = result.scalar_one_or_none()
                if exec_row:
                    exec_row.status = status
                    exec_row.duration_ms = total_duration
                    exec_row.completed_at = datetime.now(timezone.utc)
                    exec_row.node_results = self.node_results
                    await self.db.commit()

            raise


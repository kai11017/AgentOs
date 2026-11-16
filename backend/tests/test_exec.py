import asyncio
import json
import uuid
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath("."))

from backend.app.core.database import AsyncSessionLocal
from backend.app.api.v1.workflows import get_workflow
from backend.app.models.execution import ExecutionModel
from backend.app.engine.executor import WorkflowExecutor

async def run_test():
    async with AsyncSessionLocal() as session:
        wf = await get_workflow('demo-workflow-1', session)
        wf_dict = wf.model_dump()
        exec_id = f'test-exec-{uuid.uuid4().hex[:6]}'
        
        # Insert execution record
        db_exec = ExecutionModel(
            id=exec_id,
            workflow_id=wf.id,
            status="running",
            duration_ms=0,
            started_at=datetime.now(timezone.utc),
            node_results={},
        )
        session.add(db_exec)
        await session.commit()

        async def on_event(evt):
            t = evt.get("type")
            nid = evt.get("nodeId", "")
            msg = evt.get("message") or evt.get("status") or ""
            print(f"EVENT [{t}] {nid}: {msg}")

        executor = WorkflowExecutor(
            workflow=wf_dict,
            execution_id=exec_id,
            db_session=session,
            event_callback=on_event,
            cancellation_token=asyncio.Event(),
        )
        print("Starting executor.run()...")
        await executor.run()
        print("Executor run finished!")

if __name__ == "__main__":
    asyncio.run(run_test())

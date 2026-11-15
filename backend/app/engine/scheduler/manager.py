import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.workflow import WorkflowModel, WorkflowNodeModel, WorkflowEdgeModel
from backend.app.models.execution import ExecutionModel
from backend.app.api.v1.executions import run_executor_background, ACTIVE_CANCELLATION_TOKENS

logger = logging.getLogger("agentos.scheduler")

class WorkflowSchedulerManager:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._is_running = False

    def start(self):
        if not self._is_running:
            self.scheduler.start()
            self._is_running = True
            logger.info("AgentOS Workflow Background Scheduler started.")

    def shutdown(self):
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("AgentOS Workflow Background Scheduler stopped.")

    async def sync_all_workflows(self) -> List[Dict[str, Any]]:
        """Scans database for active workflows containing schedule trigger nodes and schedules them."""
        # Clear existing dynamic jobs
        for job in self.scheduler.get_jobs():
            if job.id.startswith("wf-schedule-"):
                self.scheduler.remove_job(job.id)

        synced_jobs = []
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(WorkflowModel).where(WorkflowModel.is_active == True))
            active_workflows = result.scalars().all()

            for wf in active_workflows:
                nodes_res = await db.execute(select(WorkflowNodeModel).where(WorkflowNodeModel.workflow_id == wf.id))
                nodes = nodes_res.scalars().all()

                for n in nodes:
                    def_type = (n.definition_type or "").lower()
                    if any(k in def_type for k in ["schedule", "cron", "interval", "timer"]):
                        cfg = n.config or {}
                        job_id = f"wf-schedule-{wf.id}-{n.id}"

                        # Determine trigger: cron vs interval
                        cron_expr = cfg.get("cronExpression") or cfg.get("cron")
                        interval_minutes = cfg.get("intervalMinutes") or cfg.get("everyMinutes")

                        if cron_expr:
                            parts = cron_expr.strip().split()
                            if len(parts) == 5:
                                trigger = CronTrigger(
                                    minute=parts[0],
                                    hour=parts[1],
                                    day=parts[2],
                                    month=parts[3],
                                    day_of_week=parts[4],
                                )
                            else:
                                trigger = IntervalTrigger(hours=24)
                        elif interval_minutes:
                            trigger = IntervalTrigger(minutes=int(interval_minutes))
                        else:
                            # Default: 1 hour interval
                            interval_hours = int(cfg.get("intervalHours", 1))
                            trigger = IntervalTrigger(hours=interval_hours)

                        self.scheduler.add_job(
                            self._trigger_workflow_execution,
                            trigger=trigger,
                            id=job_id,
                            args=[wf.id],
                            replace_existing=True,
                        )

                        synced_jobs.append({
                            "jobId": job_id,
                            "workflowId": wf.id,
                            "workflowName": wf.name,
                            "trigger": str(trigger),
                        })
                        logger.info(f"Registered scheduled job '{job_id}' for workflow '{wf.name}'")

        return synced_jobs

    async def _trigger_workflow_execution(self, workflow_id: str):
        """Callback fired by APScheduler when schedule trigger elapses."""
        logger.info(f"[Scheduler] Firing scheduled run for workflow '{workflow_id}'...")
        async with AsyncSessionLocal() as db:
            wf_res = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
            wf = wf_res.scalar_one_or_none()
            if not wf or not wf.is_active:
                return

            exec_id = f"exec-sched-{uuid.uuid4().hex[:10]}"
            now = datetime.now(timezone.utc)
            execution = ExecutionModel(
                id=exec_id,
                workflow_id=wf.id,
                status="running",
                duration_ms=0,
                started_at=now,
                node_results={
                    "trigger": {
                        "status": "completed",
                        "output": {
                            "source": "scheduler",
                            "scheduledTime": now.isoformat(),
                        },
                        "durationMs": 1,
                    }
                },
            )
            db.add(execution)
            await db.commit()

            nodes_res = await db.execute(select(WorkflowNodeModel).where(WorkflowNodeModel.workflow_id == wf.id))
            nodes = nodes_res.scalars().all()
            edges_res = await db.execute(select(WorkflowEdgeModel).where(WorkflowEdgeModel.workflow_id == wf.id))
            edges = edges_res.scalars().all()

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
                    for n in nodes
                ],
                "edges": [{"id": e.id, "source": e.source, "target": e.target} for e in edges],
            }

            cancel_token = asyncio.Event()
            ACTIVE_CANCELLATION_TOKENS[exec_id] = cancel_token
            # Launch in background
            asyncio.create_task(run_executor_background(workflow_dict, exec_id, cancel_token))

    def list_jobs(self) -> List[Dict[str, Any]]:
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "nextRunTime": job.next_run_time.isoformat() if job.next_run_time else None,
                "name": job.name,
                "trigger": str(job.trigger),
            })
        return jobs

# Global Scheduler Singleton
global_scheduler_manager = WorkflowSchedulerManager()

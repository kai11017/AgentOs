import logging
from typing import Dict, Any
from backend.app.engine.handlers.base import BaseNodeHandler

logger = logging.getLogger("agentos.handlers.trigger")

class TriggerNodeHandler(BaseNodeHandler):
    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        config = node.get("data", {}).get("config", {})
        trigger_type = config.get("triggerType", "manual")
        
        # Initial trigger payload (e.g. email payload or webhook data)
        return {
            "status": "triggered",
            "triggerType": trigger_type,
            "sender": config.get("account", "rippika@gmail.com"),
            "subject": "Q4 AI Strategy & Workflow Optimization",
            "body": "Hi team, please research local open-source models and multi-agent orchestration architecture.",
            "receivedAt": "2026-11-13T14:32:12Z",
            "hasAttachments": True,
        }


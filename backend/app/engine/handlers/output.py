from typing import Dict, Any
from backend.app.engine.handlers.base import BaseNodeHandler

class OutputNodeHandler(BaseNodeHandler):
    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Merge all outputs from upstream nodes
        return {
            "status": "success",
            "workflowCompleted": True,
            "finalPayload": context.get("$json", {}),
            "executedNodesCount": len(context.get("$nodes", {})),
        }


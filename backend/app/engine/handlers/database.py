from typing import Dict, Any
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

class DatabaseNodeHandler(BaseNodeHandler):
    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        raw_config = node.get("data", {}).get("config", {})
        config = ExpressionEvaluator.resolve_config(raw_config, context)
        
        service = config.get("service", "Notion")
        operation = config.get("operation", "Create Page in Database")
        db_id = config.get("databaseId", "Research Notes (db_82f1a9)")
        title = config.get("titleMapping") or "AI Research Brief"
        
        return {
            "status": "success",
            "service": service,
            "operation": operation,
            "databaseId": db_id,
            "pageId": "page_982bf7a1",
            "title": title,
            "timestamp": "2026-11-13T14:32:16Z",
        }


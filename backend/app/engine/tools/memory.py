from typing import Any, Dict
from backend.app.engine.tools.base import BaseTool

class MemoryTool(BaseTool):
    name = "memory"
    description = "Persistent workflow memory. Store, retrieve, or list key facts, decisions, and findings across workflow execution steps."
    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["get", "set", "list"],
                "description": "Memory operation: 'get' to read a key, 'set' to save a key-value pair, 'list' to view all keys.",
            },
            "key": {
                "type": "string",
                "description": "Unique key identifier (e.g. 'user_email', 'total_revenue', 'research_summary'). Required for get/set.",
            },
            "value": {
                "type": "string",
                "description": "Data value or finding to remember. Required for set.",
            },
        },
        "required": ["action"],
    }

    def __init__(self):
        # In-memory store per engine session
        self._store: Dict[str, str] = {}

    async def execute(self, action: str, key: str = "", value: str = "", **kwargs) -> Any:
        act = action.lower()
        if act == "set":
            if not key:
                return {"status": "error", "error": "Missing 'key' parameter for set operation."}
            self._store[key] = value
            return {
                "status": "success",
                "message": f"Successfully stored memory for key '{key}'.",
                "key": key,
            }

        elif act == "get":
            if not key:
                return {"status": "error", "error": "Missing 'key' parameter for get operation."}
            val = self._store.get(key)
            if val is not None:
                return {"status": "success", "key": key, "value": val}
            return {
                "status": "not_found",
                "key": key,
                "message": f"No memory entry found for key '{key}'.",
            }

        elif act == "list":
            return {
                "status": "success",
                "keys": list(self._store.keys()),
                "count": len(self._store),
            }

        return {"status": "error", "error": f"Unknown memory action '{action}'."}

global_memory_tool = MemoryTool()

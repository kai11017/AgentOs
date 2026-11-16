import logging
from typing import Any, Dict
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.transform")

class TransformNodeHandler(BaseNodeHandler):
    """
    Handles data transformations, variable assignment, field renaming, and payload formatting.
    Evaluates dynamic {{ ... }} expressions against the current $json and upstream $nodes context.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Data Transform")
        emit_log = context.get("emit_log")

        if emit_log:
            await emit_log(f"[{label}] Applying data transformations...", level="info")

        input_json = context.get("$json", {})
        # If config defines specific field mappings
        fields = config.get("fields") or config.get("mappings") or {}
        operation = config.get("operation", "set")

        output_data = dict(input_json) if operation != "replace" else {}

        if isinstance(fields, dict):
            for target_key, expr_val in fields.items():
                if isinstance(expr_val, str):
                    resolved_val = ExpressionEvaluator.evaluate_string(expr_val, context)
                    output_data[target_key] = resolved_val
                else:
                    output_data[target_key] = expr_val
        elif isinstance(fields, list):
            # List of { key: str, value: str } items
            for item in fields:
                if isinstance(item, dict):
                    k = item.get("key") or item.get("name")
                    v = item.get("value")
                    if k:
                        if isinstance(v, str):
                            output_data[k] = ExpressionEvaluator.evaluate_string(v, context)
                        else:
                            output_data[k] = v

        # Support single-property assignments
        single_prop = config.get("property") or config.get("variableName")
        single_val = config.get("value")
        if single_prop:
            if isinstance(single_val, str):
                output_data[single_prop] = ExpressionEvaluator.evaluate_string(single_val, context)
            else:
                output_data[single_prop] = single_val

        if emit_log:
            await emit_log(f"[{label}] Output schema mapped with {len(output_data)} keys.", level="info")

        return {
            "status": "success",
            "data": output_data,
            "keys_count": len(output_data),
            **output_data,
        }

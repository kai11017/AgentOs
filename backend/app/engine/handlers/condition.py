import logging
from typing import Any, Dict
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.condition")

class IfElseNodeHandler(BaseNodeHandler):
    """
    Evaluates conditional branch expressions and comparison operators.
    Directs downstream workflow DAG execution along 'true' or 'false' branches.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Condition")
        emit_log = context.get("emit_log")

        # 1. Check if a raw boolean or formula expression was provided
        expression = config.get("expression") or config.get("condition")
        if expression:
            eval_res = ExpressionEvaluator.evaluate_live(expression, context)
            condition_passed = bool(eval_res.get("result"))
            active_handle = "true" if condition_passed else "false"

            if emit_log:
                await emit_log(
                    f"[{label}] Evaluated formula '{expression}' -> {condition_passed} (Active Branch: {active_handle})",
                    level="info",
                )

            return {
                "status": "success",
                "result": condition_passed,
                "active_handle": active_handle,
                "evaluated_expression": expression,
                "data": context.get("$json", {}),
            }

        # 2. Rule-based operator evaluation
        prop_expr = config.get("property", "{{$json.status}}")
        operator = config.get("operator", "equals")
        compare_val_raw = config.get("compareValue", "approved")

        # Resolve property value from context
        prop_val = ExpressionEvaluator.evaluate_string(str(prop_expr), context)
        compare_val = ExpressionEvaluator.evaluate_string(str(compare_val_raw), context)

        condition_passed = False

        if operator == "equals":
            condition_passed = str(prop_val).strip().lower() == str(compare_val).strip().lower()
        elif operator == "not_equals":
            condition_passed = str(prop_val).strip().lower() != str(compare_val).strip().lower()
        elif operator == "contains":
            condition_passed = str(compare_val).lower() in str(prop_val).lower()
        elif operator == "not_contains":
            condition_passed = str(compare_val).lower() not in str(prop_val).lower()
        elif operator == "greater_than":
            try:
                condition_passed = float(prop_val) > float(compare_val)
            except (ValueError, TypeError):
                condition_passed = False
        elif operator == "less_than":
            try:
                condition_passed = float(prop_val) < float(compare_val)
            except (ValueError, TypeError):
                condition_passed = False
        elif operator == "not_empty":
            condition_passed = prop_val is not None and prop_val != "" and prop_val != [] and prop_val != {}
        elif operator == "is_empty":
            condition_passed = prop_val is None or prop_val == "" or prop_val == [] or prop_val == {}
        else:
            condition_passed = bool(prop_val)

        active_handle = "true" if condition_passed else "false"

        if emit_log:
            await emit_log(
                f"[{label}] Evaluated ({prop_val} {operator} {compare_val}) -> {condition_passed}. Routing to '{active_handle}' branch.",
                level="info",
            )

        return {
            "status": "success",
            "result": condition_passed,
            "active_handle": active_handle,
            "property_value": prop_val,
            "operator": operator,
            "compare_value": compare_val,
            "data": context.get("$json", {}),
        }

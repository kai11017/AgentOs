import re
from typing import Any, Dict
from simpleeval import simple_eval, NameNotDefined, InvalidExpression

# Regex to match {{ expression }}
EXPRESSION_PATTERN = re.compile(r"\{\{\s*(.*?)\s*\}\}")

class ExpressionEvaluator:
    @staticmethod
    def evaluate_string(template: str, context: Dict[str, Any]) -> Any:
        """
        Safely evaluates {{ ... }} expressions inside strings using simpleeval.
        Zero eval() usage.
        """
        if not isinstance(template, str) or "{{" not in template:
            return template

        # Exact match of single expression: return the evaluated object directly
        exact_match = re.fullmatch(r"\{\{\s*(.*?)\s*\}\}", template.strip())
        if exact_match:
            expr = exact_match.group(1)
            return ExpressionEvaluator._eval_expr(expr, context)

        # Embedded expressions: interpolate into string
        def replace_match(match):
            expr = match.group(1)
            val = ExpressionEvaluator._eval_expr(expr, context)
            return "" if val is None else str(val)

        return EXPRESSION_PATTERN.sub(replace_match, template)

    @staticmethod
    def _eval_expr(expr: str, context: Dict[str, Any]) -> Any:
        try:
            # Map $json to json_data, $prev to prev_data, $nodes to nodes_data
            # simpleeval names cannot start with $, so we alias them cleanly
            names = {
                "json": context.get("$json", {}),
                "prev": context.get("$prev", {}),
                "nodes": context.get("$nodes", {}),
            }
            # Also allow direct access if expressions use $json or json
            normalized_expr = expr.replace("$json", "json").replace("$prev", "prev").replace("$nodes", "nodes")
            
            return simple_eval(normalized_expr, names=names)
        except (NameNotDefined, InvalidExpression, KeyError, TypeError, Exception):
            # Safe fallback if expression fails or field is missing
            return None

    @classmethod
    def resolve_config(cls, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively resolves all {{ ... }} templates in a node's config dictionary."""
        resolved = {}
        for key, val in config.items():
            if isinstance(val, str):
                resolved[key] = cls.evaluate_string(val, context)
            elif isinstance(val, dict):
                resolved[key] = cls.resolve_config(val, context)
            elif isinstance(val, list):
                resolved[key] = [cls.evaluate_string(item, context) if isinstance(item, str) else item for item in val]
            else:
                resolved[key] = val
        return resolved


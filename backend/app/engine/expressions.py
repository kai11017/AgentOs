import re
from typing import Any, Dict
from simpleeval import simple_eval, NameNotDefined, InvalidExpression

# Regex to match {{ expression }}
EXPRESSION_PATTERN = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")

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
        exact_match = re.fullmatch(r"\{\{\s*([^{}]+?)\s*\}\}", template.strip())
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
            # Map $json to json_data, $prev to prev_data, $nodes to nodes_data, $env to env
            # simpleeval names cannot start with $, so we alias them cleanly
            names = {
                "json": context.get("$json", {}),
                "prev": context.get("$prev", {}),
                "nodes": context.get("$nodes", {}),
                "env": context.get("$env", {}),
                "execution": context.get("$execution", {"id": "exec-preview-001"}),
                "workflow": context.get("$workflow", {"name": "Current Workflow"}),
            }
            # Also allow direct access if expressions use $json, $prev, $nodes, $env, $execution, $workflow
            normalized_expr = (
                expr.replace("$json", "json")
                .replace("$prev", "prev")
                .replace("$nodes", "nodes")
                .replace("$env", "env")
                .replace("$execution", "execution")
                .replace("$workflow", "workflow")
            )
            
            return simple_eval(normalized_expr, names=names)
        except (NameNotDefined, InvalidExpression, KeyError, TypeError, Exception):
            # Safe fallback if expression fails or field is missing
            return None

    @classmethod
    def evaluate_live(cls, template_or_expr: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Interactive evaluation utility used by the Visual Expression Builder.
        Returns evaluation results with type inspection, formatted representation, and error diagnosis.
        """
        if not template_or_expr or not template_or_expr.strip():
            return {
                "success": True,
                "result": "",
                "type": "string",
                "preview": '""',
                "error": None,
            }

        text = template_or_expr.strip()
        # If wrapped in {{ ... }}, extract inner expression or evaluate as string
        try:
            if text.startswith("{{") and text.endswith("}}") and text.count("{{") == 1:
                inner = text[2:-2].strip()
                val = cls._eval_expr(inner, context)
            elif "{{" in text:
                val = cls.evaluate_string(text, context)
            else:
                # Bare expression e.g. "$json.topic" or "json.topic"
                val = cls._eval_expr(text, context)
                if val is None:
                    # Treat as literal string if bare expression yielded None
                    val = text

            val_type = type(val).__name__ if val is not None else "null"
            
            return {
                "success": True,
                "result": val,
                "type": val_type,
                "preview": repr(val) if val is not None else "null",
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "type": "error",
                "preview": "Evaluation Error",
                "error": str(e),
            }

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


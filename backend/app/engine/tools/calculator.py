import math
from typing import Any, Dict
from simpleeval import SimpleEval
from backend.app.engine.tools.base import BaseTool

class CalculatorTool(BaseTool):
    name = "calculator"
    description = "Perform accurate mathematical and statistical calculations. Supports standard operators and functions (sqrt, pow, round, abs, log, sin, cos)."
    parameters_schema = {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Mathematical expression to evaluate, e.g. 'sqrt(144) * 25 + 10' or 'round(1500 / 12, 2)'",
            }
        },
        "required": ["expression"],
    }

    def __init__(self):
        self.evaluator = SimpleEval()
        # Register standard math functions safely
        self.evaluator.functions.update({
            "sqrt": math.sqrt,
            "pow": math.pow,
            "round": round,
            "abs": abs,
            "log": math.log,
            "log10": math.log10,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "floor": math.floor,
            "ceil": math.ceil,
            "min": min,
            "max": max,
            "sum": sum,
        })
        self.evaluator.names.update({
            "pi": math.pi,
            "e": math.e,
        })

    async def execute(self, expression: str, **kwargs) -> Any:
        try:
            # Clean string
            clean_expr = expression.strip()
            result = self.evaluator.eval(clean_expr)
            return {
                "expression": expression,
                "result": result,
                "status": "success",
            }
        except Exception as e:
            return {
                "expression": expression,
                "error": f"Evaluation error: {str(e)}",
                "status": "error",
            }

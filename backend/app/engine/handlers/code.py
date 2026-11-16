import asyncio
import json
import logging
import sys
from typing import Any, Dict
from backend.app.engine.handlers.base import BaseNodeHandler

logger = logging.getLogger("agentos.handlers.code")

class CodeNodeHandler(BaseNodeHandler):
    """
    Executes Python scripts or code transformations within isolated subprocesses.
    Supports inspecting $json and returning structured output dictionaries.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Code Execution")
        emit_log = context.get("emit_log")

        if emit_log:
            await emit_log(f"[{label}] Preparing Python execution runtime...", level="info")

        code = config.get("code") or config.get("script") or ""
        timeout = float(config.get("timeout", 10.0))

        if not code.strip():
            # Default passthrough with summary if no code provided
            input_json = context.get("$json", {})
            return {
                "status": "success",
                "output": "No custom script provided. Passing through $json input.",
                "data": input_json,
                "transformed": False,
            }

        input_json_str = json.dumps(context.get("$json", {}))
        nodes_json_str = json.dumps(context.get("$nodes", {}))

        # Subprocess wrapper script
        wrapper = f"""
import sys
import json
import math
import re
import datetime

# Input bindings
json_data = json.loads({repr(input_json_str)})
nodes_data = json.loads({repr(nodes_json_str)})

# Output capture
_return_val = None

def _run():
    global _return_val
{chr(10).join('    ' + line for line in code.splitlines())}

try:
    _run()
    if _return_val is not None:
        print("___RESULT_JSON___" + json.dumps(_return_val))
except Exception as _err:
    print(f"Runtime Exception: {{_err}}", file=sys.stderr)
    sys.exit(1)
"""

        if emit_log:
            await emit_log(f"[{label}] Executing script in sandbox...", level="info")

        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-c",
                wrapper,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            out_str = stdout_b.decode("utf-8", errors="replace").strip()
            err_str = stderr_b.decode("utf-8", errors="replace").strip()

            if proc.returncode != 0:
                err_msg = err_str or f"Process exited with code {proc.returncode}"
                if emit_log:
                    await emit_log(f"[{label}] Execution error: {err_msg}", level="error")
                return {
                    "status": "error",
                    "error": err_msg,
                    "stdout": out_str,
                }

            # Check if returned structured JSON object
            structured_data = None
            clean_stdout = out_str
            if "___RESULT_JSON___" in out_str:
                parts = out_str.split("___RESULT_JSON___", 1)
                clean_stdout = parts[0].strip()
                try:
                    structured_data = json.loads(parts[1].strip())
                except Exception:
                    structured_data = parts[1].strip()

            if emit_log:
                await emit_log(f"[{label}] Script completed successfully.", level="info")

            return {
                "status": "success",
                "output": clean_stdout,
                "data": structured_data if structured_data is not None else context.get("$json", {}),
                "has_structured_output": structured_data is not None,
            }

        except asyncio.TimeoutError:
            err_msg = f"Script execution exceeded timeout limit ({timeout}s)."
            if emit_log:
                await emit_log(f"[{label}] {err_msg}", level="error")
            return {
                "status": "error",
                "error": err_msg,
            }
        except Exception as e:
            logger.error(f"Code execution handler failure: {e}", exc_info=True)
            if emit_log:
                await emit_log(f"[{label}] Subprocess failure: {str(e)}", level="error")
            return {
                "status": "error",
                "error": str(e),
            }

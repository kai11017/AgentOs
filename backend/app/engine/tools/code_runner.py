import asyncio
import sys
from typing import Any, Dict
from backend.app.engine.tools.base import BaseTool

class CodeRunnerTool(BaseTool):
    name = "code_runner"
    description = "Safely execute a short Python snippet to transform, aggregate, or format data structures. Standard libraries (json, math, re, datetime) are available."
    parameters_schema = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code to execute. Print or assign output to print(...) so the agent can inspect the result.",
            },
        },
        "required": ["code"],
    }

    async def execute(self, code: str, **kwargs) -> Any:
        # Wrap code to capture stdout
        wrapper = f"""
import sys, json, math, re, datetime

def _run():
{chr(10).join('    ' + line for line in code.splitlines())}

try:
    _run()
except Exception as _e:
    print(f"Error: {{_e}}", file=sys.stderr)
"""
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-c",
                wrapper,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=4.0)
            out_str = stdout.decode("utf-8", errors="replace").strip()
            err_str = stderr.decode("utf-8", errors="replace").strip()

            if proc.returncode != 0 or err_str:
                return {
                    "status": "error",
                    "error": err_str or f"Process exited with code {proc.returncode}",
                    "output": out_str,
                }
            return {
                "status": "success",
                "output": out_str,
            }
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {
                "status": "error",
                "error": "Execution timed out (limit: 4.0s)",
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"Subprocess launch error: {str(e)}",
            }

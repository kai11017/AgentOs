#!/usr/bin/env python3
"""
AgentOS Standalone Local Filesystem MCP Server
Standard JSON-RPC 2.0 Stdio Implementation with Sandbox Boundary Protection
"""

import sys
import os
import json
import glob
from pathlib import Path
from typing import Dict, Any

WORKSPACE_ROOT = Path(os.getcwd()).resolve()

def is_safe_path(target_path: Path) -> bool:
    """Verifies that the target path does not escape the workspace boundary."""
    try:
        resolved = target_path.resolve()
        # Must be within workspace root or child
        return WORKSPACE_ROOT in resolved.parents or resolved == WORKSPACE_ROOT
    except Exception:
        return False

def tool_list_files(directory: str = ".", max_depth: int = 2) -> Dict[str, Any]:
    target_dir = (WORKSPACE_ROOT / directory).resolve()
    if not is_safe_path(target_dir):
        return {"error": "Access denied: Path escapes workspace sandbox root.", "status": "error"}
    if not target_dir.exists():
        return {"error": f"Directory '{directory}' does not exist.", "status": "error"}

    results = []
    try:
        for item in sorted(target_dir.iterdir()):
            if item.name.startswith(".git") or item.name == "__pycache__" or item.name == "node_modules":
                continue
            is_dir = item.is_dir()
            size = item.stat().st_size if not is_dir else 0
            rel_path = item.relative_to(WORKSPACE_ROOT).as_posix()
            results.append({
                "name": item.name,
                "path": rel_path,
                "is_directory": is_dir,
                "size_bytes": size,
            })
            if len(results) >= 100:
                break
        return {"status": "success", "directory": directory, "items": results, "total": len(results)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def tool_read_file(path: str, max_chars: int = 8000) -> Dict[str, Any]:
    target_file = (WORKSPACE_ROOT / path).resolve()
    if not is_safe_path(target_file):
        return {"error": "Access denied: Path escapes workspace sandbox root.", "status": "error"}
    if not target_file.exists():
        return {"error": f"File '{path}' does not exist.", "status": "error"}
    if target_file.is_dir():
        return {"error": f"Path '{path}' is a directory, not a file.", "status": "error"}

    try:
        with open(target_file, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(max_chars + 1)
        truncated = len(content) > max_chars
        content_out = content[:max_chars]
        return {
            "status": "success",
            "path": path,
            "content": content_out,
            "length": len(content_out),
            "truncated": truncated,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

def tool_write_file(path: str, content: str) -> Dict[str, Any]:
    target_file = (WORKSPACE_ROOT / path).resolve()
    if not is_safe_path(target_file):
        return {"error": "Access denied: Path escapes workspace sandbox root.", "status": "error"}

    try:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(content)
        return {
            "status": "success",
            "path": path,
            "bytes_written": len(content.encode("utf-8")),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

def tool_search_files(pattern: str, directory: str = ".") -> Dict[str, Any]:
    target_dir = (WORKSPACE_ROOT / directory).resolve()
    if not is_safe_path(target_dir):
        return {"error": "Access denied: Path escapes workspace sandbox root.", "status": "error"}

    matches = []
    try:
        search_glob = str(target_dir / "**" / pattern)
        for filepath in glob.glob(search_glob, recursive=True):
            p = Path(filepath)
            if ".git" in p.parts or "node_modules" in p.parts or "__pycache__" in p.parts:
                continue
            if is_safe_path(p):
                matches.append(p.relative_to(WORKSPACE_ROOT).as_posix())
            if len(matches) >= 50:
                break
        return {"status": "success", "pattern": pattern, "matches": matches, "count": len(matches)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

TOOLS_METADATA = [
    {
        "name": "list_files",
        "description": "Lists files and subdirectories in a workspace directory with sizes and types.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "Relative path to directory to inspect (default '.')",
                },
                "max_depth": {
                    "type": "integer",
                    "description": "Maximum recursion depth (default 2)",
                },
            },
        },
    },
    {
        "name": "read_file",
        "description": "Reads text content from a specified workspace file safely.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path of file to read",
                },
                "max_chars": {
                    "type": "integer",
                    "description": "Maximum characters to return (default 8000)",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Writes text content into a workspace file.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path of file to write",
                },
                "content": {
                    "type": "string",
                    "description": "Text content to write",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "search_files",
        "description": "Searches for files matching a wildcard pattern (e.g., *.py, *config*).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Glob search pattern (e.g. *.md, *.json)",
                },
                "directory": {
                    "type": "string",
                    "description": "Relative directory to search within (default '.')",
                },
            },
            "required": ["pattern"],
        },
    },
]

def handle_call_tool(name: str, arguments: Dict[str, Any]) -> Any:
    if name == "list_files":
        return tool_list_files(
            directory=arguments.get("directory", "."),
            max_depth=arguments.get("max_depth", 2),
        )
    elif name == "read_file":
        return tool_read_file(
            path=arguments.get("path", ""),
            max_chars=arguments.get("max_chars", 8000),
        )
    elif name == "write_file":
        return tool_write_file(
            path=arguments.get("path", ""),
            content=arguments.get("content", ""),
        )
    elif name == "search_files":
        return tool_search_files(
            pattern=arguments.get("pattern", "*"),
            directory=arguments.get("directory", "."),
        )
    else:
        return {"status": "error", "error": f"Unknown tool: '{name}'"}

def send_response(res_dict):
    data = json.dumps(res_dict).encode("utf-8") + b"\n"
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()

def main():
    while True:
        raw = sys.stdin.buffer.readline()
        if not raw:
            break
        line_clean = raw.decode("utf-8", errors="replace").strip()
        if not line_clean:
            continue
        try:
            req = json.loads(line_clean)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {},
                    },
                    "serverInfo": {
                        "name": "agentos-filesystem",
                        "version": "1.0.0",
                    },
                },
            }
            send_response(res)

        elif method == "notifications/initialized":
            continue

        elif method == "tools/list":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": TOOLS_METADATA,
                },
            }
            send_response(res)

        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            call_res = handle_call_tool(tool_name, tool_args)
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(call_res),
                        }
                    ],
                    "raw": call_res,
                },
            }
            send_response(res)

        else:
            if req_id is not None:
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}",
                    },
                }
                send_response(res)

if __name__ == "__main__":
    main()

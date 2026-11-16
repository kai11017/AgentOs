#!/usr/bin/env python3
"""
AgentOS Standalone Local System Diagnostics MCP Server
Standard JSON-RPC 2.0 Stdio Implementation
"""

import sys
import os
import json
import platform
import shutil
import socket
from typing import Dict, Any

def tool_get_system_info() -> Dict[str, Any]:
    try:
        return {
            "status": "success",
            "os": platform.system(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": sys.version.split()[0],
            "cpu_count": os.cpu_count() or 1,
            "hostname": platform.node(),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

def tool_get_disk_space(path: str = ".") -> Dict[str, Any]:
    try:
        usage = shutil.disk_usage(path)
        to_gb = 1024 ** 3
        return {
            "status": "success",
            "path": path,
            "total_gb": round(usage.total / to_gb, 2),
            "used_gb": round(usage.used / to_gb, 2),
            "free_gb": round(usage.free / to_gb, 2),
            "percent_used": round((usage.used / usage.total) * 100, 1),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

def tool_ping_host(host: str = "127.0.0.1", port: int = 80, timeout: float = 2.0) -> Dict[str, Any]:
    """Safely checks if a network target is reachable using TCP socket without running shell commands."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        is_open = (result == 0)
        return {
            "status": "success",
            "host": host,
            "port": port,
            "reachable": is_open,
            "code": result,
        }
    except Exception as e:
        return {"status": "error", "host": host, "port": port, "error": str(e)}

TOOLS_METADATA = [
    {
        "name": "get_system_info",
        "description": "Returns hardware specs, operating system name, architecture, and CPU core counts.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_disk_space",
        "description": "Returns disk storage statistics (total, used, free GB) for local workspace drive.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Drive path to check (default '.')",
                },
            },
        },
    },
    {
        "name": "ping_host",
        "description": "Checks network reachability of a given host and TCP port safely via socket.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "host": {
                    "type": "string",
                    "description": "Hostname or IP address (e.g. 127.0.0.1, google.com)",
                },
                "port": {
                    "type": "integer",
                    "description": "Port number to check (default 80)",
                },
            },
            "required": ["host"],
        },
    },
]

def handle_call_tool(name: str, arguments: Dict[str, Any]) -> Any:
    if name == "get_system_info":
        return tool_get_system_info()
    elif name == "get_disk_space":
        return tool_get_disk_space(path=arguments.get("path", "."))
    elif name == "ping_host":
        return tool_ping_host(
            host=arguments.get("host", "127.0.0.1"),
            port=arguments.get("port", 80),
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
                        "name": "agentos-system-info",
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

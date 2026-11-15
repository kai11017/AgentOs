import asyncio
import json
import logging
import sys
from typing import Dict, Any, List, Optional
from backend.app.engine.tools.base import BaseTool

logger = logging.getLogger("agentos.mcp")

class MCPToolWrapper(BaseTool):
    """Wraps an MCP server tool into an AgentOS BaseTool usable by Gemini & Ollama."""
    def __init__(self, server_name: str, tool_meta: Dict[str, Any], mcp_client: "MCPClient"):
        self.server_name = server_name
        # Namespaced tool name to avoid collisions across multiple servers
        raw_name = tool_meta.get("name", "unnamed_tool")
        self.raw_name = raw_name
        self.name = f"mcp_{server_name}_{raw_name}".replace("-", "_")
        self.description = f"[{server_name.upper()} MCP] {tool_meta.get('description', '')}"
        self.parameters_schema = tool_meta.get("inputSchema", {
            "type": "object",
            "properties": {},
        })
        self.client = mcp_client

    async def execute(self, **kwargs) -> Any:
        try:
            return await self.client.call_tool(self.raw_name, kwargs)
        except Exception as e:
            logger.error(f"Error calling MCP tool {self.name}: {e}")
            return {
                "status": "error",
                "error": f"MCP execution error: {str(e)}",
            }

class MCPClient:
    """
    Lightweight, asynchronous Model Context Protocol (MCP) JSON-RPC 2.0 client
    supporting Stdio subprocess communication.
    """
    def __init__(self, name: str, command: str, args: Optional[List[str]] = None, env: Optional[Dict[str, str]] = None):
        self.name = name
        self.command = command
        self.args = args or []
        self.env = env or {}
        self.process: Optional[asyncio.subprocess.Process] = None
        self._request_id = 0
        self._pending_responses: Dict[int, asyncio.Future] = {}
        self._read_task: Optional[asyncio.Task] = None
        self.tools: List[Dict[str, Any]] = []
        self.is_connected = False

    async def start(self) -> bool:
        """Launches the MCP server subprocess and performs JSON-RPC handshake."""
        try:
            full_cmd = [self.command] + self.args
            self.process = await asyncio.create_subprocess_exec(
                *full_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            self._read_task = asyncio.create_task(self._listen_stdout())

            # Perform MCP Handshake: initialize
            init_res = await self._send_request("initialize", {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "clientInfo": {
                    "name": "AgentOS-Workflow-Client",
                    "version": "1.0.0"
                }
            }, timeout=8.0)

            # Send initialized notification
            await self._send_notification("notifications/initialized", {})
            self.is_connected = True
            logger.info(f"MCP server '{self.name}' initialized successfully.")

            # Discover tools
            await self.refresh_tools()
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to MCP server '{self.name}': {e}")
            self.is_connected = False
            return False

    async def _listen_stdout(self):
        """Continuously reads newline-delimited JSON-RPC messages from MCP server stdout."""
        while self.process and self.process.stdout and not self.process.stdout.at_eof():
            try:
                line = await self.process.stdout.readline()
                if not line:
                    break
                line_str = line.decode("utf-8", errors="replace").strip()
                if not line_str:
                    continue
                try:
                    msg = json.loads(line_str)
                    req_id = msg.get("id")
                    if req_id is not None and req_id in self._pending_responses:
                        future = self._pending_responses.pop(req_id)
                        if not future.done():
                            if "error" in msg:
                                future.set_exception(RuntimeError(msg["error"].get("message", "MCP error")))
                            else:
                                future.set_result(msg.get("result"))
                except json.JSONDecodeError:
                    pass
            except asyncio.CancelledError:
                break
            except Exception as ex:
                logger.debug(f"MCP stdout read loop error: {ex}")
                break

    async def _send_request(self, method: str, params: Dict[str, Any], timeout: float = 10.0) -> Any:
        if not self.process or not self.process.stdin:
            raise RuntimeError(f"MCP server '{self.name}' is not running.")

        self._request_id += 1
        req_id = self._request_id
        future = asyncio.get_event_loop().create_future()
        self._pending_responses[req_id] = future

        msg = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params,
        }
        line = json.dumps(msg) + "\n"
        self.process.stdin.write(line.encode("utf-8"))
        await self.process.stdin.drain()

        return await asyncio.wait_for(future, timeout=timeout)

    async def _send_notification(self, method: str, params: Dict[str, Any]):
        if not self.process or not self.process.stdin:
            return
        msg = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }
        line = json.dumps(msg) + "\n"
        self.process.stdin.write(line.encode("utf-8"))
        await self.process.stdin.drain()

    async def refresh_tools(self) -> List[Dict[str, Any]]:
        """Queries tools/list from server and returns discovered tools."""
        try:
            res = await self._send_request("tools/list", {})
            self.tools = res.get("tools", [])
            logger.info(f"Discovered {len(self.tools)} tools from MCP server '{self.name}'.")
            return self.tools
        except Exception as e:
            logger.warning(f"Failed to query tools/list from MCP server '{self.name}': {e}")
            return []

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Executes a tool on the MCP server via tools/call."""
        res = await self._send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments,
        }, timeout=20.0)
        return res

    async def stop(self):
        """Terminates MCP server subprocess gracefully."""
        self.is_connected = False
        if self._read_task:
            self._read_task.cancel()
        if self.process:
            try:
                self.process.terminate()
                await asyncio.wait_for(self.process.wait(), timeout=2.0)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

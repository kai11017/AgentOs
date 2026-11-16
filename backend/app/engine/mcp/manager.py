import logging
import os
import sys
from typing import Dict, Any, List, Optional
from backend.app.engine.mcp.client import MCPClient, MCPToolWrapper
from backend.app.engine.tools.registry import global_tool_registry

logger = logging.getLogger("agentos.mcp.manager")

class MCPManager:
    def __init__(self):
        self._clients: Dict[str, MCPClient] = {}
        
        fs_server_path = os.path.abspath(os.path.join(os.getcwd(), "mcp_tools", "filesystem", "server.py"))
        sys_server_path = os.path.abspath(os.path.join(os.getcwd(), "mcp_tools", "system_info", "server.py"))

        self._server_configs: Dict[str, Dict[str, Any]] = {
            "filesystem": {
                "name": "filesystem",
                "label": "Local Filesystem MCP",
                "description": "Secure file operations (list, read, write, search) within local workspace sandbox via MCP.",
                "command": sys.executable,
                "args": ["-u", fs_server_path],
                "enabled": False,
                "status": "disconnected",
            },
            "system_info": {
                "name": "system_info",
                "label": "System Diagnostics MCP",
                "description": "Local PC hardware specs, disk usage, and safe socket reachability diagnostics.",
                "command": sys.executable,
                "args": ["-u", sys_server_path],
                "enabled": False,
                "status": "disconnected",
            },
            "memory": {
                "name": "memory",
                "label": "Knowledge Graph Memory MCP",
                "description": "Persistent graph memory for entities, relations, and cross-workflow recall (Requires Node/npx).",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-memory"],
                "enabled": False,
                "status": "disconnected",
            },
            "github": {
                "name": "github",
                "label": "GitHub MCP",
                "description": "Interact with repositories, read PRs, create issues, and manage commits (Requires Node/npx).",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"],
                "enabled": False,
                "status": "disconnected",
            },
        }

    def list_server_configs(self) -> List[Dict[str, Any]]:
        configs = []
        for name, cfg in self._server_configs.items():
            client = self._clients.get(name)
            is_connected = client.is_connected if client else False
            tool_count = len(client.tools) if (client and client.is_connected) else 0
            configs.append({
                **cfg,
                "status": "connected" if is_connected else "disconnected",
                "toolCount": tool_count,
                "tools": client.tools if (client and client.is_connected) else [],
            })
        return configs

    def add_custom_server(self, name: str, command: str, args: Optional[List[str]] = None, env: Optional[Dict[str, str]] = None, description: str = ""):
        self._server_configs[name] = {
            "name": name,
            "label": f"{name.capitalize()} MCP Server",
            "description": description or f"Custom MCP server executing '{command}'",
            "command": command,
            "args": args or [],
            "env": env or {},
            "enabled": True,
            "status": "disconnected",
        }

    async def connect_server(self, name: str) -> bool:
        cfg = self._server_configs.get(name)
        if not cfg:
            raise ValueError(f"MCP server '{name}' not found in configuration.")

        # If already running, return True
        existing = self._clients.get(name)
        if existing and existing.is_connected:
            return True

        client = MCPClient(
            name=name,
            command=cfg["command"],
            args=cfg.get("args", []),
            env=cfg.get("env", {}),
        )
        success = await client.start()
        if success:
            self._clients[name] = client
            cfg["enabled"] = True
            # Register discovered tools in global tool registry
            for tool_meta in client.tools:
                wrapper = MCPToolWrapper(server_name=name, tool_meta=tool_meta, mcp_client=client)
                global_tool_registry.register(wrapper)
                logger.info(f"Registered MCP tool '{wrapper.name}' into AgentOS Tool Registry.")
            return True
        return False

    async def disconnect_server(self, name: str):
        client = self._clients.get(name)
        if client:
            # Unregister its tools from global registry
            for tool_meta in client.tools:
                raw_name = tool_meta.get("name", "")
                wrapper_name = f"mcp_{name}_{raw_name}".replace("-", "_")
                global_tool_registry.unregister(wrapper_name)
            await client.stop()
            self._clients.pop(name, None)
        cfg = self._server_configs.get(name)
        if cfg:
            cfg["enabled"] = False

    def list_all_available_tools(self) -> List[Dict[str, Any]]:
        """Returns all registered tools (built-in + MCP tools) for UI display and selection."""
        tools_list = []
        for t in global_tool_registry.list_all():
            is_mcp = hasattr(t, "server_name")
            tools_list.append({
                "name": t.name,
                "description": t.description,
                "parameters": getattr(t, "parameters_schema", {}),
                "isMcp": is_mcp,
                "serverName": getattr(t, "server_name", None),
            })
        return tools_list

# Global MCP Manager Singleton
global_mcp_manager = MCPManager()

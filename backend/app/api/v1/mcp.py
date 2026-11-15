from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.app.engine.mcp.manager import global_mcp_manager

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

class AddMCPServerRequest(BaseModel):
    name: str = Field(..., description="Unique server identifier, e.g. 'github' or 'postgres'")
    command: str = Field(..., description="Executable command, e.g. 'npx' or 'uvx' or 'python'")
    args: List[str] = Field(default_factory=list, description="Command line arguments")
    env: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    description: Optional[str] = Field(None, description="Server description")

@router.get("/servers")
async def list_mcp_servers():
    """Returns list of configured MCP servers and their connection statuses."""
    return {"servers": global_mcp_manager.list_server_configs()}

@router.post("/servers")
async def add_mcp_server(req: AddMCPServerRequest):
    """Registers a new custom MCP server."""
    global_mcp_manager.add_custom_server(
        name=req.name.lower().replace(" ", "-"),
        command=req.command,
        args=req.args,
        env=req.env,
        description=req.description or "",
    )
    return {"success": True, "message": f"MCP server '{req.name}' registered."}

@router.post("/servers/{name}/connect")
async def connect_mcp_server(name: str):
    """Launches MCP server subprocess, performs protocol handshake, and loads tools."""
    try:
        success = await global_mcp_manager.connect_server(name)
        if success:
            return {"success": True, "message": f"MCP server '{name}' connected successfully."}
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not connect to MCP server '{name}'. Ensure command/dependencies are installed."
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/servers/{name}/disconnect")
async def disconnect_mcp_server(name: str):
    """Stops MCP server subprocess and unloads tools."""
    await global_mcp_manager.disconnect_server(name)
    return {"success": True, "message": f"MCP server '{name}' disconnected."}

@router.get("/tools")
async def list_all_tools():
    """Returns all available tools across built-ins and connected MCP servers."""
    return {"tools": global_mcp_manager.list_all_available_tools()}

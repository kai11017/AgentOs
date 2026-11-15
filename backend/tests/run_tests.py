import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath("."))

from backend.app.engine.tools.calculator import CalculatorTool
from backend.app.engine.tools.fetch_url import FetchURLTool
from backend.app.engine.tools.code_runner import CodeRunnerTool
from backend.app.engine.tools.registry import global_tool_registry
from backend.app.engine.handlers.agent import AgentNodeHandler
from backend.app.engine.mcp.client import MCPToolWrapper
from backend.app.engine.mcp.manager import global_mcp_manager
from fastapi.testclient import TestClient
from backend.app.main import app

async def main():
    print("--- 1. Testing Calculator ---")
    calc = CalculatorTool()
    res_calc = await calc.execute(expression="sqrt(144) * 5 + 10")
    print("Calculator result:", res_calc)
    assert res_calc["status"] == "success"
    assert res_calc["result"] == 70.0
    print("[PASS] Calculator")

    print("\n--- 2. Testing Fetch URL SSRF ---")
    fetcher = FetchURLTool()
    res_ssrf = await fetcher.execute(url="http://127.0.0.1:8000/internal")
    print("SSRF check:", res_ssrf)
    assert res_ssrf["status"] == "error"
    assert "Access denied" in res_ssrf["error"]
    print("[PASS] SSRF Protection")

    print("\n--- 3. Testing Code Runner ---")
    runner = CodeRunnerTool()
    res_code = await runner.execute(code="print('AgentOS Code Runner Test')")
    print("Code runner:", res_code)
    assert res_code["status"] == "success"
    assert "AgentOS Code Runner Test" in res_code["output"]
    print("[PASS] Code Runner")

    print("\n--- 4. Testing Tool Registry Schemas ---")
    tools = global_tool_registry.list_all()
    assert len(tools) >= 4
    gemini_decls = global_tool_registry.to_gemini_tools(["calculator", "web_search"])
    assert "function_declarations" in gemini_decls[0]
    ollama_tools = global_tool_registry.to_ollama_tools(["calculator", "web_search"])
    assert len(ollama_tools) == 2
    print("[PASS] Registry Schema Generation")

    print("\n--- 5. Testing Agent Handler Autonomous Execution ---")
    handler = AgentNodeHandler()
    node = {
        "id": "agent-test",
        "data": {
            "label": "Research Agent",
            "config": {
                "model": "gemini-3.5-flash",
                "instructions": "Compute 1500 * 12 and summarize.",
                "maxIterations": 3,
            }
        }
    }
    logs = []
    async def mock_log(msg: str, level: str = "info"):
        logs.append(msg)
        print("  STREAM LOG >>", msg)

    context = {
        "$json": {"body": "Dataset containing 1500 units with annual multiplier 12."},
        "emit_log": mock_log,
    }
    agent_res = await handler.execute(node, context)
    print("Agent result:", agent_res["summary"][:120], "...")
    assert agent_res["status"] == "completed"
    assert len(logs) >= 1
    print("[PASS] Agent Autonomous Loop")

    print("\n--- 6. Testing MCP Manager & Tool Adapter ---")
    mcp_servers = global_mcp_manager.list_server_configs()
    assert len(mcp_servers) >= 3
    server_names = [s["name"] for s in mcp_servers]
    assert "filesystem" in server_names
    assert "memory" in server_names
    assert "github" in server_names

    # Test MCP tool adapter
    dummy_tool_meta = {
        "name": "list_directory",
        "description": "Lists contents of a directory",
        "inputSchema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"]
        }
    }
    wrapper = MCPToolWrapper("testserver", dummy_tool_meta, None)
    assert wrapper.name == "mcp_testserver_list_directory"
    assert "[TESTSERVER MCP]" in wrapper.description
    gemini_decl = wrapper.to_gemini_declaration()
    assert gemini_decl["name"] == "mcp_testserver_list_directory"
    print("[PASS] MCP Manager & Wrapper")

    print("\n--- 7. Testing MCP REST API ---")
    client = TestClient(app)
    res_api = client.get("/api/v1/mcp/servers")
    assert res_api.status_code == 200
    assert "servers" in res_api.json()

    res_tools = client.get("/api/v1/mcp/tools")
    assert res_tools.status_code == 200
    available_tools = res_tools.json().get("tools", [])
    assert len(available_tools) >= 4
    tool_names = [t["name"] for t in available_tools]
    assert "web_search" in tool_names
    assert "calculator" in tool_names
    print("[PASS] MCP REST API")

    print("\n==========================================")
    print("ALL 7 END-TO-END PRODUCT SUITE TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(main())

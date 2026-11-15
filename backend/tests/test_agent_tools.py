import pytest
import asyncio
from backend.app.engine.tools.base import BaseTool
from backend.app.engine.tools.calculator import CalculatorTool
from backend.app.engine.tools.web_search import WebSearchTool
from backend.app.engine.tools.fetch_url import FetchURLTool
from backend.app.engine.tools.code_runner import CodeRunnerTool
from backend.app.engine.tools.registry import ToolRegistry, global_tool_registry
from backend.app.engine.handlers.agent import AgentNodeHandler

@pytest.mark.asyncio
async def test_calculator_tool_success():
    calc = CalculatorTool()
    res = await calc.execute(expression="sqrt(144) * 5 + 10")
    assert res["status"] == "success"
    assert res["result"] == 70.0

@pytest.mark.asyncio
async def test_calculator_tool_error_handling():
    calc = CalculatorTool()
    res = await calc.execute(expression="unknown_function(999)")
    assert res["status"] == "error"
    assert "error" in res

@pytest.mark.asyncio
async def test_web_search_tool_resilience():
    search = WebSearchTool()
    res = await search.execute(query="FastAPI", num_results=2)
    assert res["status"] == "success"
    assert len(res["results"]) >= 1
    assert "query" in res

@pytest.mark.asyncio
async def test_fetch_url_ssrf_protection():
    fetcher = FetchURLTool()
    # SSRF: loopback must be rejected
    res_local = await fetcher.execute(url="http://127.0.0.1:8000/secret")
    assert res_local["status"] == "error"
    assert "Access denied" in res_local["error"]

    res_internal = await fetcher.execute(url="http://192.168.1.1/admin")
    assert res_internal["status"] == "error"
    assert "Access denied" in res_internal["error"]

@pytest.mark.asyncio
async def test_code_runner_tool_success():
    runner = CodeRunnerTool()
    code = "import json\nitems = [3, 1, 2]\nitems.sort()\nprint(json.dumps({'sorted': items}))"
    res = await runner.execute(code=code)
    assert res["status"] == "success"
    assert '{"sorted": [1, 2, 3]}' in res["output"]

def test_tool_registry_schemas():
    registry = ToolRegistry()
    tools = registry.list_all()
    assert len(tools) >= 4

    # Test Gemini declarations format
    gemini_tools = registry.to_gemini_tools(["calculator", "web_search"])
    assert len(gemini_tools) == 1
    assert "function_declarations" in gemini_tools[0]
    decls = gemini_tools[0]["function_declarations"]
    assert len(decls) == 2
    assert decls[0]["name"] == "calculator"
    assert decls[0]["parameters"]["type"] == "OBJECT"

    # Test Ollama tools format
    ollama_tools = registry.to_ollama_tools(["calculator", "web_search"])
    assert len(ollama_tools) == 2
    assert ollama_tools[0]["type"] == "function"
    assert ollama_tools[0]["function"]["name"] == "calculator"

@pytest.mark.asyncio
async def test_agent_node_handler_autonomous_loop():
    handler = AgentNodeHandler()
    node = {
        "id": "agent-1",
        "data": {
            "label": "Math & Research Agent",
            "config": {
                "model": "gemini-3.5-flash",
                "instructions": "Calculate 25 * 4 and search for AI workflows.",
                "maxIterations": 3,
            }
        }
    }
    logs_emitted = []
    async def mock_emit_log(msg: str, level: str = "info"):
        logs_emitted.append((msg, level))

    context = {
        "$json": {"body": "Test dataset with 25 units at $4 each."},
        "emit_log": mock_emit_log,
    }

    result = await handler.execute(node, context)
    assert result["status"] == "completed"
    assert len(result["summary"]) > 0
    assert len(logs_emitted) >= 1
    assert any("[AI Agent]" in msg[0] for msg in logs_emitted)

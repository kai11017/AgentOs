import pytest
import asyncio
from httpx import AsyncClient, ASGITransport

from backend.app.main import app, seed_initial_demo_workflow
from backend.app.core.database import init_db
from backend.app.engine.dag import WorkflowDAG
from backend.app.engine.expressions import ExpressionEvaluator
from backend.app.engine.handlers.http import is_safe_url

def test_expression_evaluator_safe():
    context = {
        "$json": {"summary": "Local models are fast", "count": 42},
        "$prev": {"status": "ok"},
    }
    # Exact resolution
    res1 = ExpressionEvaluator.evaluate_string("{{ $json.count }}", context)
    assert res1 == 42

    # String interpolation
    res2 = ExpressionEvaluator.evaluate_string("Summary: {{ $json.summary }}", context)
    assert res2 == "Summary: Local models are fast"

    # Dict resolution
    cfg = {"title": "Note: {{ $json.summary }}", "raw": 100}
    res_cfg = ExpressionEvaluator.resolve_config(cfg, context)
    assert res_cfg["title"] == "Note: Local models are fast"
    assert res_cfg["raw"] == 100

def test_ssrf_protection():
    assert is_safe_url("http://127.0.0.1:8000/internal") is False
    assert is_safe_url("http://localhost:8000/secret") is False
    assert is_safe_url("http://192.168.1.1/admin") is False
    assert is_safe_url("http://10.0.0.1/metadata") is False
    assert is_safe_url("https://api.github.com/repos") is True

def test_dag_validation_and_parallel_tiers():
    nodes = [
        {"id": "n1"},
        {"id": "n2"},
        {"id": "n3a"},
        {"id": "n3b"},
        {"id": "n4"},
    ]
    edges = [
        {"source": "n1", "target": "n2"},
        {"source": "n2", "target": "n3a"},
        {"source": "n2", "target": "n3b"},
        {"source": "n3a", "target": "n4"},
        {"source": "n3b", "target": "n4"},
    ]
    dag = WorkflowDAG(nodes, edges)
    tiers = dag.validate_and_sort()
    
    assert tiers[0] == ["n1"]
    assert tiers[1] == ["n2"]
    # n3a and n3b run in parallel in the same tier!
    assert set(tiers[2]) == {"n3a", "n3b"}
    assert tiers[3] == ["n4"]

@pytest.mark.asyncio
async def test_api_vertical_slice_end_to_end():
    # Explicitly ensure test database tables and seed are ready
    await init_db()
    await seed_initial_demo_workflow()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. List workflows (verifies DB auto-seed)
        res_wf = await client.get("/api/v1/workflows")
        assert res_wf.status_code == 200
        workflows = res_wf.json()
        assert len(workflows) >= 1
        demo = workflows[0]
        assert demo["id"] == "demo-workflow-1"
        assert len(demo["nodes"]) == 5
        assert len(demo["edges"]) == 5

        # 3. Trigger execution
        res_exec = await client.post(
            f"/api/v1/workflows/{demo['id']}/execute",
            json={"inputData": {"test": True}}
        )
        assert res_exec.status_code == 200
        exec_data = res_exec.json()
        exec_id = exec_data["id"]
        assert exec_id.startswith("exec-")

        # Poll for execution completion (up to 3 seconds)
        status_data = {}
        for _ in range(30):
            await asyncio.sleep(0.1)
            res_status = await client.get(f"/api/v1/executions/{exec_id}")
            if res_status.status_code == 200:
                status_data = res_status.json()
                if status_data.get("status") in ("completed", "failed"):
                    break

        # 4. Check execution status & node results
        assert status_data.get("status") == "completed"
        assert status_data["durationMs"] >= 0
        node_results = status_data["nodeResults"]
        assert "node-trigger-1" in node_results
        assert "node-agent-1" in node_results
        assert "node-email-1" in node_results
        assert "node-notion-1" in node_results
        assert "node-output-1" in node_results

        # 5. Check execution logs
        res_logs = await client.get(f"/api/v1/executions/{exec_id}/logs")
        assert res_logs.status_code == 200
        logs = res_logs.json()
        assert len(logs) >= 5
        assert logs[0]["seq"] == 1

import asyncio
import os
import sys
import uuid
import httpx
from httpx import AsyncClient, ASGITransport

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath("."))

from backend.app.engine.tools.calculator import CalculatorTool
from backend.app.engine.tools.fetch_url import FetchURLTool
from backend.app.engine.tools.code_runner import CodeRunnerTool
from backend.app.engine.tools.registry import global_tool_registry
from backend.app.engine.handlers.agent import AgentNodeHandler
from backend.app.engine.mcp.client import MCPToolWrapper
from backend.app.engine.mcp.manager import global_mcp_manager
from backend.app.main import app, seed_initial_demo_workflow
from backend.app.core.database import init_db

async def main():
    # Ensure database schema and demo seed are loaded
    await init_db()
    await seed_initial_demo_workflow()

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

    print("\n--- 7. Testing Context Window Manager & Memory Tool ---")
    from backend.app.engine.tools.memory import global_memory_tool
    from backend.app.engine.context.manager import ContextWindowManager

    set_res = await global_memory_tool.execute(action="set", key="project_lead", value="Alice")
    assert set_res["status"] == "success"
    get_res = await global_memory_tool.execute(action="get", key="project_lead")
    assert get_res["status"] == "success"
    assert get_res["value"] == "Alice"
    list_res = await global_memory_tool.execute(action="list")
    assert "project_lead" in list_res["keys"]
    print("  [PASS] MemoryTool key-value persistence")

    huge_payload = "A" * 12000
    compacted = ContextWindowManager.compact_tool_output(huge_payload, max_tokens=200)
    assert len(compacted) < 1500
    assert "Truncated" in compacted
    print("  [PASS] Tool output truncation")

    turns = [
        {"role": "user", "parts": [{"text": "Task: research AI trends"}]},
        {"role": "model", "parts": [{"functionCall": {"name": "web_search", "args": {"q": "AI 2026"}}}]},
        {"role": "user", "parts": [{"functionResponse": {"name": "web_search", "response": {"output": "Extracted 50 articles " * 50}}}]},
        {"role": "model", "parts": [{"functionCall": {"name": "calculator", "args": {"expr": "50 * 2"}}}]},
        {"role": "user", "parts": [{"functionResponse": {"name": "calculator", "response": {"output": "100"}}}]},
        {"role": "model", "parts": [{"text": "Recent active reasoning step"}]},
    ]
    compacted_turns = ContextWindowManager.compact_gemini_turns(turns, max_tokens=300)
    assert len(compacted_turns) < len(turns)
    assert "Prior Context Checkpoint" in compacted_turns[1]["parts"][0]["text"]
    assert compacted_turns[0]["parts"][0]["text"] == "Task: research AI trends"
    print("  [PASS] Gemini multi-turn Anchor + Tail compaction")

    upstream_ctx = {
        "$json": {"summary": "Customer requested refund for order #1234"},
        "$nodes": {
            "trigger-1": {"body": "Email received from client"},
            "agent-1": {"summary": "Validated order status: Eligible for 100% refund"},
        }
    }
    distilled = ContextWindowManager.distill_upstream_context(upstream_ctx, max_tokens=500)
    assert "Direct Input Data" in distilled
    assert "Workflow Memory (Past Nodes)" in distilled
    assert "refund" in distilled.lower()
    print("  [PASS] Upstream DAG Context Distillation")

    # Async API Client Testing on Same Loop
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n--- 8. Testing MCP REST API ---")
        res_api = await client.get("/api/v1/mcp/servers")
        assert res_api.status_code == 200
        assert "servers" in res_api.json()

        res_tools = await client.get("/api/v1/mcp/tools")
        assert res_tools.status_code == 200
        available_tools = res_tools.json().get("tools", [])
        assert len(available_tools) >= 4
        tool_names = [t["name"] for t in available_tools]
        assert "web_search" in tool_names
        assert "calculator" in tool_names
        assert "memory" in tool_names
        print("[PASS] MCP REST API")

        print("\n--- 9. Testing Webhook Ingress Trigger ---")
        res_wh_chal = await client.get("/api/v1/triggers/webhook/test-token?challenge=slack-verify-999")
        assert res_wh_chal.status_code == 200
        assert "slack-verify-999" in res_wh_chal.text
        print("  [PASS] Webhook challenge verification")

        res_wh_post = await client.post(
            "/api/v1/triggers/webhook/demo-workflow-1",
            json={"event": "github_push", "repo": "AgentOs", "author": "dev"},
        )
        assert res_wh_post.status_code == 200
        wh_data = res_wh_post.json()
        assert wh_data["success"] is True
        assert "executionId" in wh_data
        print("  [PASS] Webhook asynchronous execution trigger")

        print("\n--- 10. Testing Human Approval Node & Resumption ---")
        from backend.app.engine.handlers.approval import ApprovalNodeHandler
        approval_handler = ApprovalNodeHandler()
        approval_node = {
            "id": "node-approval-test",
            "data": {
                "label": "Manager Sign-off",
                "config": {"instructions": "Review invoice before sending payment", "timeoutSeconds": 10},
            }
        }
        test_exec_id = f"test-exec-appr-{uuid.uuid4().hex[:6]}"
        appr_context = {
            "$json": {"invoice_total": 4500},
            "execution_id": test_exec_id,
        }

        async def run_appr():
            return await approval_handler.execute(approval_node, appr_context)

        appr_task = asyncio.create_task(run_appr())
        await asyncio.sleep(0.05)

        res_appr_stat = await client.get(f"/api/v1/executions/{test_exec_id}/approval")
        assert res_appr_stat.status_code == 200
        assert res_appr_stat.json()["waiting"] is True

        res_approve = await client.post(
            f"/api/v1/executions/{test_exec_id}/approve",
            json={"comment": "Approved by CFO"},
        )
        assert res_approve.status_code == 200
        appr_result = await appr_task
        assert appr_result["approved"] is True
        assert appr_result["comment"] == "Approved by CFO"
        print("  [PASS] Human Approval pause & operator resumption")

        print("\n--- 11. Testing Cron & Interval Scheduler ---")
        from backend.app.engine.scheduler.manager import global_scheduler_manager
        global_scheduler_manager.start()
        res_sched_sync = await client.post("/api/v1/schedules/sync")
        assert res_sched_sync.status_code == 200
        assert "syncedCount" in res_sched_sync.json()
        res_sched_list = await client.get("/api/v1/schedules")
        assert res_sched_list.status_code == 200
        assert "jobs" in res_sched_list.json()
        print("  [PASS] APScheduler background sync and job listing")

        print("\n--- 12. Testing Workflow JSON Export & Import ---")
        res_export = await client.get("/api/v1/workflows/demo-workflow-1/export")
        assert res_export.status_code == 200
        exported_data = res_export.json()
        assert exported_data["format"] == "agentflow.workflow"
        assert "workflow" in exported_data

        res_import = await client.post("/api/v1/workflows/import", json=exported_data)
        assert res_import.status_code == 200
        imported_wf = res_import.json()
        assert imported_wf["id"].startswith("wf-")
        assert len(imported_wf["nodes"]) >= 1
        print("  [PASS] Workflow .agentflow.json Export & Import")

        # ─── 13. Testing Encrypted Credential Vault ───────────────────────
        print("\n--- 13. Testing Encrypted Credential Vault ---")
        from backend.app.api.v1.credentials import resolve_credential
        from backend.app.core.database import AsyncSessionLocal
        from backend.app.engine.mcp.manager import global_mcp_manager as mcp_manager
        
        res_cred = await client.post("/api/v1/credentials", json={
            "name": "test_vault_gemini_key",
            "credential_type": "gemini_api_key",
            "value": "AIzaSySecretVaultTestKey9999",
            "description": "Integration Test Key",
        })
        assert res_cred.status_code == 201
        cred_data = res_cred.json()
        assert cred_data["name"] == "test_vault_gemini_key"
        assert cred_data["masked_preview"] == "••••••••9999"
        cred_id = cred_data["id"]

        # Verify in list
        res_list = await client.get("/api/v1/credentials")
        assert res_list.status_code == 200
        creds_list = res_list.json()
        assert any(c["id"] == cred_id for c in creds_list)

        # Verify decryption helper
        async with AsyncSessionLocal() as db_session:
            decrypted_val = await resolve_credential("test_vault_gemini_key", db_session)
            assert decrypted_val == "AIzaSySecretVaultTestKey9999"

            # Delete credential
            res_del = await client.delete(f"/api/v1/credentials/{cred_id}")
            assert res_del.status_code == 200
            after_del = await resolve_credential("test_vault_gemini_key", db_session)
            assert after_del is None
        print("  [PASS] Encrypted Credential Vault (Fernet AES + Masking + Decryption)")

        # ─── 14. Testing Bundled Local Python MCP Servers ─────────────────
        print("\n--- 14. Testing Bundled Local Python MCP Servers ---")
        # Test Filesystem MCP Server
        fs_connected = await mcp_manager.connect_server("filesystem")
        assert fs_connected is True
        fs_client = mcp_manager._clients["filesystem"]
        fs_tool_names = [t["name"] for t in fs_client.tools]
        assert "list_files" in fs_tool_names
        assert "read_file" in fs_tool_names
        assert "search_files" in fs_tool_names

        # Call list_files on filesystem server
        fs_res = await fs_client.call_tool("list_files", {"directory": "."})
        assert "result" in fs_res or "raw" in fs_res or "content" in fs_res
        await mcp_manager.disconnect_server("filesystem")

        # Test System Info MCP Server
        sys_connected = await mcp_manager.connect_server("system_info")
        assert sys_connected is True
        sys_client = mcp_manager._clients["system_info"]
        sys_tool_names = [t["name"] for t in sys_client.tools]
        assert "get_system_info" in sys_tool_names
        assert "get_disk_space" in sys_tool_names

        sys_res = await sys_client.call_tool("get_system_info", {})
        assert sys_res is not None
        await mcp_manager.disconnect_server("system_info")
        print("  [PASS] Bundled Stdio Python MCP Servers (Filesystem & System Info)")

        # ─── 15. Testing Workflow Template Library & Instantiation ───────
        print("\n--- 15. Testing Workflow Template Library & Instantiation ---")
        res_templates = await client.get("/api/v1/templates")
        assert res_templates.status_code == 200
        tpl_list = res_templates.json()
        assert len(tpl_list) >= 4
        tpl_ids = [t["id"] for t in tpl_list]
        assert "tpl-autonomous-researcher" in tpl_ids
        assert "tpl-scheduled-digest" in tpl_ids
        assert "tpl-human-approval" in tpl_ids

        # Instantiate a template
        res_inst = await client.post("/api/v1/templates/tpl-autonomous-researcher/instantiate")
        assert res_inst.status_code == 201
        inst_data = res_inst.json()
        inst_wf_id = inst_data["workflow_id"]

        # Verify instantiated workflow exists with nodes and edges
        res_get_wf = await client.get(f"/api/v1/workflows/{inst_wf_id}")
        assert res_get_wf.status_code == 200
        inst_wf = res_get_wf.json()
        assert len(inst_wf["nodes"]) == 4
        assert len(inst_wf["edges"]) == 3
        print(f"  [PASS] Template Instantiation (Created '{inst_wf['name']}' with {len(inst_wf['nodes'])} nodes)")

        # ─── 16. Testing Local Document RAG & Vector Knowledge Base ─────
        print("\n--- 16. Testing Local Document RAG & Vector Knowledge Base ---")
        from backend.app.engine.tools.knowledge import KnowledgeRetrieverTool
        from backend.app.engine.handlers.knowledge import KnowledgeNodeHandler

        # 1. Ingest document
        res_upload = await client.post("/api/v1/knowledge/upload", json={
            "collection": "engineering_docs",
            "filename": "system_architecture.md",
            "content": (
                "# LocalFlow Architecture\n"
                "LocalFlow Agent is an autonomous workflow engine designed for private desktop automation.\n"
                "It utilizes PostgreSQL with asyncpg, Ollama for local LLM inference, and Model Context Protocol (MCP) for tool execution.\n"
                "The system includes an authenticated Fernet credential vault and APScheduler for automated cron triggers."
            ),
            "chunk_size": 250,
            "chunk_overlap": 30,
        })
        assert res_upload.status_code == 201
        upload_data = res_upload.json()
        assert upload_data["status"] == "success"
        assert upload_data["chunks_ingested"] >= 1
        print("  Ingested document into 'engineering_docs':", upload_data["chunks_ingested"], "chunks")

        # 2. Check collections list
        res_cols = await client.get("/api/v1/knowledge/collections")
        assert res_cols.status_code == 200
        cols_data = res_cols.json().get("collections", [])
        target_col = next((c for c in cols_data if c["name"] == "engineering_docs"), None)
        assert target_col is not None
        assert target_col["document_count"] >= 1
        col_id = target_col["id"]

        # 3. Query knowledge via API
        res_q = await client.post("/api/v1/knowledge/query", json={
            "collection": "engineering_docs",
            "query": "What database driver does LocalFlow use?",
            "top_k": 2,
        })
        assert res_q.status_code == 200
        q_data = res_q.json()
        assert q_data["total_results"] >= 1
        top_chunk = q_data["results"][0]
        assert "asyncpg" in top_chunk["content"].lower()
        print(f"  Semantic query match score: {top_chunk['score']} (Found '{top_chunk['filename']}')")

        # 4. Test KnowledgeRetrieverTool agent tool execution
        rag_tool = KnowledgeRetrieverTool()
        tool_out = await rag_tool.execute(query="database and drivers", collection="engineering_docs")
        assert tool_out["status"] == "success"
        assert tool_out["matches_found"] >= 1
        assert "asyncpg" in tool_out["context_block"]
        print("  KnowledgeRetrieverTool executed autonomously by agent tool loop")

        # 5. Test KnowledgeNodeHandler execution
        rag_handler = KnowledgeNodeHandler()
        node_out = await rag_handler.execute(
            node={
                "id": "node-rag-test",
                "data": {
                    "config": {
                        "collection": "engineering_docs",
                        "query": "credential vault and security",
                        "topK": 2,
                    }
                }
            },
            context={"$json": {}}
        )
        assert node_out["status"] == "success"
        assert "Fernet" in node_out["context_block"]
        print("  KnowledgeNodeHandler executed successfully in DAG context")

        # 6. Cleanup collection
        res_del_col = await client.delete(f"/api/v1/knowledge/collections/{col_id}")
        assert res_del_col.status_code == 200
        print("  [PASS] Document RAG & Vector Knowledge Base Engine")

        print("\n--- 17. Testing Expression Evaluator & Isolated Node Step Testing ---")
        # 1. Test live expression evaluation
        res_expr1 = await client.post(
            "/api/v1/nodes/evaluate-expression",
            json={
                "expression": "{{ $json.user.name }} - {{ $json.role }}",
                "context": {
                    "$json": {
                        "user": {"name": "Alice"},
                        "role": "Principal Engineer",
                    }
                },
            },
        )
        assert res_expr1.status_code == 200
        data_expr1 = res_expr1.json()
        assert data_expr1["success"] is True
        assert data_expr1["result"] == "Alice - Principal Engineer"
        print("  Evaluated string expression: 'Alice - Principal Engineer'")

        # 2. Test numeric math expression
        res_expr2 = await client.post(
            "/api/v1/nodes/evaluate-expression",
            json={
                "expression": "{{ $json.metrics.score * 2 }}",
                "context": {
                    "$json": {
                        "metrics": {"score": 95}
                    }
                },
            },
        )
        assert res_expr2.status_code == 200
        data_expr2 = res_expr2.json()
        assert data_expr2["success"] is True
        assert data_expr2["result"] == 190
        print("  Evaluated arithmetic expression: 95 * 2 = 190")

        # 3. Test isolated Python step execution
        res_step_code = await client.post(
            "/api/v1/nodes/test",
            json={
                "node_id": "test-step-code-1",
                "node_type": "python-execution",
                "label": "Custom Aggregator Script",
                "config": {
                    "code": "val = json_data.get('count', 0) * 10\nprint('Processed items:', val)\n_return_val = {'computed': val, 'ok': True}"
                },
                "input_data": {"count": 12},
                "upstream_nodes": {},
            },
        )
        assert res_step_code.status_code == 200
        step_code_data = res_step_code.json()
        assert step_code_data["status"] == "success"
        assert step_code_data["duration_ms"] > 0
        assert step_code_data["output"]["data"]["computed"] == 120
        assert len(step_code_data["logs"]) >= 1
        print(f"  Isolated code step test executed in {step_code_data['duration_ms']}ms (Result: 120)")

        # 4. Test isolated Transform step execution with expressions
        res_step_trans = await client.post(
            "/api/v1/nodes/test",
            json={
                "node_id": "test-step-trans-1",
                "node_type": "transform",
                "label": "Field Transformer",
                "config": {
                    "fields": {
                        "greeting": "Welcome {{ $json.name }}!",
                        "system_status": "ONLINE",
                    }
                },
                "input_data": {"name": "Kai"},
                "upstream_nodes": {},
            },
        )
        assert res_step_trans.status_code == 200
        step_trans_data = res_step_trans.json()
        assert step_trans_data["status"] == "success"
        assert step_trans_data["output"]["data"]["greeting"] == "Welcome Kai!"
        assert step_trans_data["output"]["data"]["system_status"] == "ONLINE"
        print(f"  Isolated transform step test executed with expression resolution (Greeting: Welcome Kai!)")
        print("  [PASS] Visual Expression Evaluator & Isolated Node Step Testing")

        print("\n--- 18. Testing Dynamic DAG Routing, Conditional Branching & File Exporters ---")
        from backend.app.engine.executor import WorkflowExecutor
        from backend.app.models.execution import ExecutionModel
        from backend.app.core.database import AsyncSessionLocal
        from datetime import datetime, timezone

        test_report_file = os.path.abspath("./outputs/test_automated_report.md")
        test_failure_file = os.path.abspath("./outputs/test_failure_report.md")
        if os.path.exists(test_report_file):
            os.remove(test_report_file)
        if os.path.exists(test_failure_file):
            os.remove(test_failure_file)

        # Build a 5-node DAG:
        # Node 1: Trigger -> Node 2: Transform -> Node 3: IfElse (score > 80)
        # -> True branch: Node 4 (File Export)
        # -> False branch: Node 5 (File Export) -> Node 6 (Notification)
        test_exec_wf = {
            "id": "demo-workflow-1",
            "name": "Industrial Robotics Automation Test",
            "nodes": [
                {
                    "id": "node-trig-1",
                    "type": "trigger",
                    "data": {
                        "label": "Telemetry Trigger",
                        "definitionType": "trigger",
                        "config": {"domain": "Industrial Robotics", "device": "ARM-007"},
                    },
                },
                {
                    "id": "node-trans-2",
                    "type": "transform",
                    "data": {
                        "label": "Metric Computations",
                        "definitionType": "transform",
                        "config": {
                            "fields": {
                                "topic": "Autonomous AI Systems in {{ $json.domain }}",
                                "score": 85,
                                "threshold": 80,
                            }
                        },
                    },
                },
                {
                    "id": "node-cond-3",
                    "type": "if-else",
                    "data": {
                        "label": "Quality Gate Check",
                        "definitionType": "if-else",
                        "config": {
                            "property": "{{ $json.score }}",
                            "operator": "greater_than",
                            "compareValue": "{{ $json.threshold }}",
                        },
                    },
                },
                {
                    "id": "node-export-true-4",
                    "type": "file-export",
                    "data": {
                        "label": "Export Inspection Report",
                        "definitionType": "file-export",
                        "config": {
                            "path": "./outputs/test_automated_report.md",
                            "format": "markdown",
                            "content": "# Report for {{ $json.topic }}\nScore: {{ $json.score }} (Passed)",
                        },
                    },
                },
                {
                    "id": "node-export-false-5",
                    "type": "file-export",
                    "data": {
                        "label": "Export Failure Log",
                        "definitionType": "file-export",
                        "config": {
                            "path": "./outputs/test_failure_report.md",
                            "format": "markdown",
                            "content": "# Failure Notice: Score below threshold",
                        },
                    },
                },
                {
                    "id": "node-notif-false-6",
                    "type": "notification",
                    "data": {
                        "label": "Alert Downstream Channel",
                        "definitionType": "notification",
                        "config": {
                            "provider": "generic",
                            "webhookUrl": "https://example.com/alerts",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1-2", "source": "node-trig-1", "target": "node-trans-2"},
                {"id": "e2-3", "source": "node-trans-2", "target": "node-cond-3"},
                {
                    "id": "e3-4",
                    "source": "node-cond-3",
                    "target": "node-export-true-4",
                    "sourceHandle": "true",
                },
                {
                    "id": "e3-5",
                    "source": "node-cond-3",
                    "target": "node-export-false-5",
                    "sourceHandle": "false",
                },
                {"id": "e5-6", "source": "node-export-false-5", "target": "node-notif-false-6"},
            ],
        }

        async with AsyncSessionLocal() as session:
            test_exec_id = f"exec-branching-{uuid.uuid4().hex[:8]}"
            exec_model = ExecutionModel(
                id=test_exec_id,
                workflow_id="demo-workflow-1",
                status="running",
                duration_ms=0,
                started_at=datetime.now(timezone.utc),
                node_results={},
            )
            session.add(exec_model)
            await session.commit()

            executor = WorkflowExecutor(
                workflow=test_exec_wf,
                execution_id=test_exec_id,
                db_session=session,
            )
            run_res = await executor.run()

            assert run_res["status"] == "completed"
            results = run_res["nodeResults"]
            assert results["node-trig-1"]["status"] == "completed"
            assert results["node-trans-2"]["status"] == "completed"
            assert results["node-cond-3"]["status"] == "completed"
            assert results["node-cond-3"]["output"]["active_handle"] == "true"
            
            # Verify active branch was executed
            assert results["node-export-true-4"]["status"] == "completed"
            assert results["node-export-true-4"]["output"]["bytes_written"] > 0
            
            # Verify inactive branch and all its descendants were pruned / skipped
            assert results["node-export-false-5"]["status"] == "skipped"
            assert results["node-notif-false-6"]["status"] == "skipped"
            print("  DAG Conditional Routing & Descendant Pruning verified")

        # Verify exported file on disk
        assert os.path.exists(test_report_file), "Expected exported report to exist on disk"
        with open(test_report_file, "r", encoding="utf-8") as f:
            content = f.read()
            assert "Report for Autonomous AI Systems in Industrial Robotics" in content
            assert "Score: 85 (Passed)" in content
        assert not os.path.exists(test_failure_file), "Inactive branch file must not have been created"
        print(f"  FileExport successfully wrote verified report to disk ({len(content)} bytes)")
        
        # Cleanup test file
        if os.path.exists(test_report_file):
            os.remove(test_report_file)

        # Test Schedules API toggle and run-now
        res_toggle = await client.post("/api/v1/schedules/demo-workflow-1/toggle", json={"is_active": True})
        assert res_toggle.status_code == 200
        assert res_toggle.json()["isActive"] is True
        print("  Schedule toggle API endpoint verified")

        res_run_now = await client.post("/api/v1/schedules/demo-workflow-1/run-now")
        assert res_run_now.status_code == 200
        assert res_run_now.json()["success"] is True
        print("  Schedule run-now API endpoint verified")
        print("  [PASS] Dynamic DAG Routing, Conditional Branching, File Exporter & Automations Scheduler")

    print("\n==========================================")
    print("ALL 18 PRODUCTION ARCHITECTURE TESTS PASSED!")
    print("==========================================")


if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import logging
from typing import Dict, Any
from backend.app.core.database import AsyncSessionLocal
from backend.app.engine.rag.vector_store import LocalVectorStore

logger = logging.getLogger("agentos.handlers.knowledge")

class KnowledgeNodeHandler:
    """Executes RAG / Vector Search nodes inside workflow graphs."""

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        node_id = node.get("id", "unknown")
        data = node.get("data", {})
        config = data.get("config", {}) or {}
        emit_log = context.get("emit_log")

        async def log(msg: str, level: str = "info"):
            if emit_log:
                try:
                    res = emit_log(msg, level=level)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception:
                    pass

        collection = config.get("collection") or config.get("collectionName") or "default"
        top_k = int(config.get("topK") or config.get("limit") or 3)

        # Resolve query from config, or from upstream context ($json)
        query = config.get("query") or ""
        json_input = context.get("$json", {}) or {}

        if not query:
            query = (
                json_input.get("query")
                or json_input.get("question")
                or json_input.get("topic")
                or json_input.get("prompt")
                or ""
            )

        # If query has {{ variable }} notation, resolve simple fields
        for k, v in json_input.items():
            if isinstance(v, str):
                query = query.replace(f"{{{{{k}}}}}", v)

        if not query.strip():
            await log(f"Knowledge Node '{node_id}': No query provided, skipping search.", level="warning")
            return {
                "status": "skipped",
                "collection": collection,
                "matches": [],
                "context_block": "",
                "total_matches": 0,
            }

        await log(f"Knowledge Search: querying '{collection}' for: '{query[:60]}...'", level="info")

        async with AsyncSessionLocal() as db:
            results = await LocalVectorStore.query(
                collection_name=collection,
                query=query.strip(),
                db=db,
                top_k=top_k,
            )

        await log(f"Knowledge Search: found {len(results)} relevant document passages.", level="info")

        context_blocks = [
            f"--- Source: {r['filename']} (Relevance: {r['score']}) ---\n{r['content']}"
            for r in results
        ]
        combined_text = "\n\n".join(context_blocks)

        return {
            "status": "success",
            "query": query,
            "collection": collection,
            "total_matches": len(results),
            "results": results,
            "context_block": combined_text,
            "summary": f"Retrieved {len(results)} passage(s) from knowledge base '{collection}'.",
        }

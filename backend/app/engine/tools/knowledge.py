import logging
from typing import Dict, Any
from backend.app.engine.tools.base import BaseTool
from backend.app.core.database import AsyncSessionLocal
from backend.app.engine.rag.vector_store import LocalVectorStore

logger = logging.getLogger("agentos.tools.knowledge")

class KnowledgeRetrieverTool(BaseTool):
    """Allows autonomous agents to perform semantic vector searches over local document collections."""

    def __init__(self):
        self.name = "knowledge_retriever"
        self.description = "Searches indexed local documents, PDFs, and technical knowledge bases for relevant excerpts, policies, and facts using semantic similarity."
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query or concept to look up in the knowledge base.",
                },
                "collection": {
                    "type": "string",
                    "description": "The name of the document collection to search within (default 'default').",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Maximum number of relevant document passages to return (default 3).",
                },
            },
            "required": ["query"],
        }

    async def execute(self, query: str, collection: str = "default", top_k: int = 3, **kwargs) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"status": "error", "error": "Query parameter cannot be empty."}

        try:
            async with AsyncSessionLocal() as db:
                results = await LocalVectorStore.query(
                    collection_name=collection.strip() or "default",
                    query=query.strip(),
                    db=db,
                    top_k=min(10, max(1, top_k)),
                )

            if not results:
                return {
                    "status": "success",
                    "query": query,
                    "collection": collection,
                    "matches_found": 0,
                    "results": [],
                    "summary": f"No relevant excerpts found in collection '{collection}' for query: '{query}'.",
                }

            formatted_excerpts = []
            for r in results:
                formatted_excerpts.append(
                    f"[{r['filename']} | Chunk {r['chunk_index']} | Score {r['score']}]:\n{r['content']}"
                )

            return {
                "status": "success",
                "query": query,
                "collection": collection,
                "matches_found": len(results),
                "results": results,
                "context_block": "\n\n---\n\n".join(formatted_excerpts),
            }
        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            return {"status": "error", "error": f"Knowledge search failed: {str(e)}"}

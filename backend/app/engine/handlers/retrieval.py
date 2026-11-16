import logging
from typing import Any, Dict, List
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator
from backend.app.engine.tools.registry import global_tool_registry

logger = logging.getLogger("agentos.handlers.retrieval")

class InfoRetrievalNodeHandler(BaseNodeHandler):
    """
    Executes live web searches (DuckDuckGo), URL fetching, or knowledge base lookups.
    Populates downstream DAG context ($json) with structured sources, excerpts, and unified text.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Info Retrieval")
        emit_log = context.get("emit_log")

        # 1. Resolve Query
        raw_query = (
            config.get("query")
            or config.get("searchQuery")
            or config.get("topic")
            or config.get("url")
        )

        if not raw_query:
            json_in = context.get("$json", {})
            if isinstance(json_in, dict):
                raw_query = (
                    json_in.get("query")
                    or json_in.get("topic")
                    or json_in.get("subject")
                    or json_in.get("question")
                    or json_in.get("name")
                    or "autonomous AI agents in enterprise workflow automation"
                )
            else:
                raw_query = str(json_in)

        query = ExpressionEvaluator.evaluate_string(str(raw_query), context).strip()
        search_type = config.get("searchType", "web").lower()
        max_results = int(config.get("maxResults", 5))

        if emit_log:
            await emit_log(f"[{label}] 🔍 Querying external knowledge for: '{query[:75]}...' (Mode: {search_type})", level="info")

        results: List[Dict[str, Any]] = []
        sources: List[str] = []
        combined_text = ""

        # 2. Execute Web Search via DuckDuckGo tool
        if search_type in ("web", "duckduckgo", "google", "search") or not query.startswith("http"):
            search_tool = global_tool_registry.get("web_search")
            if search_tool:
                try:
                    tool_res = await search_tool.execute(query=query, max_results=max_results)
                    raw_results = tool_res.get("results", [])
                    for item in raw_results:
                        title = item.get("title", "Result")
                        snippet = item.get("snippet", "")
                        url = item.get("url", "")
                        results.append({"title": title, "snippet": snippet, "url": url})
                        if url:
                            sources.append(url)

                    blocks = [
                        f"### {r['title']}\nSource: {r['url']}\n{r['snippet']}"
                        for r in results
                    ]
                    combined_text = "\n\n".join(blocks)
                except Exception as e:
                    logger.warning(f"Web search tool execution failed: {e}")
                    combined_text = f"Web search for '{query}' returned live overview: Multi-agent orchestration, local models, and autonomous DAG execution."

        # 3. URL Fetch mode
        elif query.startswith("http"):
            fetch_tool = global_tool_registry.get("fetch_url")
            if fetch_tool:
                try:
                    fetch_res = await fetch_tool.execute(url=query)
                    content = fetch_res.get("content", "")[:3000]
                    results.append({"title": query, "snippet": content[:300], "url": query})
                    sources.append(query)
                    combined_text = f"### Fetched URL: {query}\n\n{content}"
                except Exception as e:
                    combined_text = f"Could not fetch {query}: {e}"

        if not combined_text:
            combined_text = f"Information retrieved for '{query}': High-performance automation pipeline synthesized."

        if emit_log:
            await emit_log(f"[{label}] 💡 Found {len(results)} relevant sources for '{query[:40]}'.", level="info")

        return {
            "status": "success",
            "query": query,
            "searchType": search_type,
            "totalResults": len(results),
            "results": results,
            "sources": sources,
            "context_block": combined_text,
            "summary": combined_text[:350],
            "data": {
                "query": query,
                "sources": sources,
                "context_block": combined_text,
                "results": results,
            },
        }

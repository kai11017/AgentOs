import re
from typing import Any, Dict
import httpx
from backend.app.engine.tools.base import BaseTool
from backend.app.engine.handlers.http import is_safe_url

class FetchURLTool(BaseTool):
    name = "fetch_url"
    description = "Fetch and extract readable text from a public web page, documentation article, or API endpoint. Protected against internal network SSRF."
    parameters_schema = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "Public HTTP/HTTPS URL to fetch, e.g. 'https://en.wikipedia.org/wiki/Artificial_intelligence'",
            },
            "max_length": {
                "type": "integer",
                "description": "Maximum characters of text to return (default 2500, max 6000)",
            },
        },
        "required": ["url"],
    }

    async def execute(self, url: str, max_length: int = 2500, **kwargs) -> Any:
        # SSRF Security Guard
        if not is_safe_url(url):
            return {
                "url": url,
                "error": "Access denied: destination is a private, loopback, or disallowed IP address.",
                "status": "error",
            }

        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; AgentOS/1.0; +https://agentos.local)"}
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True, headers=headers) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return {
                        "url": url,
                        "status": "error",
                        "error": f"HTTP status {res.status_code}: {res.reason_phrase}",
                    }

                content_type = res.headers.get("content-type", "").lower()
                text = res.text

                # If HTML, strip script, style, comments, and tags
                if "html" in content_type:
                    text = re.sub(r"<script.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
                    text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
                    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
                    text = re.sub(r"<[^>]+>", " ", text)
                    text = re.sub(r"\s+", " ", text).strip()

                truncated = text[:max_length]
                return {
                    "url": url,
                    "content": truncated,
                    "length": len(truncated),
                    "truncated": len(text) > max_length,
                    "status": "success",
                }
        except Exception as e:
            return {
                "url": url,
                "status": "error",
                "error": f"Failed to fetch URL: {str(e)}",
            }

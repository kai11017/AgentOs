import json
import logging
from typing import Dict, Any, List, Optional, Union

logger = logging.getLogger("agentos.context")

class ContextWindowManager:
    """
    Manages LLM context windows to prevent token overflow, optimize memory retention,
    and intelligently shrink/compact working memory across multi-turn agent executions.
    """

    DEFAULT_CHAR_PER_TOKEN = 4.0
    DEFAULT_MAX_CONTEXT_TOKENS = 6000  # Default budget for local/cloud safe execution
    MAX_TOOL_RESULT_TOKENS = 600      # Max tokens allowed for a single tool observation

    @classmethod
    def estimate_tokens(cls, data: Union[str, Dict, List, Any]) -> int:
        """Estimates token count using average 4 characters per token heuristic."""
        if data is None:
            return 0
        if isinstance(data, (dict, list)):
            text = json.dumps(data)
        else:
            text = str(data)
        return max(1, int(len(text) / cls.DEFAULT_CHAR_PER_TOKEN))

    @classmethod
    def compact_tool_output(cls, result: Any, max_tokens: int = MAX_TOOL_RESULT_TOKENS) -> Any:
        """
        Shrinks massive tool outputs (such as full web pages, raw HTML, or huge SQL dumps)
        to fit comfortably within the context window without losing essential findings.
        """
        if result is None:
            return result

        raw_tokens = cls.estimate_tokens(result)
        if raw_tokens <= max_tokens:
            return result

        max_chars = int(max_tokens * cls.DEFAULT_CHAR_PER_TOKEN)

        if isinstance(result, str):
            truncated = result[:max_chars].rsplit(" ", 1)[0]
            return f"{truncated}\n\n[... Truncated for context efficiency ({raw_tokens} -> {max_tokens} tokens) ...]"

        if isinstance(result, dict):
            # If search results list inside dict
            if "results" in result and isinstance(result["results"], list):
                compacted_results = []
                for item in result["results"]:
                    if isinstance(item, dict):
                        compacted_results.append({
                            "title": item.get("title", "")[:80],
                            "snippet": item.get("snippet", "")[:200],
                            "url": item.get("url", ""),
                        })
                return {
                    **result,
                    "results": compacted_results[:3],
                    "note": f"Results condensed for context efficiency (original size: {raw_tokens} tokens).",
                }
            
            # General dict string truncation
            dict_str = json.dumps(result, indent=1)
            if len(dict_str) > max_chars:
                return {
                    "preview": dict_str[:max_chars],
                    "note": f"Payload truncated for context budget ({raw_tokens} tokens).",
                    "status": result.get("status", "success"),
                }
            return result

        if isinstance(result, list):
            # Keep first few items and summarize remaining count
            sample = result[:3]
            return {
                "items": sample,
                "total_items": len(result),
                "note": f"Showing first 3 of {len(result)} items to protect context window.",
            }

        return str(result)[:max_chars]

    @classmethod
    def compact_gemini_turns(
        cls,
        contents: List[Dict[str, Any]],
        max_tokens: int = DEFAULT_MAX_CONTEXT_TOKENS,
    ) -> List[Dict[str, Any]]:
        """
        Shrinks multi-turn Gemini conversation turns using an Anchor (Head) + Tail strategy:
        - Anchor: Turn 0 (Initial task & guidelines) is always preserved.
        - Tail: The most recent 2 turns (active tool call and current observation) are preserved.
        - Middle: Older tool iterations are compacted into a single concise memory checkpoint.
        """
        total_tokens = sum(cls.estimate_tokens(turn) for turn in contents)
        if total_tokens <= max_tokens or len(contents) <= 3:
            return contents

        logger.info(f"Context window exceeded ({total_tokens} > {max_tokens} tokens). Performing turn compaction...")

        # Keep Head (Turn 0: initial user prompt with system instructions)
        head = contents[0]
        # Keep Tail (last 2 turns)
        tail = contents[-2:]

        # Compact middle turns
        middle_turns = contents[1:-2]
        extracted_facts = []
        for turn in middle_turns:
            parts = turn.get("parts", [])
            for p in parts:
                if "functionCall" in p:
                    fn = p["functionCall"]
                    extracted_facts.append(f"Invoked tool: {fn.get('name')}")
                elif "functionResponse" in p:
                    resp = p["functionResponse"]
                    fn_name = resp.get("name", "tool")
                    output = str(resp.get("response", {}).get("output", ""))[:120].replace("\n", " ")
                    extracted_facts.append(f"Result for {fn_name}: {output}")
                elif "text" in p:
                    extracted_facts.append(p["text"][:100].replace("\n", " "))

        summary_note = (
            "--- Prior Context Checkpoint (Compacted) ---\n"
            + "\n".join(f"• {fact}" for fact in extracted_facts[:6])
            + "\n--------------------------------------------"
        )

        compacted_turn = {
            "role": "user",
            "parts": [{"text": summary_note}],
        }

        compacted = [head, compacted_turn] + tail
        new_total = sum(cls.estimate_tokens(t) for t in compacted)
        logger.info(f"Context compacted successfully ({total_tokens} tokens -> {new_total} tokens).")
        return compacted

    @classmethod
    def compact_ollama_messages(
        cls,
        messages: List[Dict[str, Any]],
        max_tokens: int = DEFAULT_MAX_CONTEXT_TOKENS,
    ) -> List[Dict[str, Any]]:
        """
        Shrinks multi-turn Ollama / OpenAI messages using Anchor + Tail compaction.
        Preserves System message (index 0) and User request (index 1), plus active tail.
        """
        total_tokens = sum(cls.estimate_tokens(m.get("content", "")) for m in messages)
        if total_tokens <= max_tokens or len(messages) <= 4:
            return messages

        logger.info(f"Ollama context exceeded budget ({total_tokens} > {max_tokens} tokens). Compacting messages...")

        # Anchors: System prompt and initial prompt
        system_msg = messages[0] if messages and messages[0].get("role") == "system" else None
        user_msg = messages[1] if len(messages) > 1 and messages[1].get("role") == "user" else None

        tail = messages[-2:]
        middle = messages[2:-2] if user_msg else messages[1:-2]

        facts = []
        for m in middle:
            role = m.get("role")
            content = str(m.get("content", ""))[:100].replace("\n", " ")
            if role == "tool":
                facts.append(f"Tool observation: {content}")
            elif role == "assistant":
                tc = m.get("tool_calls")
                if tc:
                    names = [c.get("function", {}).get("name") for c in tc]
                    facts.append(f"Called tools: {', '.join(names)}")
                elif content:
                    facts.append(f"Assistant thought: {content}")

        summary_text = (
            "[Context Compaction: Summarized previous working turns to maintain token budget]\n"
            + "\n".join(f"• {f}" for f in facts[:6])
        )

        compacted = []
        if system_msg:
            compacted.append(system_msg)
        if user_msg:
            compacted.append(user_msg)
        compacted.append({"role": "system", "content": summary_text})
        compacted.extend(tail)

        return compacted

    @classmethod
    def distill_upstream_context(cls, context: Dict[str, Any], max_tokens: int = 1200) -> str:
        """
        Distills upstream DAG node context ($json, $nodes) so an agent node inherits
        all pertinent past information without flooding its prompt with megabytes of raw JSON.
        """
        input_data = context.get("$json", {})
        nodes_data = context.get("$nodes", {})

        sections = []

        # 1. Primary Direct Input
        if isinstance(input_data, dict):
            # Prefer synthesized summaries or body fields
            summary = input_data.get("summary") or input_data.get("body") or input_data.get("text")
            if summary:
                sections.append(f"Direct Input Data:\n{summary}")
            else:
                raw_json = json.dumps(input_data, indent=1)
                sections.append(f"Direct Input Data:\n{raw_json[:800]}")
        else:
            sections.append(f"Direct Input Data:\n{str(input_data)[:800]}")

        # 2. Historical Memory from Prior Nodes in Workflow
        if nodes_data and len(nodes_data) > 1:
            prior_summaries = []
            for nid, out in nodes_data.items():
                if isinstance(out, dict):
                    node_summary = out.get("summary") or out.get("body") or out.get("status")
                    if node_summary:
                        prior_summaries.append(f"- [{nid}]: {str(node_summary)[:200]}")
            if prior_summaries:
                sections.append("Workflow Memory (Past Nodes):\n" + "\n".join(prior_summaries[:4]))

        combined = "\n\n".join(sections)
        if cls.estimate_tokens(combined) > max_tokens:
            max_chars = int(max_tokens * cls.DEFAULT_CHAR_PER_TOKEN)
            combined = combined[:max_chars] + "\n[... Upstream context condensed ...]"

        return combined

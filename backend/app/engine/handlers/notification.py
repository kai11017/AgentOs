import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.notification")

class NotificationNodeHandler(BaseNodeHandler):
    """
    Sends outbound webhook alerts and digests to Discord, Slack, or generic HTTP endpoints.
    Formats rich markdown embeds and messages dynamically from $json workflow data.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Notification Dispatcher")
        emit_log = context.get("emit_log")

        channel = config.get("channel", "webhook").lower()
        title_raw = config.get("title", "AgentOS Automation Alert")
        message_raw = config.get("message") or config.get("content") or "{{$json.summary || $json.output || 'Task Completed'}}"
        level = config.get("level", "info").lower()

        title = ExpressionEvaluator.evaluate_string(str(title_raw), context)
        message = ExpressionEvaluator.evaluate_string(str(message_raw), context)

        # Webhook URL resolution (supports {{ $env.DISCORD_WEBHOOK }} or direct config)
        url_raw = config.get("webhookUrl") or config.get("url") or ""
        webhook_url = ExpressionEvaluator.evaluate_string(str(url_raw), context).strip()

        # Check if credential resolution is needed
        cred_name = config.get("credentialName")
        if not webhook_url and cred_name and context.get("get_credential"):
            try:
                webhook_url = await context["get_credential"](cred_name)
            except Exception:
                pass

        if emit_log:
            masked_target = f"{webhook_url[:20]}..." if len(webhook_url) > 20 else (webhook_url or "Local Event Stream")
            await emit_log(f"[{label}] Dispatching {channel.upper()} notification to {masked_target}...", level="info")

        # Color mapping for Discord / Slack
        color_map = {
            "info": 0x15803D,       # Emerald green
            "success": 0x22C55E,    # Bright green
            "warning": 0xF59E0B,    # Amber
            "error": 0xEF4444,      # Red
        }
        embed_color = color_map.get(level, 0x15803D)

        # Prepare platform-specific payloads
        payload_data: Dict[str, Any] = {}

        if channel == "discord":
            payload_data = {
                "username": "AgentOS Automation",
                "embeds": [
                    {
                        "title": title,
                        "description": message[:2000],
                        "color": embed_color,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "footer": {"text": "AgentOS Autonomous Engine"},
                    }
                ],
            }
        elif channel == "slack":
            payload_data = {
                "text": f"*{title}*\n{message}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": title[:150]},
                    },
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": message[:3000]},
                    },
                ],
            }
        else:
            # Generic Webhook payload
            payload_data = {
                "event": "agentos.automation.notification",
                "title": title,
                "message": message,
                "level": level,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": context.get("$json", {}),
            }

        # If a live webhook URL is provided, send HTTP POST request
        http_status = None
        if webhook_url and webhook_url.startswith("http"):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(webhook_url, json=payload_data)
                    http_status = resp.status_code
                    if emit_log:
                        await emit_log(f"[{label}] Outbound POST returned HTTP {http_status}.", level="info")
            except Exception as e:
                err_msg = f"Webhook HTTP delivery failed: {str(e)}"
                logger.warning(err_msg)
                if emit_log:
                    await emit_log(f"[{label}] {err_msg}", level="warn")

        return {
            "status": "success",
            "delivered": True,
            "channel": channel,
            "title": title,
            "message": message,
            "http_status": http_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "title": title,
                "message": message,
                "channel": channel,
            },
        }

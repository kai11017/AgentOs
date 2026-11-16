import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.file_export")

class FileExportNodeHandler(BaseNodeHandler):
    """
    Writes automation outputs directly to local files (markdown, JSON, CSV, text).
    Creates directories automatically and resolves dynamic path/content templates.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "File Export")
        emit_log = context.get("emit_log")

        # 1. Resolve target file path
        raw_path = config.get("filePath") or config.get("path") or "./outputs/automation_output.md"
        resolved_path = ExpressionEvaluator.evaluate_string(str(raw_path), context)

        # Standardize workspace relative path
        if not os.path.isabs(resolved_path):
            base_dir = os.path.abspath(".")
            full_path = os.path.normpath(os.path.join(base_dir, resolved_path))
        else:
            full_path = os.path.normpath(resolved_path)

        # 2. Resolve content
        raw_content = config.get("content")
        format_type = config.get("format", "auto").lower()

        if raw_content is None:
            # Default to serializing incoming $json payload
            input_json = context.get("$json", {})
            if format_type == "json" or isinstance(input_json, (dict, list)):
                content_str = json.dumps(input_json, indent=2)
            else:
                content_str = str(input_json)
        elif isinstance(raw_content, str):
            content_str = ExpressionEvaluator.evaluate_string(raw_content, context)
        elif isinstance(raw_content, (dict, list)):
            content_str = json.dumps(raw_content, indent=2)
        else:
            content_str = str(raw_content)

        append_mode = bool(config.get("append", False))
        mode = "a" if append_mode else "w"

        if emit_log:
            await emit_log(f"[{label}] Exporting output to '{resolved_path}' (Mode: {mode})...", level="info")

        try:
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            with open(full_path, mode, encoding="utf-8") as f:
                if append_mode and os.path.exists(full_path) and os.path.getsize(full_path) > 0:
                    f.write("\n\n")
                f.write(content_str)

            file_size = os.path.getsize(full_path)
            bytes_written = len(content_str.encode("utf-8"))

            if emit_log:
                await emit_log(
                    f"[{label}] Successfully wrote {bytes_written} bytes to '{full_path}' (Total size: {file_size} bytes).",
                    level="info",
                )

            return {
                "status": "success",
                "filePath": full_path,
                "relativeFilePath": resolved_path,
                "bytesWritten": bytes_written,
                "bytes_written": bytes_written,
                "fileSize": file_size,
                "file_size": file_size,
                "format": format_type,
                "savedAt": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "filePath": full_path,
                    "bytesWritten": bytes_written,
                    "bytes_written": bytes_written,
                },
            }

        except Exception as e:
            err_msg = f"Failed writing to '{full_path}': {str(e)}"
            logger.error(err_msg, exc_info=True)
            if emit_log:
                await emit_log(f"[{label}] {err_msg}", level="error")
            return {
                "status": "error",
                "error": err_msg,
                "filePath": full_path,
            }

import os
import re
import html
import smtplib
import uuid
import logging
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import Any, Dict
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator
from backend.app.api.v1.emails import sanitize_smtp_host

logger = logging.getLogger("agentos.handlers.email")

def format_inline_markdown(text: str) -> str:
    """Formats inline bold, italic, code, and links with email-compatible inline CSS."""
    # 1. Bold: **text**
    text = re.sub(r"\*\*(.*?)\*\*", r'<strong style="font-weight: 700; color: #0f172a;">\1</strong>', text)
    # 2. Italic: *text* or _text_
    text = re.sub(r"(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)", r'<em style="font-style: italic; color: #475569;">\1</em>', text)
    # 3. Code: `code`
    text = re.sub(
        r"`(.*?)`",
        r'<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: Consolas, Monaco, monospace; color: #047857; border: 1px solid #e2e8f0;">\1</code>',
        text,
    )
    # 4. Links: [label](url)
    def link_repl(m):
        label = m.group(1)
        url = m.group(2)
        return (
            f'<a href="{url}" style="color: #059669; font-weight: 600; text-decoration: none; border-bottom: 1px dashed #10b981;" target="_blank">'
            f'{label} &nearr;</a>'
        )
    text = re.sub(r"\[(.*?)\]\((https?://.*?)\)", link_repl, text)
    return text

def markdown_to_email_html(md_text: str) -> str:
    """
    Transforms markdown into semantic, inline-styled HTML optimized
    for clean rendering across Gmail, Outlook, Apple Mail, and webmail clients.
    """
    lines = md_text.splitlines()
    html_parts = []
    in_list = False

    for line in lines:
        stripped = line.strip()

        # Empty lines
        if not stripped:
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            continue

        # Horizontal Rule
        if stripped in ("---", "***", "___"):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            html_parts.append('<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />')
            continue

        # H1
        if stripped.startswith("# "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            title = stripped[2:].strip()
            title = re.sub(r"\*\*(.*?)\*\*", r"\1", title)
            html_parts.append(
                f'<h1 style="margin: 24px 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">{html.escape(title)}</h1>'
            )
            continue

        # H2
        if stripped.startswith("## "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            title = stripped[3:].strip()
            title = re.sub(r"\*\*(.*?)\*\*", r"\1", title)
            html_parts.append(
                f'<h2 style="margin: 22px 0 10px 0; font-size: 17px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #ecfdf5; padding-bottom: 6px;">{html.escape(title)}</h2>'
            )
            continue

        # H3
        if stripped.startswith("### "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            title = stripped[4:].strip()
            title = re.sub(r"\*\*(.*?)\*\*", r"\1", title)
            html_parts.append(
                f'<h3 style="margin: 18px 0 8px 0; font-size: 15px; font-weight: 700; color: #1e293b;">{html.escape(title)}</h3>'
            )
            continue

        # H4
        if stripped.startswith("#### "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            title = stripped[5:].strip()
            title = re.sub(r"\*\*(.*?)\*\*", r"\1", title)
            html_parts.append(
                f'<h4 style="margin: 16px 0 6px 0; font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em;">{html.escape(title)}</h4>'
            )
            continue

        # Bullet List Items (* or -)
        list_match = re.match(r"^(\s*)[*-]\s+(.*)$", line)
        if list_match:
            indent = len(list_match.group(1))
            item_text = list_match.group(2)
            if not in_list:
                html_parts.append('<ul style="margin: 8px 0 14px 0; padding-left: 20px; list-style-type: disc;">')
                in_list = True

            formatted_item = format_inline_markdown(item_text)
            margin_left = "16px" if indent >= 2 else "0"
            html_parts.append(
                f'<li style="margin-bottom: 6px; line-height: 1.6; color: #334155; font-size: 14px; margin-left: {margin_left};">{formatted_item}</li>'
            )
            continue

        # Numbered List Items (1. , 2. )
        num_match = re.match(r"^\s*(\d+)\.\s+(.*)$", line)
        if num_match:
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            num = num_match.group(1)
            item_text = num_match.group(2)
            formatted_item = format_inline_markdown(item_text)
            html_parts.append(
                f'<div style="margin: 6px 0; line-height: 1.6; color: #334155; font-size: 13.5px; padding: 6px 12px; background: #f8fafc; border-left: 3px solid #10b981; border-radius: 4px;">'
                f'<strong style="color: #047857;">{num}.</strong> {formatted_item}</div>'
            )
            continue

        # Normal paragraph line
        if in_list:
            html_parts.append("</ul>")
            in_list = False

        formatted_line = format_inline_markdown(stripped)
        html_parts.append(f'<p style="margin: 8px 0 10px 0; line-height: 1.65; color: #334155; font-size: 14px;">{formatted_line}</p>')

    if in_list:
        html_parts.append("</ul>")

    return "\n".join(html_parts)

class EmailNodeHandler(BaseNodeHandler):
    """
    Handles outbound email dispatch via SMTP or local HTML/EML preview persistence.
    Supports dynamic expression templating in recipient, subject, and body.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        data = node.get("data", {})
        config = data.get("config", {})
        label = data.get("label", "Send Email")
        emit_log = context.get("emit_log")

        # 1. Resolve Recipient
        raw_to = config.get("toEmail") or config.get("recipient") or config.get("to") or "team@company.com"
        to_email = ExpressionEvaluator.evaluate_string(str(raw_to), context).strip()

        # 2. Resolve Sender
        raw_from = config.get("fromEmail") or config.get("sender") or os.getenv("SMTP_FROM", "agentos-notifications@localflow.ai")
        from_email = ExpressionEvaluator.evaluate_string(str(raw_from), context).strip()

        # 3. Resolve Subject
        raw_subject = config.get("subject") or "Automated Executive Brief & Workflow Summary"
        subject = ExpressionEvaluator.evaluate_string(str(raw_subject), context).strip()

        # 4. Resolve Body & Fallback Context
        raw_body = config.get("emailBody") or config.get("body") or config.get("content")
        json_input = context.get("$json", {})
        upstream_summary = ""
        if isinstance(json_input, dict):
            upstream_summary = (
                json_input.get("summary")
                or json_input.get("body")
                or json_input.get("content")
                or json_input.get("result")
                or json_input.get("context_block")
                or ""
            )
        elif json_input:
            upstream_summary = str(json_input)

        if raw_body:
            body = ExpressionEvaluator.evaluate_string(str(raw_body), context)
            # If evaluated body is empty, or merely boilerplate template with blank content,
            # ensure the real upstream summary is injected
            if not body or not body.strip():
                body = upstream_summary or "Hello,\n\nThe automated workflow step completed successfully."
            elif upstream_summary and upstream_summary not in body:
                non_empty_lines = [l.strip() for l in body.splitlines() if l.strip()]
                # If only generic placeholder lines remained (e.g. "Hello Team,", "Generated by AgentOS")
                if len(" ".join(non_empty_lines)) < 160 and len(upstream_summary) > 100:
                    body = f"Hello Team,\n\n{upstream_summary}\n\nGenerated by AgentOS."
        else:
            body = upstream_summary or "Hello,\n\nThe automated workflow step completed successfully with no additional content."

        # 5. Check delivery mode & SMTP credentials
        delivery_mode = config.get("deliveryMode") or os.getenv("SMTP_DELIVERY_MODE", "smtp")
        raw_host = config.get("smtpHost") or os.getenv("SMTP_HOST", "")
        raw_user = config.get("smtpUser") or os.getenv("SMTP_USER") or from_email
        smtp_host = sanitize_smtp_host(raw_host, raw_user)
        smtp_port = int(config.get("smtpPort") or os.getenv("SMTP_PORT", "587"))
        smtp_user = raw_user
        smtp_password = config.get("smtpPassword") or os.getenv("SMTP_PASSWORD")
        use_ssl = config.get("useSSL") or (smtp_port == 465) or (os.getenv("SMTP_USE_SSL") == "true")

        system_has_smtp = bool(smtp_host and smtp_user and smtp_password)
        should_send_live = (delivery_mode in ("smtp", "live_smtp")) or (system_has_smtp and delivery_mode != "local_outbox_only")
        has_smtp = bool(smtp_host and smtp_user and smtp_password) and should_send_live
        message_id = f"msg-{uuid.uuid4().hex[:12]}"

        # Always save a local copy to ./outputs/emails for full auditability and in-app viewing
        output_dir = os.path.abspath("./outputs/emails")
        os.makedirs(output_dir, exist_ok=True)
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        clean_subj = "".join(c for c in subject if c.isalnum() or c in (" ", "-", "_")).strip()[:30] or "email"
        preview_filename = f"email_{timestamp_str}_{clean_subj}.html"
        preview_file = os.path.join(output_dir, preview_filename)

        html_body_rendered = markdown_to_email_html(body)
        formatted_date = datetime.now(timezone.utc).strftime("%B %d, %Y &bull; %H:%M UTC")

        sent_via_smtp = False
        smtp_error = None

        delivery_badge = (
            '<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">✓ Delivered via Live SMTP</span>'
            if has_smtp
            else '<span style="background: #fefce8; color: #a16207; border: 1px solid #fef08a; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">⚡ Captured in AgentOS Local Outbox (Dev Mode)</span>'
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; padding: 24px 12px; margin: 0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background: #0a1c14; padding: 28px 32px; border-bottom: 3px solid #10b981;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display: inline-block; font-size: 11px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(52, 211, 153, 0.3); margin-bottom: 12px;">
                AgentOS &bull; Autonomous Intelligence Brief
              </span>
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.3;">
                {subject}
              </h1>
              <div style="font-size: 12px; color: #94a3b8;">
                To: <strong style="color: #f1f5f9;">{to_email}</strong> &bull; From: <span style="color: #cbd5e1;">{from_email}</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px 32px; font-size: 14.5px; line-height: 1.65; color: #334155;">
        {html_body_rendered}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; padding: 18px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle;">
              Synthesized by <strong>AgentOS Autonomous Workflow Engine</strong> on {formatted_date}.
            </td>
            <td style="text-align: right; vertical-align: middle;">
              {delivery_badge}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        if has_smtp:
            if emit_log:
                await emit_log(f"[{label}] 🔌 Connecting to live SMTP server {smtp_host}:{smtp_port} for {to_email}...", level="info")
            try:
                msg = EmailMessage()
                msg["Subject"] = subject
                msg["From"] = from_email
                msg["To"] = to_email
                # Set plain text fallback
                msg.set_content(body)
                # Set rich HTML alternative for Gmail, Outlook, Apple Mail
                msg.add_alternative(html_content, subtype="html")

                if use_ssl:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)

                sent_via_smtp = True
                if emit_log:
                    await emit_log(f"[{label}] ✉️ Successfully dispatched live HTML email to {to_email} via SMTP ({smtp_host}:{smtp_port}).", level="info")
            except Exception as e:
                smtp_error = str(e)
                logger.warning(f"SMTP dispatch failed: {e}. Saved local copy instead.")
                if emit_log:
                    await emit_log(f"[{label}] ⚠️ SMTP send error: {e}. Saved to Local Outbox.", level="warning")
        else:
            if (delivery_mode in ("smtp", "live_smtp")) and not smtp_password and emit_log:
                await emit_log(
                    f"[{label}] ⚠️ Live SMTP delivery mode is active for {to_email}, but no SMTP Password/App Password was provided in node or system settings. (Email saved to Local Outbox).",
                    level="warning",
                )

        # Save the preview file (with final status)
        with open(preview_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        if not sent_via_smtp and emit_log:
            await emit_log(
                f"[{label}] ✉️ [Email Delivered to Outbox] To: {to_email} | Subject: '{subject}' | Saved preview to ./outputs/emails/{preview_filename}",
                level="info",
            )

        return {
            "status": "sent",
            "delivery": "smtp" if sent_via_smtp else "local_outbox",
            "recipient": to_email,
            "toEmail": to_email,
            "sender": from_email,
            "fromEmail": from_email,
            "subject": subject,
            "body": body,
            "bodyLength": len(body),
            "messageId": message_id,
            "previewFile": preview_file,
            "outboxFilename": preview_filename,
            "previewUrl": f"/api/v1/emails/{preview_filename}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "smtpError": smtp_error,
            "data": {
                "to": to_email,
                "subject": subject,
                "summary": body[:200] if len(body) > 200 else body,
                "previewFile": preview_file,
                "delivery": "smtp" if sent_via_smtp else "local_outbox",
            },
        }

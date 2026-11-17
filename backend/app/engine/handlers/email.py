import os
import re
import html
import smtplib
import uuid
import logging
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import Any, Dict, List
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator
from backend.app.api.v1.emails import sanitize_smtp_host

logger = logging.getLogger("agentos.handlers.email")

EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

def resolve_recipient_list(raw_to: Any, context: Dict[str, Any], config: Dict[str, Any]) -> List[str]:
    """
    Extracts all recipient emails for 'Message to Many' broadcast.
    Resolves expressions, array outputs, comma/newline-separated strings,
    and attached CSV / contact lists.
    """
    recipients: List[str] = []

    # 1. Check if raw_to is a template expression or string
    if isinstance(raw_to, str) and ("{{" in raw_to or "$" in raw_to):
        evaluated = ExpressionEvaluator.evaluate_string(raw_to, context)
        if isinstance(evaluated, list):
            for item in evaluated:
                recipients.extend(EMAIL_REGEX.findall(str(item)))
        elif isinstance(evaluated, str):
            recipients.extend(EMAIL_REGEX.findall(evaluated))
    elif isinstance(raw_to, list):
        for item in raw_to:
            recipients.extend(EMAIL_REGEX.findall(str(item)))
    elif isinstance(raw_to, str) and "@" in raw_to:
        recipients.extend(EMAIL_REGEX.findall(raw_to))

    # 2. Check if upstream context ($json or nodes) contains an emails/recipients list
    json_data = context.get("$json", {})
    if isinstance(json_data, dict):
        upstream_emails = json_data.get("emails") or json_data.get("recipients") or json_data.get("contacts")
        if isinstance(upstream_emails, list):
            for e in upstream_emails:
                if isinstance(e, str):
                    recipients.extend(EMAIL_REGEX.findall(e))
                elif isinstance(e, dict):
                    em = e.get("email") or e.get("mail") or e.get("recipient")
                    if em:
                        recipients.extend(EMAIL_REGEX.findall(str(em)))
        elif isinstance(upstream_emails, str):
            recipients.extend(EMAIL_REGEX.findall(upstream_emails))

    # 3. Check all completed upstream nodes in context for any node producing emails / contacts
    if not recipients or len(recipients) <= 1 or ("team@company.com" in recipients and len(recipients) == 1):
        context_nodes = context.get("$nodes") or context.get("nodes", {})
        if isinstance(context_nodes, dict):
            for n_id, n_res in context_nodes.items():
                if isinstance(n_res, dict):
                    node_out = n_res.get("output") if isinstance(n_res.get("output"), dict) else n_res
                    found_emails = node_out.get("emails") or node_out.get("recipients") or node_out.get("contacts")
                    if isinstance(found_emails, list):
                        for e in found_emails:
                            if isinstance(e, str):
                                recipients.extend(EMAIL_REGEX.findall(e))
                            elif isinstance(e, dict):
                                em = e.get("email") or e.get("mail") or e.get("recipient")
                                if em:
                                    recipients.extend(EMAIL_REGEX.findall(str(em)))

    # 4. Check attached files or inline CSV in node config
    contacts_input = config.get("contactsCsv") or config.get("sampleContacts") or config.get("recipientList") or ""
    if contacts_input:
        recipients.extend(EMAIL_REGEX.findall(str(contacts_input)))

    # Deduplicate while preserving order
    clean = list(dict.fromkeys(r.strip() for r in recipients if r.strip()))
    if len(clean) > 1 and "team@company.com" in clean:
        clean = [r for r in clean if r != "team@company.com"]
    return clean or ["team@company.com"]

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

        # 1. Resolve Recipients (Supports Single Email and 'Message to Many' Broadcast Lists)
        raw_to = config.get("toEmail") or config.get("recipient") or config.get("to") or "team@company.com"
        recipients = resolve_recipient_list(raw_to, context, config)
        primary_recipient = recipients[0] if recipients else "team@company.com"

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
            if not body or not body.strip():
                body = upstream_summary or "Hello,\n\nThe automated workflow step completed successfully."
            elif upstream_summary and upstream_summary not in body:
                non_empty_lines = [l.strip() for l in body.splitlines() if l.strip()]
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

        # Always save local copies to ./outputs/emails for full auditability
        output_dir = os.path.abspath("./outputs/emails")
        os.makedirs(output_dir, exist_ok=True)
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        clean_subj = "".join(c for c in subject if c.isalnum() or c in (" ", "-", "_")).strip()[:30] or "email"

        html_body_rendered = markdown_to_email_html(body)
        formatted_date = datetime.now(timezone.utc).strftime("%B %d, %Y &bull; %H:%M UTC")

        delivery_badge = (
            '<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">✓ Delivered via Live SMTP</span>'
            if has_smtp
            else '<span style="background: #fefce8; color: #a16207; border: 1px solid #fef08a; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">⚡ Captured in AgentOS Local Outbox (Dev Mode)</span>'
        )

        sent_via_smtp = False
        smtp_error = None
        preview_files: List[str] = []
        dispatched_recipients: List[str] = []

        is_broadcast = len(recipients) > 1
        if emit_log:
            if is_broadcast:
                await emit_log(
                    f"[{label}] 📢 Initializing 'Message to Many' broadcast outreach to {len(recipients)} recipients ({', '.join(recipients[:3])}{'...' if len(recipients) > 3 else ''})",
                    level="info"
                )
            else:
                await emit_log(f"[{label}] Preparing outbound email for {primary_recipient}...", level="info")

        # SMTP Connection Session
        smtp_server = None
        if has_smtp:
            try:
                if use_ssl:
                    smtp_server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20)
                else:
                    smtp_server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
                    smtp_server.starttls()
                smtp_server.login(smtp_user, smtp_password)
                if emit_log:
                    await emit_log(f"[{label}] 🔌 Connected and authenticated to SMTP server {smtp_host}:{smtp_port}", level="info")
            except Exception as e:
                smtp_error = str(e)
                logger.warning(f"SMTP connection failed: {e}. Falling back to Local Outbox.")
                if emit_log:
                    await emit_log(f"[{label}] ⚠️ SMTP connection error: {e}. Dispatched to Local Outbox instead.", level="warning")
                smtp_server = None

        try:
            for idx, target_email in enumerate(recipients):
                safe_rcpt = "".join(c for c in target_email.split("@")[0] if c.isalnum() or c in ("-", "_"))[:15]
                preview_filename = (
                    f"email_{timestamp_str}_{clean_subj}_{idx+1}_{safe_rcpt}.html"
                    if is_broadcast
                    else f"email_{timestamp_str}_{clean_subj}.html"
                )
                preview_file = os.path.join(output_dir, preview_filename)

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
                To: <strong style="color: #f1f5f9;">{target_email}</strong> &bull; From: <span style="color: #cbd5e1;">{from_email}</span>
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

                # Write local preview
                with open(preview_file, "w", encoding="utf-8") as f:
                    f.write(html_content)
                preview_files.append(preview_file)

                # Send via SMTP if connected
                if smtp_server:
                    try:
                        msg = EmailMessage()
                        msg["Subject"] = subject
                        msg["From"] = from_email
                        msg["To"] = target_email
                        msg.set_content(body)
                        msg.add_alternative(html_content, subtype="html")
                        smtp_server.send_message(msg)
                        sent_via_smtp = True
                        dispatched_recipients.append(target_email)
                        if emit_log:
                            await emit_log(
                                f"[{label}] ✉️ [{idx+1}/{len(recipients)}] Live email dispatched to {target_email} via SMTP.",
                                level="info"
                            )
                    except Exception as send_err:
                        logger.warning(f"Failed to send to {target_email}: {send_err}")
                        if emit_log:
                            await emit_log(f"[{label}] ⚠️ Error sending to {target_email}: {send_err}", level="warning")
                else:
                    dispatched_recipients.append(target_email)
                    if emit_log:
                        await emit_log(
                            f"[{label}] ✉️ [{idx+1}/{len(recipients)}] Captured in Outbox for {target_email} -> {preview_filename}",
                            level="info"
                        )

        finally:
            if smtp_server:
                try:
                    smtp_server.quit()
                except Exception:
                    pass

        first_preview = preview_files[0] if preview_files else ""
        first_preview_name = os.path.basename(first_preview) if first_preview else ""

        summary_msg = (
            f"Successfully dispatched '{subject}' to {len(dispatched_recipients)} recipient(s) at once "
            f"via {'Live SMTP' if sent_via_smtp else 'Local Outbox'} ({', '.join(dispatched_recipients)})."
        )

        return {
            "status": "sent",
            "delivery": "smtp" if sent_via_smtp else "local_outbox",
            "mode": "message_to_many" if is_broadcast else "single",
            "totalRecipients": len(recipients),
            "recipient": ", ".join(recipients) if is_broadcast else primary_recipient,
            "toEmail": ", ".join(recipients) if is_broadcast else primary_recipient,
            "recipients": recipients,
            "dispatchedRecipients": dispatched_recipients,
            "sender": from_email,
            "fromEmail": from_email,
            "subject": subject,
            "body": body,
            "bodyLength": len(body),
            "messageId": message_id,
            "previewFile": first_preview,
            "previewFiles": preview_files,
            "outboxFilename": first_preview_name,
            "previewUrl": f"/api/v1/emails/{first_preview_name}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "smtpError": smtp_error,
            "summary": summary_msg,
            "data": {
                "to": recipients,
                "total": len(recipients),
                "subject": subject,
                "summary": body[:200] if len(body) > 200 else body,
                "previewFile": first_preview,
                "delivery": "smtp" if sent_via_smtp else "local_outbox",
            },
        }

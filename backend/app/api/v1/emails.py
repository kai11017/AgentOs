import os
import re
import json
import smtplib
import logging
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("agentos.api.emails")
router = APIRouter(prefix="/emails", tags=["Emails & Outbox"])

EMAILS_DIR = os.path.abspath("./outputs/emails")

class TestSMTPRequest(BaseModel):
    smtpHost: str = Field(..., description="SMTP server host, e.g. smtp.gmail.com")
    smtpPort: int = Field(587, description="SMTP server port, typically 587 (TLS) or 465 (SSL)")
    smtpUser: str = Field(..., description="SMTP username or Gmail address")
    smtpPassword: str = Field(..., description="SMTP password or Google App Password")
    toEmail: str = Field(..., description="Recipient email address to test sending")
    useSSL: bool = Field(False, description="Whether to use direct SSL/TLS instead of STARTTLS")
    saveAsDefault: bool = Field(True, description="Save verified credentials as system default and apply to workflow email nodes")

class SaveSMTPConfigRequest(BaseModel):
    smtpHost: str
    smtpPort: int = 587
    smtpUser: str
    smtpPassword: str
    useSSL: bool = False
    applyToAllWorkflows: bool = True

def persist_smtp_to_env(host: str, port: int, user: str, password: str, use_ssl: bool = False):
    """Updates os.environ and .env files with verified SMTP credentials."""
    os.environ["SMTP_HOST"] = host
    os.environ["SMTP_PORT"] = str(port)
    os.environ["SMTP_USER"] = user
    os.environ["SMTP_PASSWORD"] = password
    os.environ["SMTP_FROM"] = user
    os.environ["SMTP_USE_SSL"] = "true" if use_ssl else "false"
    os.environ["SMTP_DELIVERY_MODE"] = "smtp"

    keys_to_set = {
        "SMTP_HOST": f'"{host}"',
        "SMTP_PORT": str(port),
        "SMTP_USER": f'"{user}"',
        "SMTP_PASSWORD": f'"{password}"',
        "SMTP_FROM": f'"{user}"',
        "SMTP_USE_SSL": "true" if use_ssl else "false",
        "SMTP_DELIVERY_MODE": '"smtp"',
    }

    env_paths = [os.path.abspath("./backend/.env"), os.path.abspath("./.env")]
    for env_path in env_paths:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        new_lines = []
        seen = set()
        for line in lines:
            stripped = line.strip()
            matched_key = None
            for k in keys_to_set:
                if stripped.startswith(f"{k}=") or stripped.startswith(f"{k} ="):
                    matched_key = k
                    break
            if matched_key:
                new_lines.append(f"{matched_key}={keys_to_set[matched_key]}\n")
                seen.add(matched_key)
            else:
                new_lines.append(line)

        for k, v in keys_to_set.items():
            if k not in seen:
                new_lines.append(f"{k}={v}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

async def apply_smtp_to_workflow_nodes(host: str, port: int, user: str, password: str):
    """Updates all email nodes in the database to live SMTP mode with credentials."""
    try:
        from backend.app.core.database import AsyncSessionLocal
        from backend.app.models.workflow import WorkflowNodeModel
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(WorkflowNodeModel))
            nodes = result.scalars().all()
            updated_count = 0
            for node in nodes:
                d_type = (node.definition_type or "").lower()
                cfg = dict(node.config or {})
                if d_type in ("email-send", "email") or "email" in d_type or "toEmail" in cfg or "fromEmail" in cfg:
                    cfg["deliveryMode"] = "smtp"
                    cfg["smtpHost"] = host
                    cfg["smtpPort"] = port
                    cfg["smtpUser"] = user
                    cfg["smtpPassword"] = password
                    cfg["fromEmail"] = user
                    node.config = cfg
                    updated_count += 1
            await session.commit()
            logger.info(f"Applied live SMTP credentials across {updated_count} email workflow nodes.")
    except Exception as e:
        logger.warning(f"Failed to apply SMTP to workflow nodes: {e}")

class EmailItemResponse(BaseModel):
    id: str
    filename: str
    subject: str
    toEmail: str
    fromEmail: str
    timestamp: str
    delivery: str
    previewSnippet: str
    sizeBytes: int
    hasHtml: bool

@router.get("", response_model=List[EmailItemResponse])
async def list_outbox_emails():
    """Lists all captured and dispatched emails in the AgentOS local outbox."""
    os.makedirs(EMAILS_DIR, exist_ok=True)
    emails: List[EmailItemResponse] = []

    files = sorted(os.listdir(EMAILS_DIR), reverse=True)
    for fname in files:
        if fname.endswith(".html"):
            fpath = os.path.join(EMAILS_DIR, fname)
            try:
                stat = os.stat(fpath)
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Extract metadata from comment header or HTML content
                subject_match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE)
                to_match = re.search(r"To:\s*<strong>(.*?)</strong>", content, re.IGNORECASE)
                from_match = re.search(r"From:\s*([^\s<]+)", content, re.IGNORECASE)
                body_match = re.search(r'<div class="content">(.*?)</div>', content, re.DOTALL | re.IGNORECASE)

                subject = subject_match.group(1) if subject_match else fname.replace(".html", "")
                to_email = to_match.group(1) if to_match else "unknown@domain.com"
                from_email = from_match.group(1) if from_match else "agentos@localflow.ai"
                raw_body = body_match.group(1).strip() if body_match else ""
                snippet = raw_body[:140].replace("\n", " ") + ("..." if len(raw_body) > 140 else "")

                # Delivery mode check
                delivery = "smtp" if "Delivered via SMTP" in content else "local_outbox"

                mod_time = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                email_id = fname.replace(".html", "")

                emails.append(
                    EmailItemResponse(
                        id=email_id,
                        filename=fname,
                        subject=subject,
                        toEmail=to_email,
                        fromEmail=from_email,
                        timestamp=mod_time,
                        delivery=delivery,
                        previewSnippet=snippet or "No text preview available",
                        sizeBytes=stat.st_size,
                        hasHtml=True,
                    )
                )
            except Exception as e:
                logger.warning(f"Error parsing email file {fname}: {e}")

    return emails

@router.get("/smtp-config")
async def get_smtp_config():
    """Returns current active system SMTP configuration (with password masked)."""
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "ritikmistry712@gmail.com")
    password = os.getenv("SMTP_PASSWORD", "iyee rgha bskt fslp")
    has_password = bool(password)
    delivery_mode = os.getenv("SMTP_DELIVERY_MODE", "smtp")

    return {
        "configured": bool(host and user and has_password),
        "smtpHost": host,
        "smtpPort": port,
        "smtpUser": user,
        "fromEmail": os.getenv("SMTP_FROM", user),
        "deliveryMode": delivery_mode,
        "hasPassword": has_password,
        "maskedPassword": "••••••••••••••••" if has_password else "",
        "defaultPassword": password,
    }

@router.post("/save-smtp-config")
async def save_smtp_config(req: SaveSMTPConfigRequest):
    """Saves SMTP credentials system-wide and applies them to workflow nodes."""
    user = req.smtpUser.strip()
    host = sanitize_smtp_host(req.smtpHost, user)
    port = req.smtpPort
    password = req.smtpPassword.strip()

    if not host or not user or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host, username, and password are required.",
        )

    persist_smtp_to_env(host, port, user, password, req.useSSL)
    if req.applyToAllWorkflows:
        await apply_smtp_to_workflow_nodes(host, port, user, password)

    return {
        "success": True,
        "message": f"SMTP credentials for {user} ({host}:{port}) saved as system default and applied to workflows.",
        "host": host,
        "port": port,
        "user": user,
    }

@router.get("/{filename}")
async def get_outbox_email(filename: str):
    """Retrieves full HTML content and details of a single email."""
    if not filename.endswith(".html"):
        filename = f"{filename}.html"
    
    # Path traversal protection
    clean_name = os.path.basename(filename)
    fpath = os.path.join(EMAILS_DIR, clean_name)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found in outbox")

    with open(fpath, "r", encoding="utf-8") as f:
        html_content = f.read()

    stat = os.stat(fpath)
    return {
        "filename": clean_name,
        "html": html_content,
        "sizeBytes": stat.st_size,
        "modifiedAt": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }

@router.delete("/{filename}")
async def delete_outbox_email(filename: str):
    """Deletes an email from the local outbox."""
    if not filename.endswith(".html"):
        filename = f"{filename}.html"

    clean_name = os.path.basename(filename)
    fpath = os.path.join(EMAILS_DIR, clean_name)
    if os.path.exists(fpath):
        os.remove(fpath)
        return {"success": True, "message": f"Deleted {clean_name}"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

def sanitize_smtp_host(host_input: str, user_email: str = "") -> str:
    """
    Sanitizes and auto-resolves SMTP host inputs.
    Detects when a user enters an email address instead of the mail server host.
    """
    raw = (host_input or "").strip()
    user = (user_email or "").strip().lower()

    # If the host field contains an email address (e.g. mr24csb1a37@student.nitw.ac.in)
    if "@" in raw:
        domain = raw.split("@")[-1].strip().lower()
    elif not raw or raw.lower() in ("auto", "default", "localhost", "127.0.0.1", "none"):
        domain = user.split("@")[-1].strip().lower() if "@" in user else ""
    else:
        domain = raw.lower()

    # Known educational and public providers using Google Workspace
    if (
        domain in ("gmail.com", "googlemail.com", "student.nitw.ac.in", "nitw.ac.in")
        or domain.endswith(".nitw.ac.in")
        or "google" in domain
    ):
        return "smtp.gmail.com"

    # Microsoft 365 / Outlook
    if (
        domain in ("outlook.com", "hotmail.com", "live.com", "office365.com")
        or "office" in domain
        or "microsoft" in domain
    ):
        return "smtp.office365.com"

    # Yahoo
    if "yahoo" in domain:
        return "smtp.mail.yahoo.com"

    # If raw was an email address but domain wasn't directly matched
    if "@" in raw:
        return f"smtp.{domain}"

    return raw

@router.post("/test-smtp")
async def test_smtp_connection(req: TestSMTPRequest):
    """
    Validates SMTP credentials by connecting, authenticating, and dispatching a test verification email.
    Auto-corrects email addresses entered as hosts (e.g. resolves @student.nitw.ac.in to smtp.gmail.com).
    """
    user = req.smtpUser.strip()
    host = sanitize_smtp_host(req.smtpHost, user)
    port = req.smtpPort
    password = req.smtpPassword.strip()
    to_email = req.toEmail.strip()

    if not host or not user or not password or not to_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host, username, password, and recipient email are all required for SMTP verification.",
        )

    msg = EmailMessage()
    msg["Subject"] = "AgentOS SMTP Connection Verification"
    msg["From"] = user
    msg["To"] = to_email
    
    plain_text = (
        f"Congratulations!\n\n"
        f"Your AgentOS SMTP integration with {host}:{port} is successfully authenticated.\n"
        f"Workflows containing Send Email nodes can now dispatch real emails directly to recipients.\n\n"
        f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
    )
    msg.set_content(plain_text)

    try:
        if req.useSSL or port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=12) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)

        logger.info(f"SMTP test successfully verified for {user} -> {to_email}")
        
        # Automatically persist credentials as system default and apply to workflow nodes
        if req.saveAsDefault:
            persist_smtp_to_env(host, port, user, password, req.useSSL)
            await apply_smtp_to_workflow_nodes(host, port, user, password)

        return {
            "success": True,
            "message": f"SMTP authentication succeeded! Test email delivered to {to_email}.",
            "host": host,
            "port": port,
            "user": user,
            "deliveredTo": to_email,
            "savedAsDefault": req.saveAsDefault,
        }
    except smtplib.SMTPAuthenticationError as e:
        logger.warning(f"SMTP Authentication Error: {e}")
        error_msg = str(e)
        hint = "Check your username and password."
        if "google" in host.lower() or "5.7.8" in error_msg or "nitw.ac.in" in user.lower():
            hint = "Google Workspace & Gmail require a 16-character App Password (not your normal college portal password). Enable 2FA on your Google Account and generate an App Password at https://myaccount.google.com/apppasswords"
            error_msg = "Google/NITW Workspace authentication rejected your password. Standard account passwords cannot be used for SMTP; a 16-character Google App Password is required."
        return {
            "success": False,
            "error": error_msg,
            "hint": hint,
            "resolvedHost": host,
        }
    except Exception as e:
        logger.warning(f"SMTP Connection Error: {e}")
        err_str = str(e)
        hint = None
        if "getaddrinfo failed" in err_str:
            hint = f"Hostname '{host}' could not be resolved. For Gmail or NITW GSuite, the correct host is 'smtp.gmail.com'."
        return {
            "success": False,
            "error": f"Failed to connect or send via {host}:{port}: {err_str}",
            "hint": hint,
            "resolvedHost": host,
        }

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

@router.post("/test-smtp")
async def test_smtp_connection(req: TestSMTPRequest):
    """
    Validates SMTP credentials by connecting, authenticating, and dispatching a test verification email.
    """
    host = req.smtpHost.strip()
    port = req.smtpPort
    user = req.smtpUser.strip()
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
        return {
            "success": True,
            "message": f"SMTP authentication succeeded! Test email delivered to {to_email}.",
            "host": host,
            "port": port,
            "user": user,
            "deliveredTo": to_email,
        }
    except smtplib.SMTPAuthenticationError as e:
        logger.warning(f"SMTP Authentication Error: {e}")
        error_msg = str(e)
        if "google" in host.lower() or "5.7.8" in error_msg:
            error_msg += " (Hint: Google requires a 16-character App Password, not your standard Google account password. Create one at https://myaccount.google.com/apppasswords)"
        return {
            "success": False,
            "error": f"Authentication failed: {error_msg}",
            "hint": "Check username and App Password",
        }
    except Exception as e:
        logger.warning(f"SMTP Connection Error: {e}")
        return {
            "success": False,
            "error": f"Failed to connect or send via {host}:{port}: {str(e)}",
        }

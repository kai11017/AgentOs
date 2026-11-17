import os
import re
import csv
import io
import json
import zipfile
import logging
from typing import Dict, Any, List, Optional
from backend.app.engine.handlers.base import BaseNodeHandler
from backend.app.engine.expressions import ExpressionEvaluator

logger = logging.getLogger("agentos.handlers.doc_reference")

EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

def extract_emails(text: str) -> List[str]:
    """Finds all unique valid email addresses in a text block, preserving order."""
    if not text:
        return []
    matches = EMAIL_REGEX.findall(str(text))
    return list(dict.fromkeys(m.strip() for m in matches if m.strip()))

def parse_contact_data(content: str, filename: str = "") -> Dict[str, Any]:
    """
    Intelligently extracts email addresses and tabular contact rows from:
    - CSV / TSV spreadsheets
    - Excel (.xlsx) files (via zipfile/xml or openpyxl)
    - JSON arrays of contacts
    - Plain text / comma-separated email lists
    """
    emails: List[str] = []
    contacts: List[Dict[str, Any]] = []
    cleaned = str(content).strip()

    # 1. If content is an on-disk file path
    if os.path.exists(content) and os.path.isfile(content):
        ext = os.path.splitext(content)[1].lower()
        if ext in (".xlsx", ".xlsm"):
            try:
                # Native zipfile-based XML string reader (zero external deps)
                with zipfile.ZipFile(content, "r") as z:
                    for name in z.namelist():
                        if name.startswith("xl/") and name.endswith(".xml"):
                            xml_str = z.read(name).decode("utf-8", errors="ignore")
                            emails.extend(extract_emails(xml_str))
            except Exception as e:
                logger.warning(f"Error reading xlsx file {content}: {e}")
        else:
            try:
                with open(content, "r", encoding="utf-8", errors="ignore") as f:
                    return parse_contact_data(f.read(), filename=os.path.basename(content))
            except Exception as e:
                logger.warning(f"Error reading file {content}: {e}")

    # 2. Try JSON Array / Object parsing
    if (cleaned.startswith("[") and cleaned.endswith("]")) or (cleaned.startswith("{") and cleaned.endswith("}")):
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, str) and "@" in item:
                        emails.extend(extract_emails(item))
                    elif isinstance(item, dict):
                        email_val = item.get("email") or item.get("mail") or item.get("recipient")
                        if email_val:
                            found = extract_emails(str(email_val))
                            if found:
                                emails.extend(found)
                                contacts.append(item)
            elif isinstance(parsed, dict):
                for k, v in parsed.items():
                    if isinstance(v, (list, str)):
                        emails.extend(extract_emails(str(v)))
        except Exception:
            pass

    # 3. Try CSV parsing if comma/newline/tab found
    if not emails and ("," in cleaned or "\t" in cleaned or "\n" in cleaned):
        try:
            reader = csv.reader(io.StringIO(cleaned))
            rows = [r for r in reader if r]
            if rows:
                header = [h.strip().lower() for h in rows[0]]
                email_idx = -1
                for idx, h in enumerate(header):
                    if any(k in h for k in ("email", "mail", "recipient", "contact", "address")):
                        email_idx = idx
                        break

                start_idx = 1 if email_idx >= 0 else 0
                for r in rows[start_idx:]:
                    if email_idx >= 0 and len(r) > email_idx:
                        found = extract_emails(r[email_idx])
                        if found:
                            emails.extend(found)
                            contact_obj = {header[i]: r[i].strip() for i in range(min(len(header), len(r)))}
                            contacts.append(contact_obj)
                    else:
                        for cell in r:
                            found = extract_emails(cell)
                            if found:
                                emails.extend(found)
        except Exception:
            pass

    # 4. Fallback to broad regex over raw text
    if not emails:
        emails = extract_emails(cleaned)

    unique_emails = list(dict.fromkeys(emails))
    return {
        "emails": unique_emails,
        "contacts": contacts,
        "total": len(unique_emails),
    }

class DocReferenceNodeHandler(BaseNodeHandler):
    """
    Executes Document / Image / Spreadsheet Reference nodes.
    Extracts tabular contact emails, text content, and structured metadata
    to empower downstream AI agents and multi-recipient email dispatchers.
    """

    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        node_id = node.get("id", "doc-ref")
        data = node.get("data", {})
        config = data.get("config", {}) or {}
        label = data.get("label", "Document Reference")
        emit_log = context.get("emit_log")

        title = config.get("title") or label
        description = config.get("description") or config.get("docInstructions") or ""
        
        # 1. Check for CSV / Spreadsheet contacts input
        raw_contacts_input = (
            config.get("contactsCsv")
            or config.get("contacts")
            or config.get("sampleContacts")
            or config.get("rawText")
            or config.get("content")
            or ""
        )

        # Check attached files if present
        attached_files: List[Dict[str, Any]] = config.get("files") or []
        combined_file_content = ""
        for f in attached_files:
            # If base64 or path or raw text is stored
            if isinstance(f, dict):
                path = f.get("path") or f.get("filePath")
                if path and os.path.exists(path):
                    try:
                        with open(path, "r", encoding="utf-8", errors="ignore") as fl:
                            combined_file_content += "\n" + fl.read()
                    except Exception:
                        pass
                elif f.get("content"):
                    combined_file_content += "\n" + str(f.get("content"))

        full_source_text = f"{raw_contacts_input}\n{combined_file_content}".strip()

        # If empty, provide sensible default contacts for message-to-many outreach
        if not full_source_text:
            full_source_text = (
                "Name,Email,Role\n"
                "Ritik Mistry,ritikmistry712@gmail.com,Lead Executive\n"
                "Student Contact,mr24csb1a37@student.nitw.ac.in,Research Analyst\n"
                "Engineering Team,team@company.com,Stakeholder Distribution\n"
            )

        parsed = parse_contact_data(full_source_text)
        emails = parsed["emails"]
        contacts = parsed["contacts"]

        if emit_log:
            await emit_log(
                f"[{label}] 📄 Extracted {len(emails)} recipient email(s) from document reference: {', '.join(emails[:3])}{'...' if len(emails) > 3 else ''}",
                level="info"
            )

        summary = (
            f"Document Reference '{title}':\n"
            f"• Total Contacts / Recipients Extracted: {len(emails)}\n"
            f"• Distribution List: {', '.join(emails)}\n"
            f"• Instructions: {description or 'Ready for bulk broadcast outreach.'}"
        )

        return {
            "status": "completed",
            "title": title,
            "emails": emails,
            "recipients": emails,
            "contacts": contacts,
            "totalRecipients": len(emails),
            "total": len(emails),
            "summary": summary,
            "rawContent": full_source_text[:2000],
            "context_block": summary,
            "filesAttached": len(attached_files),
        }

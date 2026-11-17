import pytest
import os
import asyncio
from backend.app.engine.handlers.doc_reference import DocReferenceNodeHandler, parse_contact_data
from backend.app.engine.handlers.email import EmailNodeHandler, resolve_recipient_list
from backend.app.templates.registry import PREBUILT_TEMPLATES

@pytest.mark.asyncio
async def test_contact_extractor_csv_and_text():
    # 1. Test CSV parsing with headers
    csv_text = """Name,Email,Department
Alice Smith,alice@example.com,Engineering
Bob Jones,bob@student.nitw.ac.in,Marketing
Ritik Mistry,ritikmistry712@gmail.com,Executive
"""
    parsed = parse_contact_data(csv_text)
    assert len(parsed["emails"]) == 3
    assert "alice@example.com" in parsed["emails"]
    assert "bob@student.nitw.ac.in" in parsed["emails"]
    assert "ritikmistry712@gmail.com" in parsed["emails"]
    assert len(parsed["contacts"]) == 3
    assert parsed["contacts"][0]["name"] == "Alice Smith"

    # 2. Test JSON array of emails
    json_text = '["user1@example.com", "user2@company.org"]'
    parsed_json = parse_contact_data(json_text)
    assert len(parsed_json["emails"]) == 2
    assert "user1@example.com" in parsed_json["emails"]

    # 3. Test comma-separated emails
    raw_str = "first@domain.com, second@domain.com; third@domain.com"
    parsed_raw = parse_contact_data(raw_str)
    assert len(parsed_raw["emails"]) == 3

@pytest.mark.asyncio
async def test_doc_reference_handler():
    handler = DocReferenceNodeHandler()
    node = {
        "id": "node-doc-contacts",
        "data": {
            "label": "Recipient Contacts",
            "config": {
                "title": "Stakeholder Distribution List",
                "contactsCsv": "Name,Email\nLead,ritikmistry712@gmail.com\nAnalyst,mr24csb1a37@student.nitw.ac.in\nTeam,team@company.com",
            }
        }
    }
    context = {}
    result = await handler.execute(node, context)
    assert result["status"] == "completed"
    assert len(result["emails"]) == 3
    assert "ritikmistry712@gmail.com" in result["emails"]
    assert "mr24csb1a37@student.nitw.ac.in" in result["emails"]
    assert result["totalRecipients"] == 3

@pytest.mark.asyncio
async def test_email_handler_message_to_many():
    handler = EmailNodeHandler()
    node = {
        "id": "node-email-broadcast",
        "data": {
            "label": "Broadcast Email",
            "config": {
                "deliveryMode": "local_outbox_only",
                "fromEmail": "ritikmistry712@gmail.com",
                "toEmail": "{{$json.emails}}",
                "subject": "Q4 Engineering All-Hands Update",
                "emailBody": "## Key Update\nWe are launching autonomous multi-agent pipelines for all teams.",
            }
        }
    }
    context = {
        "$json": {
            "emails": ["mr24csb1a37@student.nitw.ac.in", "ritikmistry712@gmail.com", "stakeholder@company.com"]
        }
    }
    logs = []
    async def log_mock(msg, level="info"):
        logs.append(msg)
    context["emit_log"] = log_mock

    result = await handler.execute(node, context)
    assert result["status"] == "sent"
    assert result["mode"] == "message_to_many"
    assert result["totalRecipients"] == 3
    assert len(result["recipients"]) == 3
    assert len(result["previewFiles"]) == 3
    # Check that each preview file was created on disk
    for f in result["previewFiles"]:
        assert os.path.exists(f)

def test_template_registry_has_message_to_many():
    tpl = next((t for t in PREBUILT_TEMPLATES if t["id"] == "tpl-message-to-many"), None)
    assert tpl is not None
    assert tpl["name"] == "Broadcast Intelligence & Multi-Recipient Outreach (Message to Many)"
    assert len(tpl["nodes"]) == 5
    assert len(tpl["edges"]) == 4

if __name__ == "__main__":
    asyncio.run(test_contact_extractor_csv_and_text())
    asyncio.run(test_doc_reference_handler())
    asyncio.run(test_email_handler_message_to_many())
    test_template_registry_has_message_to_many()
    print("ALL MESSAGE TO MANY TESTS PASSED!")

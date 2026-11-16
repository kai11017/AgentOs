from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from backend.app.core.database import Base

class CredentialModel(Base):
    __tablename__ = "credentials"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    credential_type = Column(String, nullable=False, default="custom")
    encrypted_payload = Column(String, nullable=False)
    masked_preview = Column(String, nullable=False)
    description = Column(String, nullable=True, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

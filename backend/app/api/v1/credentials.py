import uuid
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.app.core.database import get_db
from backend.app.core.security import vault_security
from backend.app.models.credential import CredentialModel

logger = logging.getLogger("agentos.api.credentials")
router = APIRouter(prefix="/credentials", tags=["Credentials"])

class CredentialCreateRequest(BaseModel):
    name: str = Field(..., description="Unique credential identifier name (e.g. gemini_api_key, slack_webhook)")
    credential_type: str = Field(default="custom", description="Type of credential (gemini, ollama, webhook, github, custom)")
    value: str = Field(..., description="Raw secret plaintext value to be encrypted")
    description: Optional[str] = Field(default="", description="Human-readable description or usage notes")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional non-sensitive metadata")

class CredentialResponse(BaseModel):
    id: str
    name: str
    credential_type: str
    masked_preview: str
    description: str
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str

@router.get("", response_model=List[CredentialResponse])
async def list_credentials(db: AsyncSession = Depends(get_db)):
    """List all stored credentials with their values safely masked."""
    stmt = select(CredentialModel).order_by(CredentialModel.created_at.desc())
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return [
        CredentialResponse(
            id=c.id,
            name=c.name,
            credential_type=c.credential_type,
            masked_preview=c.masked_preview,
            description=c.description or "",
            metadata=c.metadata_json or {},
            created_at=c.created_at.isoformat() if c.created_at else "",
            updated_at=c.updated_at.isoformat() if c.updated_at else "",
        )
        for c in records
    ]

@router.post("", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_credential(payload: CredentialCreateRequest, db: AsyncSession = Depends(get_db)):
    """Securely encrypts and stores or updates a secret credential."""
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Credential name cannot be empty.")
    
    encrypted_token = vault_security.encrypt(payload.value)
    masked = vault_security.mask_secret(payload.value)

    # Check if a credential with this name already exists
    stmt = select(CredentialModel).where(CredentialModel.name == name_clean)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.credential_type = payload.credential_type
        existing.encrypted_payload = encrypted_token
        existing.masked_preview = masked
        existing.description = payload.description or ""
        existing.metadata_json = payload.metadata or {}
        await db.commit()
        await db.refresh(existing)
        target = existing
    else:
        target = CredentialModel(
            id=f"cred-{uuid.uuid4().hex[:12]}",
            name=name_clean,
            credential_type=payload.credential_type,
            encrypted_payload=encrypted_token,
            masked_preview=masked,
            description=payload.description or "",
            metadata_json=payload.metadata or {},
        )
        db.add(target)
        await db.commit()
        await db.refresh(target)

    return CredentialResponse(
        id=target.id,
        name=target.name,
        credential_type=target.credential_type,
        masked_preview=target.masked_preview,
        description=target.description or "",
        metadata=target.metadata_json or {},
        created_at=target.created_at.isoformat() if target.created_at else "",
        updated_at=target.updated_at.isoformat() if target.updated_at else "",
    )

@router.delete("/{credential_id}", status_code=status.HTTP_200_OK)
async def delete_credential(credential_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes a stored credential by its unique ID."""
    stmt = select(CredentialModel).where(CredentialModel.id == credential_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"Credential '{credential_id}' not found.")
    
    await db.delete(target)
    await db.commit()
    return {"status": "success", "message": f"Credential '{target.name}' deleted successfully."}

async def resolve_credential(name: str, db: AsyncSession) -> Optional[str]:
    """Helper to look up and decrypt a credential value for runtime node handlers."""
    stmt = select(CredentialModel).where(CredentialModel.name == name)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()
    if not target:
        return None
    try:
        return vault_security.decrypt(target.encrypted_payload)
    except Exception as e:
        logger.error(f"Failed to decrypt credential '{name}': {e}")
        return None

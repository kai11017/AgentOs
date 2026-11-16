import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.knowledge import (
    KnowledgeCollectionModel,
    KnowledgeDocumentModel,
    KnowledgeChunkModel,
)
from backend.app.engine.rag.vector_store import LocalVectorStore

logger = logging.getLogger("agentos.api.knowledge")
router = APIRouter(prefix="/knowledge", tags=["Knowledge & RAG"])

class CollectionCreateRequest(BaseModel):
    name: str = Field(..., description="Unique collection identifier name (e.g. policies, engineering_docs)")
    description: Optional[str] = Field(default="", description="Description of the documents contained")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DocumentUploadRequest(BaseModel):
    collection: str = Field(default="default", description="Target collection name")
    filename: str = Field(..., description="Name of the document (e.g. refund_policy.md, api_guide.txt)")
    content: str = Field(..., description="Raw text or markdown document content")
    chunk_size: Optional[int] = Field(default=500, description="Max characters per chunk")
    chunk_overlap: Optional[int] = Field(default=50, description="Overlap characters between chunks")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class QueryRequest(BaseModel):
    collection: str = Field(default="default", description="Collection name to search within")
    query: str = Field(..., description="Natural language question or search query")
    top_k: Optional[int] = Field(default=3, description="Number of top relevant chunks to return")

@router.get("/collections")
async def list_collections(db: AsyncSession = Depends(get_db)):
    """Lists all knowledge collections with document and chunk metrics."""
    stmt = select(KnowledgeCollectionModel).order_by(KnowledgeCollectionModel.created_at.desc())
    result = await db.execute(stmt)
    collections = result.scalars().all()

    output = []
    for c in collections:
        output.append({
            "id": c.id,
            "name": c.name,
            "description": c.description or "",
            "document_count": len(c.documents),
            "chunk_count": len(c.chunks),
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "updated_at": c.updated_at.isoformat() if c.updated_at else "",
        })
    return {"collections": output}

@router.post("/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(payload: CollectionCreateRequest, db: AsyncSession = Depends(get_db)):
    """Creates a new document collection for vector search."""
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Collection name cannot be empty.")

    stmt = select(KnowledgeCollectionModel).where(KnowledgeCollectionModel.name == clean_name)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"Collection '{clean_name}' already exists.")

    col = await LocalVectorStore.get_or_create_collection(clean_name, db, description=payload.description or "")
    return {
        "status": "success",
        "id": col.id,
        "name": col.name,
        "description": col.description,
    }

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(payload: DocumentUploadRequest, db: AsyncSession = Depends(get_db)):
    """Uploads document content, chunks it recursively, generates embeddings, and indexes it into the vector store."""
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty.")

    result = await LocalVectorStore.ingest_text(
        collection_name=payload.collection.strip() or "default",
        filename=payload.filename.strip() or "untitled.txt",
        content=payload.content,
        db=db,
        metadata=payload.metadata or {},
        chunk_size=payload.chunk_size or 500,
        chunk_overlap=payload.chunk_overlap or 50,
    )
    return result

@router.post("/query")
async def query_knowledge(payload: QueryRequest, db: AsyncSession = Depends(get_db)):
    """Performs semantic similarity query over the specified collection."""
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    results = await LocalVectorStore.query(
        collection_name=payload.collection.strip() or "default",
        query=payload.query.strip(),
        db=db,
        top_k=min(20, max(1, payload.top_k or 3)),
    )
    return {
        "collection": payload.collection,
        "query": payload.query,
        "total_results": len(results),
        "results": results,
    }

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes a collection and all associated documents and vector chunks."""
    stmt = select(KnowledgeCollectionModel).where(KnowledgeCollectionModel.id == collection_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_id}' not found.")

    await db.delete(target)
    await db.commit()
    return {"status": "success", "message": f"Collection '{target.name}' and all chunks deleted."}

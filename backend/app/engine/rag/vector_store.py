import uuid
import math
import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.app.models.knowledge import (
    KnowledgeCollectionModel,
    KnowledgeDocumentModel,
    KnowledgeChunkModel,
)
from backend.app.engine.rag.splitter import RecursiveTextSplitter
from backend.app.engine.rag.embeddings import global_embedding_service

logger = logging.getLogger("agentos.rag.vectorstore")

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))

def keyword_overlap_score(query: str, text: str) -> float:
    q_tokens = set(re.findall(r"\b\w{2,}\b", query.lower()))
    if not q_tokens:
        return 0.0
    t_tokens = set(re.findall(r"\b\w{2,}\b", text.lower()))
    overlap = len(q_tokens.intersection(t_tokens))
    return overlap / len(q_tokens)

class LocalVectorStore:
    """Orchestrates document ingestion, chunking, embeddings, and hybrid semantic retrieval."""

    @staticmethod
    async def get_or_create_collection(name: str, db: AsyncSession, description: str = "") -> KnowledgeCollectionModel:
        stmt = select(KnowledgeCollectionModel).where(KnowledgeCollectionModel.name == name)
        res = await db.execute(stmt)
        col = res.scalar_one_or_none()
        if not col:
            col = KnowledgeCollectionModel(
                id=f"col-{uuid.uuid4().hex[:10]}",
                name=name,
                description=description,
            )
            db.add(col)
            await db.commit()
            await db.refresh(col)
        return col

    @staticmethod
    async def ingest_text(
        collection_name: str,
        filename: str,
        content: str,
        db: AsyncSession,
        metadata: Optional[Dict[str, Any]] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ) -> Dict[str, Any]:
        """Splits document content into chunks, generates vectors, and stores them in the database."""
        col = await LocalVectorStore.get_or_create_collection(collection_name, db)
        doc_id = f"doc-{uuid.uuid4().hex[:10]}"

        splitter = RecursiveTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks_text = splitter.split_text(content)
        if not chunks_text:
            chunks_text = [content]

        # Generate embeddings in batch
        vectors = await global_embedding_service.get_embeddings(chunks_text)

        doc = KnowledgeDocumentModel(
            id=doc_id,
            collection_id=col.id,
            filename=filename,
            file_type="text/markdown" if filename.endswith((".md", ".markdown")) else "text/plain",
            char_count=len(content),
            chunk_count=len(chunks_text),
            metadata_json=metadata or {},
        )
        db.add(doc)

        for idx, (chunk_str, vec) in enumerate(zip(chunks_text, vectors)):
            chunk_model = KnowledgeChunkModel(
                id=f"chunk-{uuid.uuid4().hex[:12]}",
                collection_id=col.id,
                document_id=doc_id,
                chunk_index=idx,
                content=chunk_str,
                embedding_vector=vec,
                metadata_json={"filename": filename, "chunk_index": idx},
            )
            db.add(chunk_model)

        await db.commit()
        return {
            "status": "success",
            "collection": collection_name,
            "document_id": doc_id,
            "filename": filename,
            "chunks_ingested": len(chunks_text),
            "total_chars": len(content),
        }

    @staticmethod
    async def query(
        collection_name: str,
        query: str,
        db: AsyncSession,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Performs hybrid semantic and keyword retrieval against chunks in a collection."""
        stmt = select(KnowledgeCollectionModel).where(KnowledgeCollectionModel.name == collection_name)
        res = await db.execute(stmt)
        col = res.scalar_one_or_none()
        if not col:
            return []

        chunks_stmt = select(KnowledgeChunkModel).where(KnowledgeChunkModel.collection_id == col.id)
        chunks_res = await db.execute(chunks_stmt)
        all_chunks = chunks_res.scalars().all()
        if not all_chunks:
            return []

        # Embed query
        query_vectors = await global_embedding_service.get_embeddings([query])
        q_vec = query_vectors[0] if query_vectors else []

        scored_results = []
        for c in all_chunks:
            c_vec = c.embedding_vector or []
            sem_score = cosine_similarity(q_vec, c_vec) if q_vec and c_vec else 0.0
            kw_score = keyword_overlap_score(query, c.content)
            # Weighted hybrid score (70% semantic, 30% exact keyword match)
            hybrid_score = round((0.7 * sem_score) + (0.3 * kw_score), 4)

            scored_results.append({
                "chunk_id": c.id,
                "document_id": c.document_id,
                "filename": c.metadata_json.get("filename", "unknown"),
                "chunk_index": c.chunk_index,
                "content": c.content,
                "score": hybrid_score,
                "semantic_score": round(sem_score, 4),
                "keyword_score": round(kw_score, 4),
            })

        # Sort by score descending
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

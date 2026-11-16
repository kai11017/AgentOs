from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class KnowledgeCollectionModel(Base):
    __tablename__ = "knowledge_collections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(String, nullable=True, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    documents = relationship("KnowledgeDocumentModel", back_populates="collection", cascade="all, delete-orphan", lazy="selectin")
    chunks = relationship("KnowledgeChunkModel", back_populates="collection", cascade="all, delete-orphan", lazy="selectin")

class KnowledgeDocumentModel(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, index=True)
    collection_id = Column(String, ForeignKey("knowledge_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False, default="text/plain")
    char_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    collection = relationship("KnowledgeCollectionModel", back_populates="documents")
    chunks = relationship("KnowledgeChunkModel", back_populates="document", cascade="all, delete-orphan", lazy="selectin")

class KnowledgeChunkModel(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String, primary_key=True, index=True)
    collection_id = Column(String, ForeignKey("knowledge_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    # Stored embedding vector as a JSON list of floats
    embedding_vector = Column(JSON, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    collection = relationship("KnowledgeCollectionModel", back_populates="chunks")
    document = relationship("KnowledgeDocumentModel", back_populates="chunks")

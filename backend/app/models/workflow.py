from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class WorkflowModel(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Untitled Workflow")
    description = Column(String, nullable=True, default="")
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relational children with cascade delete
    nodes = relationship("WorkflowNodeModel", back_populates="workflow", cascade="all, delete-orphan", lazy="selectin")
    edges = relationship("WorkflowEdgeModel", back_populates="workflow", cascade="all, delete-orphan", lazy="selectin")
    executions = relationship("ExecutionModel", back_populates="workflow", cascade="all, delete-orphan", lazy="selectin")

class WorkflowNodeModel(Base):
    __tablename__ = "workflow_nodes"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String, nullable=False)
    definition_type = Column(String, nullable=False)
    position_x = Column(Float, nullable=False, default=0.0)
    position_y = Column(Float, nullable=False, default=0.0)
    config = Column(JSON, default=dict)

    workflow = relationship("WorkflowModel", back_populates="nodes")

class WorkflowEdgeModel(Base):
    __tablename__ = "workflow_edges"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String, nullable=False)
    target = Column(String, nullable=False)
    source_handle = Column(String, nullable=True)
    target_handle = Column(String, nullable=True)

    workflow = relationship("WorkflowModel", back_populates="edges")


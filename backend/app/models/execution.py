from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class ExecutionModel(Base):
    __tablename__ = "executions"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, default="pending", index=True)  # pending, running, completed, failed, cancelled
    duration_ms = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    node_results = Column(JSON, default=dict)  # { [nodeId]: { status, output, duration_ms, error } }

    workflow = relationship("WorkflowModel", back_populates="executions")
    logs = relationship("ExecutionLogModel", back_populates="execution", cascade="all, delete-orphan", lazy="selectin")

class ExecutionLogModel(Base):
    __tablename__ = "execution_logs"

    id = Column(String, primary_key=True, index=True)
    execution_id = Column(String, ForeignKey("executions.id", ondelete="CASCADE"), nullable=False, index=True)
    seq = Column(Integer, nullable=False, default=1, index=True)  # Sequence ID for resumable WebSockets
    node_id = Column(String, nullable=True, index=True)
    level = Column(String, default="info")  # info, warn, error
    message = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    payload = Column(JSON, nullable=True)

    execution = relationship("ExecutionModel", back_populates="logs")


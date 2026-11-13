from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class ExecuteWorkflowRequest(BaseModel):
    inputData: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ExecutionLogResponse(BaseModel):
    id: str
    executionId: str
    seq: int
    nodeId: Optional[str] = None
    level: str = "info"
    message: str
    timestamp: str
    payload: Optional[Dict[str, Any]] = None

class NodeExecutionResult(BaseModel):
    status: str  # pending, running, completed, failed
    output: Optional[Dict[str, Any]] = None
    durationMs: int = 0
    error: Optional[str] = None

class ExecutionResponse(BaseModel):
    id: str
    workflowId: str
    status: str  # pending, running, completed, failed, cancelled
    durationMs: int = 0
    startedAt: str
    completedAt: Optional[str] = None
    nodeResults: Dict[str, NodeExecutionResult] = Field(default_factory=dict)


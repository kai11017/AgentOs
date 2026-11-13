from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class NodePosition(BaseModel):
    x: float
    y: float

class NodeData(BaseModel):
    label: str
    definitionType: str
    config: Dict[str, Any] = Field(default_factory=dict)
    executionStatus: Optional[str] = "idle"

class WorkflowNodeSchema(BaseModel):
    id: str
    type: str = "default"
    position: NodePosition
    data: NodeData

class WorkflowEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class WorkflowCreateRequest(BaseModel):
    name: str = "Untitled Workflow"
    description: Optional[str] = ""
    nodes: List[WorkflowNodeSchema] = Field(default_factory=list)
    edges: List[WorkflowEdgeSchema] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[WorkflowNodeSchema]] = None
    edges: Optional[List[WorkflowEdgeSchema]] = None
    tags: Optional[List[str]] = None
    isActive: Optional[bool] = None

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    nodes: List[WorkflowNodeSchema] = Field(default_factory=list)
    edges: List[WorkflowEdgeSchema] = Field(default_factory=list)
    createdAt: str
    updatedAt: str
    tags: List[str] = Field(default_factory=list)
    isActive: bool = True


import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.workflow import WorkflowModel, WorkflowNodeModel, WorkflowEdgeModel
from backend.app.schemas.workflow import (
    WorkflowResponse,
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowNodeSchema,
    WorkflowEdgeSchema,
    NodePosition,
    NodeData,
)

router = APIRouter(prefix="/workflows", tags=["Workflows"])

def model_to_schema(wf: WorkflowModel) -> WorkflowResponse:
    nodes = [
        WorkflowNodeSchema(
            id=n.id,
            type=n.definition_type,
            position=NodePosition(x=n.position_x, y=n.position_y),
            data=NodeData(
                label=n.label,
                definitionType=n.definition_type,
                config=n.config or {},
            ),
        )
        for n in (wf.nodes or [])
    ]
    edges = [
        WorkflowEdgeSchema(
            id=e.id,
            source=e.source,
            target=e.target,
            sourceHandle=e.source_handle,
            targetHandle=e.target_handle,
        )
        for e in (wf.edges or [])
    ]
    return WorkflowResponse(
        id=wf.id,
        name=wf.name,
        description=wf.description or "",
        nodes=nodes,
        edges=edges,
        createdAt=wf.created_at.isoformat() if wf.created_at else datetime.now(timezone.utc).isoformat(),
        updatedAt=wf.updated_at.isoformat() if wf.updated_at else datetime.now(timezone.utc).isoformat(),
        tags=wf.tags or [],
        isActive=wf.is_active,
    )

@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowModel).order_by(WorkflowModel.updated_at.desc()))
    workflows = result.scalars().all()
    return [model_to_schema(wf) for wf in workflows]

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return model_to_schema(wf)

@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(req: WorkflowCreateRequest, db: AsyncSession = Depends(get_db)):
    wf_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    wf = WorkflowModel(
        id=wf_id,
        name=req.name,
        description=req.description or "",
        is_active=True,
        tags=req.tags,
        created_at=now,
        updated_at=now,
    )
    db.add(wf)
    await db.flush()

    for n in req.nodes:
        node_model = WorkflowNodeModel(
            id=n.id,
            workflow_id=wf_id,
            label=n.data.label,
            definition_type=n.data.definitionType,
            position_x=n.position.x,
            position_y=n.position.y,
            config=n.data.config,
        )
        db.add(node_model)

    for e in req.edges:
        edge_model = WorkflowEdgeModel(
            id=e.id,
            workflow_id=wf_id,
            source=e.source,
            target=e.target,
            source_handle=e.sourceHandle,
            target_handle=e.targetHandle,
        )
        db.add(edge_model)

    await db.commit()
    return await get_workflow(wf_id, db)

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: str, req: WorkflowUpdateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    if req.name is not None:
        wf.name = req.name
    if req.description is not None:
        wf.description = req.description
    if req.tags is not None:
        wf.tags = req.tags
    if req.isActive is not None:
        wf.is_active = req.isActive
    wf.updated_at = datetime.now(timezone.utc)

    # Sync nodes if provided
    if req.nodes is not None:
        # Clear existing nodes
        existing_nodes = await db.execute(select(WorkflowNodeModel).where(WorkflowNodeModel.workflow_id == workflow_id))
        for old_node in existing_nodes.scalars().all():
            await db.delete(old_node)
        await db.flush()
        
        for n in req.nodes:
            new_node = WorkflowNodeModel(
                id=n.id,
                workflow_id=workflow_id,
                label=n.data.label,
                definition_type=n.data.definitionType,
                position_x=n.position.x,
                position_y=n.position.y,
                config=n.data.config,
            )
            db.add(new_node)

    # Sync edges if provided
    if req.edges is not None:
        existing_edges = await db.execute(select(WorkflowEdgeModel).where(WorkflowEdgeModel.workflow_id == workflow_id))
        for old_edge in existing_edges.scalars().all():
            await db.delete(old_edge)
        await db.flush()

        for e in req.edges:
            new_edge = WorkflowEdgeModel(
                id=e.id,
                workflow_id=workflow_id,
                source=e.source,
                target=e.target,
                source_handle=e.sourceHandle,
                target_handle=e.targetHandle,
            )
            db.add(new_edge)

    await db.commit()
    return await get_workflow(workflow_id, db)

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowModel).where(WorkflowModel.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    await db.delete(wf)
    await db.commit()
    return {"success": True}

# ─── Workflow JSON Export & Import ──────────────────────────────────────────

@router.get("/{workflow_id}/export")
async def export_workflow_json(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Exports workflow as standardized .agentflow.json file structure."""
    wf_data = await get_workflow(workflow_id, db)
    return {
        "format": "agentflow.workflow",
        "schemaVersion": "1.0.0",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "workflow": wf_data,
    }

class ImportWorkflowRequest(BaseModel):
    format: Optional[str] = "agentflow.workflow"
    workflow: Optional[WorkflowCreateRequest] = None
    name: Optional[str] = None
    nodes: Optional[List[Any]] = None
    edges: Optional[List[Any]] = None

@router.post("/import", response_model=WorkflowResponse)
async def import_workflow_json(req: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Imports workflow from raw JSON or exported .agentflow.json structure."""
    raw_wf = req.get("workflow", req)
    name = raw_wf.get("name") or "Imported Workflow"
    description = raw_wf.get("description") or "Imported from JSON"
    nodes = raw_wf.get("nodes", [])
    edges = raw_wf.get("edges", [])

    new_wf_id = f"wf-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)

    db_wf = WorkflowModel(
        id=new_wf_id,
        name=name,
        description=description,
        is_active=True,
        tags=["imported"],
        created_at=now,
        updated_at=now,
    )
    db.add(db_wf)

    # Insert nodes with newly generated unique IDs to prevent primary key collisions
    node_id_map: Dict[str, str] = {}
    for n in nodes:
        old_id = n.get("id") or f"old-{uuid.uuid4().hex[:6]}"
        new_node_id = f"node-{uuid.uuid4().hex[:8]}"
        node_id_map[old_id] = new_node_id

        node_data = n.get("data", {})
        pos = n.get("position", {})
        db_node = WorkflowNodeModel(
            id=new_node_id,
            workflow_id=new_wf_id,
            label=node_data.get("label", "Node"),
            definition_type=node_data.get("definitionType") or n.get("type", "custom-agent"),
            position_x=int(pos.get("x", 100)),
            position_y=int(pos.get("y", 100)),
            config=node_data.get("config", {}),
        )
        db.add(db_node)

    # Insert edges with fresh unique IDs and remapped source/target
    for e in edges:
        old_source = e.get("source")
        old_target = e.get("target")
        new_source = node_id_map.get(old_source, old_source)
        new_target = node_id_map.get(old_target, old_target)

        db_edge = WorkflowEdgeModel(
            id=f"edge-{uuid.uuid4().hex[:8]}",
            workflow_id=new_wf_id,
            source=new_source,
            target=new_target,
            source_handle=e.get("sourceHandle"),
            target_handle=e.get("targetHandle"),
        )
        db.add(db_edge)

    await db.commit()
    return await get_workflow(new_wf_id, db)


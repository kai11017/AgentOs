import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.templates.registry import PREBUILT_TEMPLATES
from backend.app.models.workflow import WorkflowModel, WorkflowNodeModel, WorkflowEdgeModel

router = APIRouter(prefix="/templates", tags=["Templates"])

class TemplateSummary(BaseModel):
    id: str
    name: str
    category: str
    description: str
    icon: str
    tags: List[str]
    node_count: int
    edge_count: int

@router.get("", response_model=List[TemplateSummary])
async def list_templates():
    """Returns all pre-built, production-ready workflow templates."""
    summaries = []
    for tpl in PREBUILT_TEMPLATES:
        summaries.append(
            TemplateSummary(
                id=tpl["id"],
                name=tpl["name"],
                category=tpl["category"],
                description=tpl["description"],
                icon=tpl.get("icon", "Brain"),
                tags=tpl.get("tags", []),
                node_count=len(tpl.get("nodes", [])),
                edge_count=len(tpl.get("edges", [])),
            )
        )
    return summaries

@router.post("/{template_id}/instantiate", status_code=status.HTTP_201_CREATED)
async def instantiate_template(template_id: str, db: AsyncSession = Depends(get_db)):
    """Clones a template into a new active workflow in the database with fresh unique IDs."""
    target_tpl = next((t for t in PREBUILT_TEMPLATES if t["id"] == template_id), None)
    if not target_tpl:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")

    new_wf_id = f"wf-{uuid.uuid4().hex[:12]}"
    new_workflow = WorkflowModel(
        id=new_wf_id,
        name=target_tpl["name"],
        description=target_tpl["description"],
        is_active=True,
        version=1,
        tags=target_tpl.get("tags", []),
    )
    db.add(new_workflow)

    # 1. First map all old node IDs to fresh unique IDs
    node_id_map: Dict[str, str] = {
        node_def["id"]: f"node-{uuid.uuid4().hex[:8]}"
        for node_def in target_tpl.get("nodes", [])
    }

    # 2. Instantiate nodes with remapped IDs and remapped expression references in config
    import json
    for node_def in target_tpl.get("nodes", []):
        old_id = node_def["id"]
        fresh_node_id = node_id_map[old_id]

        # Remap any upstream node ID references inside config expressions (e.g. {{nodes['old_id'].output.emails}})
        raw_cfg_str = json.dumps(node_def.get("config", {}))
        for old_ref, new_ref in node_id_map.items():
            raw_cfg_str = raw_cfg_str.replace(old_ref, new_ref)
        remapped_config = json.loads(raw_cfg_str)

        db_node = WorkflowNodeModel(
            id=fresh_node_id,
            workflow_id=new_wf_id,
            label=node_def.get("label", "Node"),
            definition_type=node_def.get("definitionType", "default"),
            position_x=float(node_def.get("position_x", 0)),
            position_y=float(node_def.get("position_y", 0)),
            config=remapped_config,
        )
        db.add(db_node)

    # Remap and create edges
    for edge_def in target_tpl.get("edges", []):
        fresh_edge_id = f"edge-{uuid.uuid4().hex[:8]}"
        new_source = node_id_map.get(edge_def["source"], edge_def["source"])
        new_target = node_id_map.get(edge_def["target"], edge_def["target"])

        db_edge = WorkflowEdgeModel(
            id=fresh_edge_id,
            workflow_id=new_wf_id,
            source=new_source,
            target=new_target,
            source_handle=edge_def.get("source_handle"),
            target_handle=edge_def.get("target_handle"),
        )
        db.add(db_edge)

    await db.commit()
    await db.refresh(new_workflow)

    return {
        "status": "success",
        "message": f"Successfully created workflow '{new_workflow.name}' from template.",
        "workflow_id": new_wf_id,
        "name": new_workflow.name,
    }

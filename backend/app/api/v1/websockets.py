import asyncio
import logging
from typing import Dict, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("agentos.websockets")

router = APIRouter(tags=["WebSockets"])

# In-memory subscriber registry: execution_id -> set of active WebSockets
SUBSCRIBERS: Dict[str, Set[WebSocket]] = {}
EVENT_BUFFER: Dict[str, List[dict]] = {}

def broadcast_execution_event(execution_id: str, event: dict):
    """Broadcasts an event to all connected WebSockets for this execution."""
    # Buffer event for resumable replay
    if execution_id not in EVENT_BUFFER:
        EVENT_BUFFER[execution_id] = []
    EVENT_BUFFER[execution_id].append(event)
    
    # Cap buffer to 1000 events per execution
    if len(EVENT_BUFFER[execution_id]) > 1000:
        EVENT_BUFFER[execution_id].pop(0)

    sockets = SUBSCRIBERS.get(execution_id, set())
    for ws in list(sockets):
        try:
            asyncio.create_task(ws.send_json(event))
        except Exception:
            sockets.discard(ws)

@router.websocket("/ws/executions/{execution_id}")
async def websocket_execution_endpoint(websocket: WebSocket, execution_id: str, last_event_id: int = 0):
    await websocket.accept()
    
    if execution_id not in SUBSCRIBERS:
        SUBSCRIBERS[execution_id] = set()
    SUBSCRIBERS[execution_id].add(websocket)
    
    # Replay missed events if client reconnected with last_event_id
    if execution_id in EVENT_BUFFER and last_event_id > 0:
        for buffered_event in EVENT_BUFFER[execution_id]:
            if buffered_event.get("seq", 0) > last_event_id:
                try:
                    await websocket.send_json(buffered_event)
                except Exception:
                    break

    try:
        while True:
            # Keep-alive loop receiving client ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        if execution_id in SUBSCRIBERS:
            SUBSCRIBERS[execution_id].discard(websocket)
            if not SUBSCRIBERS[execution_id]:
                SUBSCRIBERS.pop(execution_id, None)


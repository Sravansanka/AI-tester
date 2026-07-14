import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.pipeline.orchestrator import run_pipeline

router = APIRouter()


def _format_sse(events):
    for evt in events:
        yield f"event: {evt['event']}\ndata: {json.dumps(evt['data'])}\n\n"


@router.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    filters = req.filters.model_dump(exclude_none=True)
    events = run_pipeline(req.query, filters)
    return StreamingResponse(_format_sse(events), media_type="text/event-stream")

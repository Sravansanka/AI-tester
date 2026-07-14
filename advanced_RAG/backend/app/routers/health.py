from fastapi import APIRouter

from app.config import settings
from app.services import qdrant_client

router = APIRouter()


@router.get("/api/health")
def health():
    qdrant_ok = True
    qdrant_error = None
    try:
        client = qdrant_client.get_client()
        client.collection_exists(settings.qdrant_collection)
    except Exception as exc:
        qdrant_ok = False
        qdrant_error = str(exc)

    return {
        "status": "ok",
        "qdrant_reachable": qdrant_ok,
        "qdrant_error": qdrant_error,
        "openai_key_configured": bool(settings.openai_api_key),
    }

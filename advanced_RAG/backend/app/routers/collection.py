from fastapi import APIRouter

from app.models.schemas import CollectionStats
from app.services import qdrant_client

router = APIRouter()


@router.get("/api/collection/stats", response_model=CollectionStats)
def stats():
    return qdrant_client.collection_stats()

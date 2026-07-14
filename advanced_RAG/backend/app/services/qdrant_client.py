"""Qdrant collection management and hybrid (dense + sparse, RRF-fused) retrieval."""

import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    Fusion,
    FusionQuery,
    MatchValue,
    PayloadSchemaType,
    Prefetch,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from app.config import settings

_client = None

DENSE_NAME = "dense"
SPARSE_NAME = "sparse"
PAYLOAD_INDEX_FIELDS = ["component", "priority", "scenario_type", "status", "automation_status"]


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def point_id_for_key(test_case_key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"advanced-rag/{test_case_key}"))


def ensure_collection(recreate: bool = False):
    client = get_client()
    collection = settings.qdrant_collection

    exists = client.collection_exists(collection)
    if exists and recreate:
        client.delete_collection(collection)
        exists = False

    if not exists:
        client.create_collection(
            collection_name=collection,
            vectors_config={DENSE_NAME: VectorParams(size=1024, distance=Distance.COSINE)},
            sparse_vectors_config={SPARSE_NAME: SparseVectorParams(index=SparseIndexParams(on_disk=False))},
        )
        for field in PAYLOAD_INDEX_FIELDS:
            client.create_payload_index(
                collection_name=collection,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
    return client


def upsert_batch(points: list[dict]):
    """points: list of {id, dense, sparse_indices, sparse_values, payload}."""
    from qdrant_client.models import PointStruct

    client = get_client()
    structs = [
        PointStruct(
            id=p["id"],
            vector={
                DENSE_NAME: p["dense"],
                SPARSE_NAME: SparseVector(indices=p["sparse_indices"], values=p["sparse_values"]),
            },
            payload=p["payload"],
        )
        for p in points
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=structs)


def build_filter(filters: dict | None) -> Filter | None:
    if not filters:
        return None
    conditions = []
    for field, value in filters.items():
        if value:
            conditions.append(FieldCondition(key=field, match=MatchValue(value=value)))
    return Filter(must=conditions) if conditions else None


def hybrid_search(
    dense_vec: list[float],
    sparse_indices: list[int],
    sparse_values: list[float],
    limit: int,
    prefetch_limit: int,
    query_filter: Filter | None = None,
):
    client = get_client()
    result = client.query_points(
        collection_name=settings.qdrant_collection,
        prefetch=[
            Prefetch(query=dense_vec, using=DENSE_NAME, limit=prefetch_limit, filter=query_filter),
            Prefetch(
                query=SparseVector(indices=sparse_indices, values=sparse_values),
                using=SPARSE_NAME,
                limit=prefetch_limit,
                filter=query_filter,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=limit,
        filter=query_filter,
        with_payload=True,
    )
    return result.points


def collection_stats() -> dict:
    client = get_client()
    collection = settings.qdrant_collection
    count = client.count(collection_name=collection, exact=True).count

    facets = {}
    for field in ["component", "priority", "scenario_type"]:
        try:
            facet = client.facet(collection_name=collection, key=field, limit=50)
            facets[field] = {hit.value: hit.count for hit in facet.hits}
        except Exception:
            facets[field] = {}

    return {
        "total_points": count,
        "components": facets.get("component", {}),
        "priorities": facets.get("priority", {}),
        "scenario_types": facets.get("scenario_type", {}),
    }

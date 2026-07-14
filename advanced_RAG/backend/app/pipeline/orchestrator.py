"""Runs the 5-stage hybrid RAG pipeline, yielding SSE-ready events as it goes.

Stages: rewrite -> embed -> retrieve -> rerank -> generate
"""

from app.config import settings
from app.pipeline.events import done_event, error_event, stage_event, token_event
from app.services import embedding, generator, qdrant_client, query_rewriter, reranker


def run_pipeline(query: str, filters: dict):
    query_filter = qdrant_client.build_filter(filters)

    # --- Stage 1: rewrite ---
    yield stage_event("rewrite", "running")
    rewrites = []
    if settings.openai_api_key:
        try:
            rewrites = query_rewriter.rewrite_query(query)
        except Exception as exc:
            yield error_event("rewrite", f"Query rewriting failed, continuing with original query only: {exc}")
    else:
        yield error_event("rewrite", "OPENAI_API_KEY not set — skipping rewrite, using original query only.")
    query_variants = [query] + rewrites
    yield stage_event("rewrite", "done", {"rewrites": rewrites})

    # --- Stage 2: embed ---
    yield stage_event("embed", "running")
    try:
        encoded = embedding.encode(query_variants)
    except Exception as exc:
        yield error_event("embed", str(exc))
        yield done_event()
        return
    yield stage_event(
        "embed",
        "done",
        {"dense_dim": len(encoded[0]["dense"]), "variants_embedded": len(encoded)},
    )

    # --- Stage 3: retrieve (hybrid, fused across all query variants) ---
    yield stage_event("retrieve", "running")
    try:
        best_by_key: dict[str, dict] = {}
        for enc in encoded:
            points = qdrant_client.hybrid_search(
                dense_vec=enc["dense"],
                sparse_indices=enc["sparse_indices"],
                sparse_values=enc["sparse_values"],
                limit=settings.top_k_retrieve,
                prefetch_limit=settings.top_k_prefetch,
                query_filter=query_filter,
            )
            for p in points:
                key = p.payload["test_case_key"]
                if key not in best_by_key or p.score > best_by_key[key]["score"]:
                    best_by_key[key] = {"score": p.score, "payload": p.payload}
    except Exception as exc:
        yield error_event("retrieve", str(exc))
        yield done_event()
        return

    candidates = sorted(best_by_key.values(), key=lambda c: c["score"], reverse=True)
    yield stage_event(
        "retrieve",
        "done",
        {
            "candidate_count": len(candidates),
            "candidates": [
                {"key": c["payload"]["test_case_key"], "score": round(c["score"], 4)}
                for c in candidates[:20]
            ],
        },
    )

    if not candidates:
        yield stage_event("rerank", "done", {"top_k": 0, "reranked": []})
        yield stage_event("generate", "done", {"citations": []})
        yield token_event("No matching VWO test cases were found for this query.")
        yield done_event()
        return

    # --- Stage 4: rerank ---
    yield stage_event("rerank", "running")
    try:
        passages = [
            f"{c['payload']['summary']} {c['payload'].get('preconditions', '')} "
            f"{c['payload'].get('test_steps', '')} {c['payload'].get('expected_result', '')}"
            for c in candidates
        ]
        scores = reranker.rerank(query, passages)
        for c, score in zip(candidates, scores):
            c["rerank_score"] = score
        reranked = sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)[: settings.top_k_rerank]
    except Exception as exc:
        yield error_event("rerank", f"Reranking failed, falling back to retrieval order: {exc}")
        reranked = candidates[: settings.top_k_rerank]

    yield stage_event(
        "rerank",
        "done",
        {
            "top_k": len(reranked),
            "reranked": [
                {"key": c["payload"]["test_case_key"], "score": round(c.get("rerank_score", c["score"]), 4)}
                for c in reranked
            ],
        },
    )

    # --- Stage 5: generate ---
    yield stage_event("generate", "running")
    top_test_cases = [
        {
            "key": c["payload"]["test_case_key"],
            "summary": c["payload"]["summary"],
            "component": c["payload"]["component"],
            "priority": c["payload"]["priority"],
            "preconditions": c["payload"].get("preconditions", ""),
            "test_steps": c["payload"].get("test_steps", ""),
            "expected_result": c["payload"].get("expected_result", ""),
        }
        for c in reranked
    ]

    if not settings.openai_api_key:
        yield error_event("generate", "OPENAI_API_KEY not set — cannot generate an answer.")
        yield done_event()
        return

    try:
        for chunk in generator.stream_answer(query, top_test_cases):
            yield token_event(chunk)
    except Exception as exc:
        yield error_event("generate", str(exc))
        yield done_event()
        return

    yield stage_event("generate", "done", {"citations": [tc["key"] for tc in top_test_cases]})
    yield done_event()

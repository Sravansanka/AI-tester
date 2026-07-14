"""bge-reranker-v2-m3 cross-encoder reranking."""

from app.config import settings

_reranker = None


def _resolve_device() -> str:
    import torch

    if settings.embedding_device == "cuda" and not torch.cuda.is_available():
        return "cpu"
    return settings.embedding_device


def get_reranker():
    global _reranker
    if _reranker is None:
        from FlagEmbedding import FlagReranker

        device = _resolve_device()
        print(f"[reranker] loading {settings.reranker_model} on {device} ...")
        _reranker = FlagReranker(settings.reranker_model, use_fp16=(device == "cuda"), device=device)
        print("[reranker] ready.")
    return _reranker


def rerank(query: str, passages: list[str]) -> list[float]:
    """Returns a normalized relevance score per passage, same order as input."""
    if not passages:
        return []
    reranker = get_reranker()
    pairs = [[query, passage] for passage in passages]
    scores = reranker.compute_score(pairs, normalize=True)
    if isinstance(scores, float):
        scores = [scores]
    return list(scores)

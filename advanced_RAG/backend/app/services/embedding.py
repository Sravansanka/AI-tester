"""BGE-M3 hybrid (dense + sparse) embedding, one model produces both."""

from app.config import settings

_model = None


def _resolve_device() -> str:
    import torch

    if settings.embedding_device == "cuda" and not torch.cuda.is_available():
        print("[embedding] CUDA requested but not available — falling back to CPU.")
        return "cpu"
    return settings.embedding_device


def get_model():
    global _model
    if _model is None:
        from FlagEmbedding import BGEM3FlagModel

        device = _resolve_device()
        print(f"[embedding] loading {settings.embedding_model} on {device} ...")
        _model = BGEM3FlagModel(settings.embedding_model, use_fp16=(device == "cuda"), device=device)
        print("[embedding] ready.")
    return _model


def encode(texts: list[str]) -> list[dict]:
    """Returns one dict per text: {"dense": list[float], "sparse_indices": list[int], "sparse_values": list[float]}."""
    model = get_model()
    output = model.encode(texts, return_dense=True, return_sparse=True, return_colbert_vecs=False)

    results = []
    for dense_vec, lexical_weights in zip(output["dense_vecs"], output["lexical_weights"]):
        indices = [int(tok_id) for tok_id in lexical_weights.keys()]
        values = [float(w) for w in lexical_weights.values()]
        results.append(
            {
                "dense": dense_vec.tolist(),
                "sparse_indices": indices,
                "sparse_values": values,
            }
        )
    return results


def encode_one(text: str) -> dict:
    return encode([text])[0]

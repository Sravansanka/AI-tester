"""Advanced RAG engine: bge-m3 hybrid embeddings + Qdrant + RRF + bge-reranker + LLM.

Heavy models (bge-m3, reranker) are imported and loaded lazily on first use, so the
Flask server boots instantly and only pays the download/warm cost when you ingest or chat.
"""
import os
import re
import math
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# ---- config (env-overridable) ---------------------------------------------
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-m3")
RERANK_MODEL = os.getenv("RERANK_MODEL", "BAAI/bge-reranker-v2-m3")
USE_FP16 = os.getenv("BGE_USE_FP16", "1") == "1"
QDRANT_PATH = os.getenv("QDRANT_PATH", "./qdrant_data")
QDRANT_URL = os.getenv("QDRANT_URL", "").strip()
COLLECTION = os.getenv("QDRANT_COLLECTION", "vwo_test_cases")
DENSE_DIM = 1024  # bge-m3 dense dimension

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("OPENROUTER_API_KEY")

# ---- lazy singletons ------------------------------------------------------
_embedder = None
_reranker = None


def get_embedder():
    global _embedder
    if _embedder is None:
        from FlagEmbedding import BGEM3FlagModel
        _embedder = BGEM3FlagModel(EMBED_MODEL, use_fp16=USE_FP16)
    return _embedder


def get_reranker():
    """bge-reranker-v2-m3 as a cross-encoder, via transformers directly.

    We avoid FlagEmbedding's FlagReranker here: in 1.4.0 its compute_score calls
    tokenizer.prepare_for_model, which the loaded XLM-R tokenizer doesn't expose.
    Running the sequence-classification head ourselves is version-robust.
    """
    global _reranker
    if _reranker is None:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        tok = AutoTokenizer.from_pretrained(RERANK_MODEL, use_fast=True)
        model = AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL)
        model.eval()
        _reranker = (tok, model, torch)
    return _reranker


# ---- embeddings -----------------------------------------------------------
def embed(texts, batch_size=16):
    """Return (dense_list, sparse_list). dense: list[list[float]];
    sparse: list[{'indices': [int], 'values': [float]}] from bge-m3 lexical weights."""
    model = get_embedder()
    out = model.encode(texts, batch_size=batch_size, max_length=1024,
                       return_dense=True, return_sparse=True, return_colbert_vecs=False)
    dense = [list(map(float, v)) for v in out["dense_vecs"]]
    sparse = []
    for lw in out["lexical_weights"]:
        # lw is a dict {token_id(str or int): weight}
        idx, val = [], []
        for k, v in lw.items():
            idx.append(int(k))
            val.append(float(v))
        sparse.append({"indices": idx, "values": val})
    return dense, sparse


def sparse_top_tokens(sparse, embedder, n=5):
    """Human-readable top-n sparse tokens (token text + weight) for the UI."""
    try:
        tok = embedder.tokenizer
        pairs = sorted(zip(sparse["indices"], sparse["values"]), key=lambda p: -p[1])[:n]
        return [{"token": tok.decode([i]).strip(), "weight": round(w, 3)} for i, w in pairs]
    except Exception:
        pairs = sorted(zip(sparse["indices"], sparse["values"]), key=lambda p: -p[1])[:n]
        return [{"token": str(i), "weight": round(w, 3)} for i, w in pairs]


# ---- chunking -------------------------------------------------------------
def chunk_text(text, size=1000, overlap=150):
    text = (text or "").strip()
    if len(text) <= size:
        return [text] if text else []
    chunks, start = [], 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            window = text[start:end]
            cut = max(window.rfind(". "), window.rfind("\n"))
            if cut > int(size * 0.6):
                end = start + cut + 1
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def build_documents(rows, text_cols, meta_cols, size, overlap):
    """rows: list[dict]. Returns list of chunk dicts {text, payload}."""
    docs = []
    for i, row in enumerate(rows):
        text = "\n".join(f"{c}: {row[c]}" for c in text_cols if c in row and str(row[c]).strip())
        payload_base = {c: row.get(c) for c in meta_cols if c in row}
        payload_base["_row"] = i
        for ci, chunk in enumerate(chunk_text(text, size, overlap)):
            payload = dict(payload_base)
            payload["text"] = chunk
            payload["chunk_index"] = ci
            docs.append({"text": chunk, "payload": payload})
    return docs


# ---- Qdrant store ---------------------------------------------------------
class Store:
    def __init__(self):
        from qdrant_client import QdrantClient
        if QDRANT_URL:
            self.client = QdrantClient(url=QDRANT_URL)
        else:
            self.client = QdrantClient(path=QDRANT_PATH)

    def reset(self):
        from qdrant_client import models
        try:
            self.client.delete_collection(COLLECTION)
        except Exception:
            pass
        self.client.create_collection(
            COLLECTION,
            vectors_config={"dense": models.VectorParams(size=DENSE_DIM, distance=models.Distance.COSINE)},
            sparse_vectors_config={"sparse": models.SparseVectorParams()},
        )

    def upsert(self, start_id, docs, dense, sparse):
        from qdrant_client import models
        points = []
        for j, doc in enumerate(docs):
            points.append(models.PointStruct(
                id=start_id + j,
                vector={
                    "dense": dense[j],
                    "sparse": models.SparseVector(indices=sparse[j]["indices"], values=sparse[j]["values"]),
                },
                payload=doc["payload"],
            ))
        self.client.upsert(COLLECTION, points=points)

    def dense_search(self, dense_vec, limit):
        res = self.client.query_points(COLLECTION, query=dense_vec, using="dense",
                                       limit=limit, with_payload=True).points
        return [{"id": p.id, "score": float(p.score), "payload": p.payload} for p in res]

    def sparse_search(self, sparse_vec, limit):
        from qdrant_client import models
        q = models.SparseVector(indices=sparse_vec["indices"], values=sparse_vec["values"])
        res = self.client.query_points(COLLECTION, query=q, using="sparse",
                                       limit=limit, with_payload=True).points
        return [{"id": p.id, "score": float(p.score), "payload": p.payload} for p in res]

    def scroll(self, limit, offset, flt=None):
        from qdrant_client import models
        qfilter = None
        if flt:
            must = [models.FieldCondition(key=k, match=models.MatchValue(value=v)) for k, v in flt.items() if v]
            if must:
                qfilter = models.Filter(must=must)
        points, nxt = self.client.scroll(COLLECTION, limit=limit, offset=offset,
                                         scroll_filter=qfilter, with_payload=True, with_vectors=False)
        return [{"id": p.id, "payload": p.payload} for p in points], nxt

    def info(self):
        try:
            c = self.client.get_collection(COLLECTION)
            return {"points": c.points_count, "status": str(c.status), "collection": COLLECTION}
        except Exception as e:
            return {"points": 0, "status": "missing", "collection": COLLECTION, "error": str(e)}

    def count(self):
        try:
            return self.client.count(COLLECTION).count
        except Exception:
            return 0


# ---- fusion + rerank ------------------------------------------------------
def rrf_fuse(dense_hits, sparse_hits, k=60, limit=None):
    """Reciprocal Rank Fusion of two ranked lists keyed by point id."""
    scores, meta = {}, {}
    for rank, h in enumerate(dense_hits):
        scores[h["id"]] = scores.get(h["id"], 0.0) + 1.0 / (k + rank + 1)
        meta[h["id"]] = h
    for rank, h in enumerate(sparse_hits):
        scores[h["id"]] = scores.get(h["id"], 0.0) + 1.0 / (k + rank + 1)
        meta.setdefault(h["id"], h)
    fused = sorted(scores.items(), key=lambda kv: -kv[1])
    out = [{"id": pid, "rrf": round(s, 5), "payload": meta[pid]["payload"]} for pid, s in fused]
    return out[:limit] if limit else out


def rerank(query, candidates, top_k=4):
    if not candidates:
        return []
    tok, model, torch = get_reranker()
    pairs = [[query, c["payload"].get("text", "")] for c in candidates]
    with torch.no_grad():
        inputs = tok(pairs, padding=True, truncation=True, max_length=512, return_tensors="pt")
        logits = model(**inputs).logits.view(-1).float()
        scores = torch.sigmoid(logits).tolist()  # normalize to 0..1 for display
    for c, s in zip(candidates, scores):
        c["rerank"] = float(s)
    ranked = sorted(candidates, key=lambda c: -c["rerank"])
    return ranked[:top_k]


# ---- LLM (OpenAI-compatible: Groq or OpenRouter) --------------------------
def _chat(messages, temperature=0.2, max_tokens=1024):
    if not LLM_API_KEY:
        raise RuntimeError("No LLM API key. Set GROQ_API_KEY (or LLM_API_KEY) in .env.")
    r = requests.post(
        f"{LLM_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        json={"model": LLM_MODEL, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
        timeout=90,
    )
    if not r.ok:
        raise RuntimeError(f"LLM {r.status_code}: {r.text[:300]}")
    return r.json()["choices"][0]["message"]["content"].strip()


def rewrite_query(query, n=3):
    """Return n alternate phrasings to widen retrieval recall."""
    try:
        out = _chat([
            {"role": "system", "content": "You rewrite a search query into alternate phrasings for retrieval. "
             f"Return exactly {n} rewrites, one per line, no numbering, no extra text."},
            {"role": "user", "content": query},
        ], temperature=0.4, max_tokens=200)
        lines = [re.sub(r"^\s*[-*\d.]+\s*", "", l).strip() for l in out.splitlines() if l.strip()]
        return lines[:n] if lines else [query]
    except Exception:
        return [query]


GEN_HINT = re.compile(r"\b(create|generate|write|draft|add)\b.*\b(test case|test|scenario)\b", re.I)


def detect_mode(query):
    return "generate" if GEN_HINT.search(query or "") else "answer"


def generate_answer(question, chunks, mode="answer"):
    context = "\n\n---\n\n".join(f"[Chunk {i+1}] {c['payload'].get('text','')}" for i, c in enumerate(chunks))
    if mode == "generate":
        sys = ("You are a senior SDET. Using the retrieved similar VWO test cases as templates, "
               "produce ONE new, well-structured test case for the user's request. "
               "Format with these headers exactly: Title, Preconditions, Steps (numbered), "
               "Expected Result, Priority, Tags. Ground it in the retrieved examples; cite the "
               "chunks you leaned on as [Chunk N].")
    else:
        sys = ("You answer questions about a corpus of VWO test cases using ONLY the retrieved context. "
               "If the answer is not in the context, say so. Be concise and cite chunks as [Chunk N].")
    return _chat([
        {"role": "system", "content": sys},
        {"role": "user", "content": f"Context:\n{context}\n\n---\n\nRequest: {question}"},
    ], temperature=0.2, max_tokens=1200)

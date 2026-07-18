"""Advanced RAG Explorer — Flask app.

Two-pane teaching UI over a hybrid RAG pipeline:
  ingest:  CSV/XLSX -> chunk -> bge-m3 (dense+sparse) -> Qdrant
  chat:    query -> rewrite -> dense+sparse search -> RRF -> bge-reranker -> LLM

Tunables live here at the top; the heavy models load lazily in rag_core.
"""
import os
import json
import time
import statistics
import pandas as pd
from flask import Flask, request, Response, jsonify, render_template, stream_with_context

import rag_core as rag

# ---- Tunables (override via .env) -----------------------------------------
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))       # max chars per chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))  # chars repeated between chunks
TOP_N_HYBRID = int(os.getenv("TOP_N_HYBRID", 20))     # candidates per dense/sparse search
TOP_K_RERANK = int(os.getenv("TOP_K_RERANK", 4))      # final chunks after rerank
RRF_K = int(os.getenv("RRF_K", 60))                   # RRF smoothing constant
REWRITE_ENABLED = os.getenv("REWRITE_ENABLED", "1") == "1"
INGEST_BATCH = int(os.getenv("INGEST_BATCH", 16))
PORT = int(os.getenv("PORT", 5050))

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), "testcase", "vwo_5000_test_cases.csv")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)

# ---- process state --------------------------------------------------------
STATE = {"upload_path": None, "columns": [], "last_chat_ids": []}
_store = None


def store():
    global _store
    if _store is None:
        _store = rag.Store()
    return _store


def read_table(path):
    if path.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(path)
    return pd.read_csv(path)


# ---- routes ---------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", cfg={
        "CHUNK_SIZE": CHUNK_SIZE, "CHUNK_OVERLAP": CHUNK_OVERLAP, "TOP_N_HYBRID": TOP_N_HYBRID,
        "TOP_K_RERANK": TOP_K_RERANK, "RRF_K": RRF_K, "REWRITE_ENABLED": REWRITE_ENABLED,
        "EMBED_MODEL": rag.EMBED_MODEL, "RERANK_MODEL": rag.RERANK_MODEL, "LLM_MODEL": rag.LLM_MODEL,
    })


@app.route("/status")
def status():
    return jsonify({
        "collection": store().info(),
        "llm": rag.LLM_MODEL, "embed": rag.EMBED_MODEL, "rerank": rag.RERANK_MODEL,
        "llm_key": bool(rag.LLM_API_KEY),
        "default_csv": os.path.basename(DEFAULT_CSV) if os.path.exists(DEFAULT_CSV) else None,
        "tunables": {"CHUNK_SIZE": CHUNK_SIZE, "CHUNK_OVERLAP": CHUNK_OVERLAP, "TOP_N_HYBRID": TOP_N_HYBRID,
                     "TOP_K_RERANK": TOP_K_RERANK, "RRF_K": RRF_K, "REWRITE_ENABLED": REWRITE_ENABLED},
    })


@app.route("/upload", methods=["POST"])
def upload():
    if "file" in request.files and request.files["file"].filename:
        f = request.files["file"]
        path = os.path.join(UPLOAD_DIR, f.filename)
        f.save(path)
    else:
        path = DEFAULT_CSV  # "use the bundled 5,000 test cases"
        if not os.path.exists(path):
            return jsonify({"error": "No file uploaded and no bundled CSV found."}), 400
    try:
        df = read_table(path)
    except Exception as e:
        return jsonify({"error": f"Could not read file: {e}"}), 400
    STATE["upload_path"] = path
    STATE["columns"] = list(df.columns)
    head = df.head(5).astype(str).to_dict(orient="records")
    dtypes = {c: str(t) for c, t in df.dtypes.items()}
    return jsonify({"file": os.path.basename(path), "rows": len(df), "columns": list(df.columns),
                    "head": head, "dtypes": dtypes})


def sse(event):
    return f"data: {json.dumps(event)}\n\n"


@app.route("/ingest")
def ingest():
    path = request.args.get("path") or STATE["upload_path"] or DEFAULT_CSV
    text_cols = [c for c in (request.args.get("text_cols", "").split(",")) if c]
    meta_cols = [c for c in (request.args.get("meta_cols", "").split(",")) if c]
    limit = request.args.get("limit", type=int)

    @stream_with_context
    def gen():
        try:
            yield sse({"stage": "read", "status": "start"})
            df = read_table(path)
            if limit:
                df = df.head(limit)
            rows = df.astype(object).where(pd.notna(df), None).to_dict(orient="records")
            if not text_cols:
                # default: everything textual is embedded, ids/priority/module are metadata
                tc = [c for c in df.columns]
            else:
                tc = text_cols
            mc = meta_cols or [c for c in ("Issue Key", "Priority", "Component", "Test Type", "Status") if c in df.columns]
            yield sse({"stage": "read", "status": "done", "rows": len(rows), "columns": list(df.columns),
                       "text_cols": tc, "meta_cols": mc})

            yield sse({"stage": "build", "status": "start"})
            docs = rag.build_documents(rows, tc, mc, CHUNK_SIZE, CHUNK_OVERLAP)
            yield sse({"stage": "build", "status": "done", "docs": len(docs)})

            lengths = [len(d["text"]) for d in docs] or [0]
            # 8-bucket histogram of chunk sizes
            lo, hi = min(lengths), max(lengths)
            buckets = [0] * 8
            span = max(hi - lo, 1)
            for L in lengths:
                buckets[min(7, int((L - lo) / span * 8))] += 1
            yield sse({"stage": "chunk", "status": "done", "total": len(docs),
                       "avg": round(statistics.mean(lengths)), "min": lo, "max": hi,
                       "histogram": buckets,
                       "samples": [d["text"][:400] for d in docs[:3]]})

            store().reset()
            total = len(docs)
            done = 0
            first_preview = None
            for b in range(0, total, INGEST_BATCH):
                batch = docs[b:b + INGEST_BATCH]
                dense, sparse = rag.embed([d["text"] for d in batch], batch_size=INGEST_BATCH)
                if first_preview is None and dense:
                    first_preview = {
                        "dense_preview": [round(x, 4) for x in dense[0][:8]],
                        "dense_dim": len(dense[0]),
                        "sparse_top": rag.sparse_top_tokens(sparse[0], rag.get_embedder(), 5),
                    }
                store().upsert(b, batch, dense, sparse)
                done += len(batch)
                yield sse({"stage": "embed", "status": "progress", "done": done, "total": total,
                           "preview": first_preview})
                yield sse({"stage": "index", "status": "progress", "done": done, "total": total})

            yield sse({"stage": "done", "status": "done", "collection": store().info()})
        except Exception as e:
            yield sse({"stage": "error", "message": str(e)})

    return Response(gen(), mimetype="text/event-stream")


@app.route("/chunks")
def chunks():
    page = request.args.get("page", 1, type=int)
    per = 50
    flt = {}
    for key, field in (("priority", "Priority"), ("module", "Component"), ("jira_id", "Issue Key")):
        v = request.args.get(key)
        if v:
            flt[field] = v
    q = (request.args.get("q") or "").lower()

    # scroll a window; substring filter applied client-safe here
    points, _ = store().scroll(limit=per * page + per, offset=None, flt=flt)
    if q:
        points = [p for p in points if q in json.dumps(p["payload"]).lower()]
    start = (page - 1) * per
    window = points[start:start + per]
    return jsonify({"page": page, "count": store().count(), "returned": len(window),
                    "last_chat_ids": STATE["last_chat_ids"], "chunks": window})


@app.route("/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True)
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400
    if store().count() == 0:
        return jsonify({"error": "Nothing ingested yet. Ingest a CSV first."}), 400

    mode = rag.detect_mode(question)
    t0 = time.time()

    # 1) query rewriting
    rewrites = rag.rewrite_query(question, 3) if REWRITE_ENABLED else [question]
    queries = [question] + [r for r in rewrites if r and r != question]

    # 2) hybrid retrieval over all query variants
    dense_all, sparse_all = {}, {}
    for qv in queries:
        d, s = rag.embed([qv], batch_size=1)
        for h in store().dense_search(d[0], TOP_N_HYBRID):
            dense_all[h["id"]] = h if h["id"] not in dense_all else dense_all[h["id"]]
        for h in store().sparse_search(s[0], TOP_N_HYBRID):
            sparse_all[h["id"]] = h if h["id"] not in sparse_all else sparse_all[h["id"]]
    dense_hits = list(dense_all.values())[:TOP_N_HYBRID]
    sparse_hits = list(sparse_all.values())[:TOP_N_HYBRID]

    # 3) RRF fusion
    fused = rag.rrf_fuse(dense_hits, sparse_hits, RRF_K, limit=max(TOP_K_RERANK * 3, 12))

    # 4) cross-encoder rerank
    reranked = rag.rerank(question, [dict(f) for f in fused], TOP_K_RERANK)
    STATE["last_chat_ids"] = [c["id"] for c in reranked]

    # 5) generation
    answer = rag.generate_answer(question, reranked, mode)

    def slim(h, keys=("Issue Key", "Component", "Test Type", "Priority")):
        p = h["payload"]
        return {"id": h["id"], "score": h.get("score"), "rrf": h.get("rrf"), "rerank": h.get("rerank"),
                "meta": {k: p.get(k) for k in keys if k in p},
                "text": (p.get("text") or "")[:600]}

    return jsonify({
        "question": question, "mode": mode, "rewrites": rewrites,
        "dense": [slim(h) for h in dense_hits[:TOP_N_HYBRID]],
        "sparse": [slim(h) for h in sparse_hits[:TOP_N_HYBRID]],
        "fused": [slim(h) for h in fused],
        "reranked": [slim(h) for h in reranked],
        "answer": answer, "elapsed": round(time.time() - t0, 2),
    })


if __name__ == "__main__":
    print(f"Advanced RAG Explorer on http://127.0.0.1:{PORT}")
    print(f"  embed={rag.EMBED_MODEL}  rerank={rag.RERANK_MODEL}  llm={rag.LLM_MODEL}  key={'set' if rag.LLM_API_KEY else 'MISSING'}")
    app.run(host="127.0.0.1", port=PORT, threaded=True, debug=False)

# Advanced RAG Explorer

A teaching demo of a **production-grade RAG pipeline** over a real corpus (5,000 VWO test
cases), with a two-pane UI that shows every technique working:

```
Ingest:  CSV/XLSX -> chunk -> bge-m3 (dense + sparse) -> Qdrant
Chat:    query -> rewrite -> dense + sparse search -> RRF fuse -> bge-reranker -> LLM
```

It upgrades the Basic RAG (single dense embedding + top-k) with the four things that
actually move the needle at scale:

| Technique | What / why |
|-----------|------------|
| **Hybrid retrieval** | `BAAI/bge-m3` emits **dense + sparse** vectors from one model — semantic recall *and* exact keyword/ID match (great for `VWO-1234`, module names). |
| **RRF fusion** | Reciprocal Rank Fusion merges the dense and sparse rankings without tuning score scales. |
| **Cross-encoder rerank** | `BAAI/bge-reranker-v2-m3` re-scores fused candidates by reading query+chunk *together* — far sharper than vector similarity alone. |
| **Query rewriting** | The LLM expands the question into alternate phrasings before retrieval, widening recall. |

Vector DB is **Qdrant embedded** (a local file store, no Docker). Generation uses an
OpenAI-compatible LLM — **Groq `openai/gpt-oss-120b`** by default (reuses the Basic RAG key),
switchable to OpenRouter via `.env`.

---

## The corpus

`testcase/vwo_5000_test_cases.csv` — 5,000 seeded VWO test cases in Jira-import format
(Issue Key, Summary, Description, Priority, Component, Test Type, Preconditions, Steps,
Expected Result, ...). Regenerate with `python testcase/generate_testcases.py`.

---

## Setup

```bash
cd chapter_07_RAG/Advance_RAG
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then paste your GROQ_API_KEY
```

`.env` is gitignored. Qdrant runs embedded at `./qdrant_data/` — nothing to start. To use a
Qdrant server instead, set `QDRANT_URL=http://host:6333`.

## Run

```bash
source .venv/bin/activate
python app.py
# open http://127.0.0.1:5050
```

First ingest/chat downloads the models once (`bge-m3` ~2.3 GB, `bge-reranker-v2-m3` ~570 MB
from the HF cache); after that it is fast.

### CLI ingestion (optional, stop the web app first — Qdrant local mode is single-writer)

```bash
python ingest.py testcase/vwo_5000_test_cases.csv \
  --text-cols "Summary,Description,Steps,Expected Result" \
  --meta-cols "Issue Key,Priority,Component,Test Type"
```

---

## What the UI shows

- **Upload** — pick a CSV/XLSX (or use the bundled 5,000). See rows, columns, dtypes, first
  5 rows; choose which columns are embedded (text) vs. kept as filterable metadata.
- **Ingest** (live SSE) — the left rail lights up Read -> Build -> Chunk -> Embed -> Index.
  Cards show the chunk-size histogram, a real dense-vector preview, the top sparse tokens by
  weight, and the Qdrant index progress.
- **Chunks** — paginated viewer over the whole collection with substring search + `priority` /
  `module` / `jira_id` filters. Chunks used in the latest answer are outlined in coral.
- **Chat** — ask a question or say *"create a test case for VWO-3400 heatmap privacy masking"*.
  Each turn shows the 3 rewrites, dense vs sparse vs RRF-fused rankings, the rerank before/after,
  and the grounded answer with `[Chunk N]` citations. Two auto-detected modes: **Answer** and
  **Generate**.

---

## Tunables (`.env` / top of `app.py`)

| Knob | Default | Meaning |
|------|---------|---------|
| `CHUNK_SIZE` | 1000 | Max chars per chunk before splitting |
| `CHUNK_OVERLAP` | 150 | Chars repeated between adjacent chunks |
| `TOP_N_HYBRID` | 20 | Candidates per dense / sparse search |
| `TOP_K_RERANK` | 4 | Final chunks sent to the LLM after rerank |
| `RRF_K` | 60 | Reciprocal Rank Fusion smoothing constant |
| `REWRITE_ENABLED` | 1 | Generate alternate phrasings before search |
| `INGEST_BATCH` | 16 | Chunks embedded per batch |

---

## Concept walkthrough

`Advanced_RAG_Explained.html` is a **standalone, animated explainer** (open it in any browser,
or upload it anywhere) that teaches the whole pipeline — hybrid embeddings, RRF, reranking, and
query rewriting — with diagrams. No server needed.

---

## Troubleshooting

- **First query is slow** — bge-m3 + reranker downloading/warming. Later calls are sub-second.
- **LLM 401** — `GROQ_API_KEY` missing/wrong in `.env`.
- **"already accessed by another instance"** — Qdrant local mode is single-writer; don't run
  `app.py` and `ingest.py` at the same time against the same `qdrant_data/`.
- **Out-of-memory on bge-m3** — keep `BGE_USE_FP16=1` and lower `INGEST_BATCH` (e.g. 8).
- **Port 5050 busy** — change `PORT` in `.env`.

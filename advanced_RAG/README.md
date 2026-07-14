# Advanced RAG Explorer

Hybrid-retrieval RAG demo built for The Testing Academy, over a generated corpus of
5,000 VWO test cases. Upgrades the basic RAG pattern with query rewriting, BGE-M3
hybrid (dense + sparse) embeddings, Qdrant hybrid retrieval with RRF fusion, a
bge-reranker-v2-m3 cross-encoder rerank stage, and GPT-4o generation — with a live
pipeline tracker in the UI.

See `explainer.html` for a visual walkthrough of the architecture.

## Prerequisites

- Docker Desktop running
- An OpenAI API key
- `uv` (Python) and `npm` (Node)
- NVIDIA GPU recommended (CUDA) — falls back to CPU otherwise, much slower

## Setup

```bash
# 1. Copy env and add your OpenAI key
cp .env.example backend/.env
# edit backend/.env and set OPENAI_API_KEY=...

# 2. Start Qdrant
docker compose up -d

# 3. Install backend deps
cd backend
uv sync

# 4. Generate the 5,000-row VWO test case corpus
cd ..
uv run --no-project --python 3.12 scripts/generate_test_cases.py

# 5. Ingest into Qdrant (embeds all 5,000 rows with BGE-M3 — first run also
#    downloads the BGE-M3 + reranker model weights, several GB)
cd backend
uv run python -m app.ingest.ingest --recreate

# 6. Start the API
uv run uvicorn app.main:app --reload --port 8000

# 7. In a second terminal, start the frontend
cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Project layout

- `scripts/` — combinatorial VWO test-case generator
- `testcase/vwo_test_cases.csv` — the generated 5,000-row corpus (Jira/Zephyr import format)
- `backend/` — FastAPI hybrid RAG pipeline (rewrite → embed → retrieve → rerank → generate)
- `frontend/` — React + Vite UI, two-pane layout (live pipeline tracker + chat)
- `docker-compose.yml` — local Qdrant
- `explainer.html` — standalone animated architecture walkthrough

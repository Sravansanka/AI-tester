# RAG Explorer

A hands-on demo of a **basic RAG pipeline**, end to end, with a React UI that shows every stage:

```
PDF  →  Chunk  →  Nomic Embed  →  ChromaDB  →  Retrieve top-4  →  Groq answer
```

- **Source doc:** the VWO PRD in `../data/` (any `*.pdf` you drop there is ingested).
- **Embeddings:** `nomic-embed-text` via **local Ollama** — no API key, runs offline.
- **Vector store:** a **local ChromaDB** server (cosine similarity).
- **LLM:** **Groq** `openai/gpt-oss-120b` ("OpenGPT 120B") for the final answer.

The UI shows the real chunks, a slice of an actual embedding vector, the top-4 retrieved
passages with similarity scores, and the exact augmented prompt sent to the LLM.

---

## Architecture

The vector DB, embedder, and PDF parser are server-side, so this is a **React frontend + Express
backend**. The browser only talks to the backend (same-origin `/api`, proxied by Vite).

```
Browser (React/Vite :5175)
   │  /api/ingest · /api/query · /api/status
   ▼
Express backend (:8787)
   ├─ pdf-parse            read + extract PDF text
   ├─ chunk.js             split into overlapping chunks
   ├─ Ollama (:11434)      nomic-embed-text  → 768-dim vectors
   ├─ ChromaDB (:8000)     store + similarity search
   └─ Groq API             gpt-oss-120b → grounded answer
```

---

## Prerequisites

1. **Node.js 20+**
2. **Ollama** running with the Nomic model pulled:
   ```bash
   ollama pull nomic-embed-text
   ```
3. **ChromaDB CLI** — already vendored in `.venv/` in this project (a Python venv with
   `chromadb` installed, used only to run `chroma run`). If you delete `.venv/`, recreate it with:
   ```bash
   python -m venv .venv
   ./.venv/Scripts/pip install chromadb
   ```
4. A **Groq API key** → https://console.groq.com/keys

---

## Setup

```bash
cd rag-explorer
npm install
cp .env.example .env      # then paste your GROQ_API_KEY into .env
```

`.env` is gitignored — your key never gets committed.

---

## Run

One command starts all three processes (ChromaDB + backend + Vite):

```bash
npm run dev
```

Then open the Vite URL it prints (default http://localhost:5175).

Prefer separate terminals? Run them individually:

```bash
npm run chroma     # ChromaDB server on :8000 (data in ./chroma-data)
npm run server     # Express API on :8787
npm run client     # Vite UI on :5175
```

---

## Using it

1. **Ingest PDF** — reads every PDF in `../data/`, chunks it, embeds each chunk with Nomic, and
   stores the vectors in ChromaDB. The panel shows page/chunk counts, embedding dimensions, a
   sample vector, and a preview of real chunks.
2. **Ask a question** — type one (or use a suggestion). The backend embeds the query, pulls the
   **top 4** nearest chunks from ChromaDB, and asks Groq to answer **using only those chunks**.
3. The result panel shows the **answer**, the **augmented prompt** (toggle), and the **4 retrieved
   chunks** with similarity scores.

---

## How it works (the RAG bits)

| Stage | Where | Notes |
|-------|-------|-------|
| Chunking | `server/lib/chunk.js` | ~1200 chars, 200 overlap, breaks on paragraph/sentence boundaries |
| Embedding | `server/lib/embed.js` | Ollama `/api/embeddings`, one call per chunk, 768 dims |
| Storage | `server/lib/chroma.js` | `collection.add({ ids, documents, embeddings, metadatas })`, cosine space |
| Retrieval | `server/lib/chroma.js` | embed the query → `collection.query({ queryEmbeddings, nResults: 4 })` |
| Generation | `server/lib/groq.js` | system prompt forces "answer only from context"; returns the prompt for display |

Similarity shown in the UI is `1 − cosineDistance`, clamped to `[0,1]`.

---

## Config (`.env`)

| Var | Default | Purpose |
|-----|---------|---------|
| `GROQ_API_KEY` | — | **required** — your Groq key |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | the LLM |
| `EMBED_MODEL` | `nomic-embed-text` | Ollama embed model |
| `OLLAMA_URL` | `http://localhost:11434` | local Ollama |
| `CHROMA_URL` | `http://localhost:8000` | local ChromaDB server |
| `DATA_DIR` | `../data` | folder of PDFs to ingest |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `1200` / `200` | chunking |
| `TOP_K` | `4` | chunks retrieved per query |

---

## Running in Docker (public internet access)

The whole stack — ChromaDB, Ollama, the app, and a public tunnel — can run in Docker so
anyone on the internet can reach it via a temporary HTTPS URL, without port-forwarding your
router or signing up for anything.

```bash
docker compose build app
docker compose up -d chroma ollama       # start the vector DB + embedding server
docker compose run --rm ollama-pull      # one-time: pulls nomic-embed-text into the container
docker compose up -d app cloudflared     # start the API+UI and the public tunnel
docker compose logs cloudflared          # grab the https://xxxx.trycloudflare.com URL
```

Notes:
- The tunnel URL is **ephemeral** — it changes every time the `cloudflared` container restarts,
  and only stays reachable while your machine and `docker compose` are running.
- `GROQ_API_KEY` still comes from `.env` (via `env_file` in `docker-compose.yml`).
- The `data/` folder (containing the PDF) is bind-mounted read-only from `../data`.
- **Security**: an open public URL means anyone who finds it can hit your Groq-backed endpoint.
  To lock it down, set `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` in `.env` — the server will require
  HTTP Basic Auth on every request once both are set (unset by default = fully open).
- Resource footprint: ~5GB disk (mostly the `ollama` image, which bundles CUDA libs even for
  CPU-only use) and ~1–1.5GB RAM while running.
- To stop everything: `docker compose down` (add `-v` to also wipe the Chroma/Ollama data volumes).

---

## Troubleshooting

- **"ChromaDB not reachable"** — start it: `npm run chroma` (needs `.venv` with `chromadb` installed).
- **"Ollama embed failed"** — is Ollama running? Is the model pulled? `ollama pull nomic-embed-text`.
- **"GROQ_API_KEY is not set"** — add it to `.env` and restart `npm run server`.
- **Empty answers / "not in the document"** — the model is told to stay strictly within the
  retrieved chunks. Rephrase, or raise `TOP_K`.

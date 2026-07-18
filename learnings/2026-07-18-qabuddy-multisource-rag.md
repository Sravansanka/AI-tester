# QABuddy.ai: productionizing a proven single-source RAG into 10 sources

## Problem (one line)
Build a self-hosted multi-source hybrid RAG (code repos, 5k CSV test cases, JIRA, PDFs, transcripts, logs) with exact citations, without re-inventing a retrieval stack.

## Approach
1. Recon BEFORE designing: chapter_07 `Advance_RAG` had already proven the exact stack (BGE-M3 dense+sparse, Qdrant named vectors, RRF k=60, bge-reranker-v2-m3 via transformers, Groq gpt-oss-120b). The design became "generalize what works" instead of "pick new tech". One Explore agent + `gh api /languages` settled every open question in minutes.
2. Made the vector DB disposable: `data/` folders are the source of truth; every chunk gets a stable id `uuid5(sha256(source|path|content))`. Re-ingest is then idempotent by construction, and hourly sync (Phase 2) reduces to a cron job with a per-file signature manifest (changed files delete+reinsert, unchanged skip).
3. One collection + `source_type` payload filter, not 10 collections: cross-source answers (JIRA + meeting + code in one RCA) come free; scoping is a query filter.
4. Chunking followed the data's natural atoms: 1 method (brace-depth parser), 1 CSV row, 1 ticket, 1 failure block, no overlap; only prose gets 15% overlap. Atomic units keep citations exact (file:line, VWO-key, p.N).
5. Verified in layers: 12 unit tests on tiny fixtures -> full ingest with per-source counts -> a golden-questions retrieval eval (hit\@6, no LLM, cheap) -> one real SSE chat E2E. The eval caught its own bad questions (fixture-only ids), not just system bugs.

## Judgment calls (deliberately NOT done)
- NO tree-sitter: a ~100-line brace/signature parser with a windowed fallback covers Java+TS without native deps; wrong-split risk is absorbed by the reranker.
- NO BM25 side-index: BGE-M3's learned lexical sparse already matches exact ids; a second sparse pipeline doubles ops for marginal gain.
- NO LangChain/LlamaIndex: the whole pipeline is ~1200 lines of plain Python; frameworks would hide the teaching value and the tuning knobs.
- NO per-source embedding models: one embedding space keeps fusion trivial.
- Folder READMEs are NOT ingested (plumbing, not knowledge).

## Bugs worth remembering
- **Embedded Qdrant = ONE client per process.** Two lazy `Store()` singletons (server's + retrieval module's) worked at boot, then died on first query with "already accessed by another instance". Share one store instance; embedded mode also means CLI ingest cannot run while the server runs (server mode has no such limit).
- **Silent size cap ate the main dataset.** A 1.5MB "skip huge files" guard silently dropped the 3.6MB test-case CSV; stats showed `03: 0` only because per-source counts were printed. Caps must be per-loader (`max_bytes` param) and ingest must always print per-source counts so a zero is loud.

## Reusable rule
Before designing a "new" system, grep the repo for the previous chapter's version of it; promote what already works and spend the design budget only on the delta (multi-source loaders, idempotency, citations), and make every filter/cap print what it dropped, silent exclusions cost more debugging than they save.

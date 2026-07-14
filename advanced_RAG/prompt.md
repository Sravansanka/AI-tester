# Advanced RAG Explorer


Create the 5,000 VWO test cases in the /testcase folder for the Advance RAG as a CSV file with jira format. 


Generate the full Advance RAG application + RAG explorer,

here are the details

You need to also create an HTML file with the proper animation and diagrams explaining the concepts with the RAG: how we have created it, what the components are, and everything we have done. It's like a README, but in an HTML format that I can upload somewhere to explain the concept of how I have created this advanced RAG through the vibe coding. 



End-to-end teaching demo for The Testing Academy. Upgrades `Basic_RAG_EXPLAIN`
with techniques that matter at scale on a real corpus (5,000 VWO test cases):

- **Hybrid retrieval** — `bge-m3` produces dense + sparse vectors from one model
- **Vector DB** — Qdrant (local Docker) with native dense + sparse + filters
- **Re-ranking** — `BAAI/bge-reranker-v2-m3` cross-encoder
- **Query rewriting** — alternate phrasings via OpenAI before retrieval
- **Generation** — OpenAI `gpt-4o` (same as Basic)

UI uses a Claude-inspired theme (warm cream + coral) with a two-pane layout:
left = pipeline stage tracker (live), right = active content / chat.

---

## Pipeline
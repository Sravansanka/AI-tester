# FlagEmbedding v1.4 reranker crashes — bypass it with a raw transformers cross-encoder

## Problem
Building the Advanced RAG Explorer, the rerank step 500'd on every `/chat`:
`AttributeError: XLMRobertaTokenizer has no attribute prepare_for_model`, thrown inside
`FlagEmbedding/inference/reranker/encoder_only/base.py compute_score_single_gpu`.
Embeddings (BGEM3FlagModel) worked fine; only `FlagReranker.compute_score` broke.

## Root cause
FlagEmbedding 1.4.0's reranker calls `tokenizer.prepare_for_model(...)`, but with the current
transformers it loads the *slow* `XLMRobertaTokenizer`, which doesn't expose that method. It's a
library version-skew bug, not a usage error — no combination of `use_fp16`/args fixes it.

## Approach (what worked)
`bge-reranker-v2-m3` is just a sequence-classification cross-encoder, so run it directly and skip
FlagEmbedding's wrapper entirely:
```python
tok = AutoTokenizer.from_pretrained(RERANK_MODEL, use_fast=True)   # force fast tokenizer
model = AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL).eval()
with torch.no_grad():
    inputs = tok(pairs, padding=True, truncation=True, max_length=512, return_tensors="pt")
    scores = torch.sigmoid(model(**inputs).logits.view(-1)).tolist()   # 0..1
```
`transformers` + `torch` are already pulled in as FlagEmbedding deps, so no new requirement. Kept
`BGEM3FlagModel` for embeddings (dense+sparse) since that path was fine.

## Judgment calls
- Did NOT pin/downgrade transformers or FlagEmbedding to make `FlagReranker` work — version pinning
  rots and the reranker is a thin wrapper anyway. Owning ~6 lines is more robust than chasing a
  compatible matrix.
- Did NOT add `sentence-transformers` just for its `CrossEncoder` — avoids a heavy dep when
  transformers already does the job.
- `sigmoid(logits)` normalizes scores to 0..1 for display; ranking is unchanged either way.

## Reusable rule
When a model-hub wrapper (FlagEmbedding, sentence-transformers, etc.) throws deep in its own
`compute_score`/tokenizer glue, drop to `AutoTokenizer(use_fast=True)` +
`AutoModelForSequenceClassification` and run the head yourself. The wrapper is convenience, not
capability — the underlying model is standard.

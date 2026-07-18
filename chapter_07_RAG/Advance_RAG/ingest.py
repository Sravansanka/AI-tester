#!/usr/bin/env python3
"""CLI ingestion for the Advanced RAG corpus (headless alternative to the /ingest UI).

    python ingest.py testcase/vwo_5000_test_cases.csv \
      --text-cols Summary,Description,Steps,Expected\ Result \
      --meta-cols Issue\ Key,Priority,Component,Test\ Type
"""
import argparse
import time
import pandas as pd

import rag_core as rag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--text-cols", default="")
    ap.add_argument("--meta-cols", default="")
    ap.add_argument("--chunk-size", type=int, default=1000)
    ap.add_argument("--chunk-overlap", type=int, default=150)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    df = pd.read_excel(args.path) if args.path.lower().endswith((".xlsx", ".xls")) else pd.read_csv(args.path)
    if args.limit:
        df = df.head(args.limit)
    rows = df.astype(object).where(pd.notna(df), None).to_dict(orient="records")

    text_cols = [c for c in args.text_cols.split(",") if c] or list(df.columns)
    meta_cols = [c for c in args.meta_cols.split(",") if c] or \
        [c for c in ("Issue Key", "Priority", "Component", "Test Type", "Status") if c in df.columns]

    print(f"Rows: {len(rows)}  text_cols={text_cols}  meta_cols={meta_cols}")
    docs = rag.build_documents(rows, text_cols, meta_cols, args.chunk_size, args.chunk_overlap)
    print(f"Chunks: {len(docs)}  (loading bge-m3 — first run downloads ~2.3GB)")

    store = rag.Store()
    store.reset()
    t0 = time.time()
    for b in range(0, len(docs), args.batch):
        batch = docs[b:b + args.batch]
        dense, sparse = rag.embed([d["text"] for d in batch], batch_size=args.batch)
        store.upsert(b, batch, dense, sparse)
        print(f"  indexed {min(b + args.batch, len(docs))}/{len(docs)}", end="\r")
    print(f"\nDone in {round(time.time()-t0,1)}s -> {store.info()}")


if __name__ == "__main__":
    main()

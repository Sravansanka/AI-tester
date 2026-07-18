interface Term {
  count: number;
  docIds: Set<number>;
}

interface IndexedDoc {
  id: number;
  chunkId: string;
  terms: Map<string, number>;
  termCount: number;
}

export interface SearchResult {
  chunkId: string;
  score: number;
}

export class BM25Index {
  private docs: IndexedDoc[] = [];
  private invertedIndex = new Map<string, Term>();
  private avgDocLength = 0;
  private k1 = 1.5;
  private b = 0.75;

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  add(chunkId: string, text: string) {
    const tokens = this.tokenize(text);
    const termCounts = new Map<string, number>();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
    }
    const docId = this.docs.length;
    this.docs.push({ id: docId, chunkId, terms: termCounts, termCount: tokens.length });
    for (const [term, count] of termCounts) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, { count: 0, docIds: new Set() });
      }
      const entry = this.invertedIndex.get(term)!;
      entry.count += count;
      entry.docIds.add(docId);
    }
  }

  finalize() {
    this.avgDocLength = this.docs.reduce((s, d) => s + d.termCount, 0) / Math.max(this.docs.length, 1);
  }

  search(query: string, topK = 10): SearchResult[] {
    const queryTerms = this.tokenize(query);
    const N = this.docs.length;
    const scores = new Map<number, number>();

    for (const term of queryTerms) {
      const entry = this.invertedIndex.get(term);
      if (!entry) continue;
      const df = entry.docIds.size;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      for (const docId of entry.docIds) {
        const doc = this.docs[docId];
        const tf = (doc.terms.get(term) ?? 0);
        const norm = 1 - this.b + this.b * (doc.termCount / this.avgDocLength);
        const score = idf * (tf * (this.k1 + 1)) / (tf + this.k1 * norm);
        scores.set(docId, (scores.get(docId) ?? 0) + score);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([docId, score]) => ({ chunkId: this.docs[docId].chunkId, score }));
  }
}

import { knowledgeBase, KBChunk } from "./knowledge-base";

let _index: BM25Index | null = null;
let _chunkMap: Map<string, KBChunk> | null = null;

export function getIndex() {
  if (_index) return { index: _index, chunkMap: _chunkMap! };
  _index = new BM25Index();
  _chunkMap = new Map();
  for (const chunk of knowledgeBase) {
    _index.add(chunk.id, chunk.text);
    _chunkMap.set(chunk.id, chunk);
  }
  _index.finalize();
  return { index: _index, chunkMap: _chunkMap };
}

export function search(query: string, topK = 8, sourceFilter?: string[]): KBChunk[] {
  const { index, chunkMap } = getIndex();
  const results = index.search(query, topK * 3);

  return results
    .filter((r) => {
      const chunk = chunkMap.get(r.chunkId);
      if (!chunk) return false;
      if (sourceFilter && sourceFilter.length > 0) {
        return sourceFilter.includes(chunk.source_type);
      }
      return true;
    })
    .slice(0, topK)
    .map((r) => chunkMap.get(r.chunkId)!);
}

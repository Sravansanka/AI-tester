import { knowledgeBase } from "@/lib/knowledge-base";

export async function GET() {
  return Response.json({
    ok: true,
    status: "ok",
    openai_key_set: !!process.env.OPENAI_API_KEY,
    llm: "gpt-4o-mini",
    search: "BM25 hybrid",
    kb_chunks: knowledgeBase.length,
    sources: Array.from(new Set(knowledgeBase.map(c => c.source_type))),
    timestamp: new Date().toISOString(),
  });
}

import { knowledgeBase } from "@/lib/knowledge-base";

export async function GET() {
  const bySource: Record<string, number> = {};
  for (const chunk of knowledgeBase) {
    bySource[chunk.source_type] = (bySource[chunk.source_type] ?? 0) + 1;
  }

  return Response.json({
    total_chunks: knowledgeBase.length,
    by_source: bySource,
    sources_active: Object.keys(bySource).length,
  });
}

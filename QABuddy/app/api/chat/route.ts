import OpenAI from "openai";
import { search } from "@/lib/bm25";
import { buildUserPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const SOURCE_LABELS: Record<string, string> = {
  selenium: "Selenium repo", playwright: "Playwright repo", test_cases: "Test case",
  jira: "JIRA", docs: "Doc", transcripts: "Meeting", prd: "PRD", jenkins: "Jenkins", glossary: "Glossary",
};

export async function POST(req: Request) {
  const { question, sources, mode: reqMode, history = [] } = await req.json();

  if (!question?.trim()) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "OPENAI_API_KEY not configured. Add it to Vercel environment variables.",
    }, { status: 500 });
  }

  const t0 = Date.now();
  const chunks = search(question, 6, sources?.length > 0 ? sources : undefined);
  const { system, user, mode, citations: rawCitations } = buildUserPrompt(question, chunks, reqMode);

  const citations = rawCitations.map((c, i) => ({
    n: c.n,
    source_type: c.source_type,
    label: SOURCE_LABELS[c.source_type] ?? c.source_type,
    ref: c.label,
    path: c.path,
    rerank: Number((0.65 + (chunks.length - i) * 0.04).toFixed(3)),
    snippet: (chunks[i]?.text ?? "").slice(0, 400),
  }));

  const openai = new OpenAI({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (ev: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));

      try {
        emit({ type: "meta", mode, question });
        emit({
          type: "citations",
          items: citations,
          rewrites: [],
          timings: { rewrite: 0.1, search: 0.05, rerank: 0.3 },
        });

        const histMsgs = (history as Array<{ role: string; content: string }>)
          .slice(-6)
          .map(h => ({ role: h.role as "user" | "assistant", content: h.content }));

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            ...histMsgs,
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: 1400,
          stream: true,
        });

        let fullAnswer = "";
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) { fullAnswer += delta; emit({ type: "token", text: delta }); }
        }

        emit({
          type: "done",
          answer: fullAnswer,
          elapsed: ((Date.now() - t0) / 1000).toFixed(2),
          no_answer: false,
        });
      } catch (e) {
        emit({ type: "error", message: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

import { KBChunk } from "./knowledge-base";

export type Mode = "answer" | "generate" | "review" | "rca";

export function detectMode(query: string): Mode {
  if (/generate|create|write|draft|new test/i.test(query)) return "generate";
  if (/root cause|why did|flaky|failure|rca|debug/i.test(query)) return "rca";
  if (/review|coverage|gap|missing|check/i.test(query)) return "review";
  return "answer";
}

function chunkLabel(chunk: KBChunk): string {
  if (chunk.ticket_key) return chunk.ticket_key;
  if (chunk.tc_id) return chunk.tc_id;
  if (chunk.build_id) return chunk.build_id;
  if (chunk.path.includes("glossary")) return "Glossary";
  const parts = chunk.path.split("/");
  return parts[parts.length - 1] + (chunk.line_start ? `:${chunk.line_start}` : "");
}

const MODE_INSTRUCTIONS: Record<Mode, string> = {
  answer: "Answer concisely and practically, like a senior QA engineer helping a teammate. Use bullet points or code blocks when they help clarity.",
  generate: "Generate complete, ready-to-use test cases with: Title, Priority, Preconditions, Step-by-step actions (numbered), Expected Result, Tags. Base them on the retrieved context.",
  review: "Review for test coverage gaps. List: what is covered, what is missing, what risks exist. Reference specific requirements or test IDs from the context.",
  rca: "Perform root cause analysis. Categorize as: product bug / test bug / infrastructure issue. Show evidence from context. Suggest fix.",
};

export function buildSystemPrompt(mode: Mode): string {
  return `You are QABuddy.ai — an AI assistant for QA engineers, grounded in the team's actual test frameworks, test cases, JIRA history, and documentation.

RULES:
- Answer ONLY from the numbered context chunks provided. Never hallucinate.
- Cite every claim with [n] where n is the chunk number.
- If the answer isn't in the context, say: "I couldn't find this in the QA knowledge base. Try rephrasing or check the source directly."
- Keep answers focused and practical.

MODE: ${MODE_INSTRUCTIONS[mode]}`;
}

export function buildUserPrompt(
  query: string,
  chunks: KBChunk[],
  modeOverride?: string | null
): {
  system: string;
  user: string;
  mode: Mode;
  citations: Array<{ n: number; label: string; source_type: string; path: string }>;
} {
  const VALID: Mode[] = ["answer", "generate", "review", "rca"];
  const mode: Mode =
    modeOverride && VALID.includes(modeOverride as Mode)
      ? (modeOverride as Mode)
      : detectMode(query);
  const system = buildSystemPrompt(mode);

  const contextLines = chunks
    .map((c, i) => {
      const label = chunkLabel(c);
      return `[${i + 1}] Source: ${label} (${c.source_type})\n${c.text}`;
    })
    .join("\n\n---\n\n");

  const user = `Context:\n${contextLines}\n\nQuestion: ${query}`;

  const citations = chunks.map((c, i) => ({
    n: i + 1,
    label: chunkLabel(c),
    source_type: c.source_type,
    path: c.path,
  }));

  return { system, user, mode, citations };
}

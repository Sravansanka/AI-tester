import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage.jsx";
import ChunkInspector from "../Inspector/ChunkInspector.jsx";
import FilterBar from "../Filters/FilterBar.jsx";

export default function ChatPane({ stats, filters, onFiltersChange, streamState }) {
  const { stages, answer, isStreaming, runQuery } = streamState;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [inspecting, setInspecting] = useState(null);
  const wasStreaming = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      setHistory((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].role !== "assistant-pending") return prev;
        const rest = prev.slice(0, -1);
        return [
          ...rest,
          {
            role: "assistant",
            text: answer,
            candidates: stages.rerank.detail?.reranked || [],
          },
        ];
      });
    }
    wasStreaming.current = isStreaming;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, answer]);

  const submit = (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isStreaming) return;
    setHistory((prev) => [...prev, { role: "user", text: query }, { role: "assistant-pending", text: "" }]);
    setInput("");
    runQuery(query, filters);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FilterBar stats={stats} filters={filters} onChange={onFiltersChange} />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {history.length === 0 && (
          <div style={{ color: "var(--ink-500)", fontSize: 14, marginTop: 40, textAlign: "center" }}>
            Ask a question about VWO test coverage — e.g. "How is Split URL Testing validated for
            cross-browser rendering?"
          </div>
        )}
        {history.map((m, i) =>
          m.role === "assistant-pending" ? (
            <ChatMessage key={i} role="assistant" text={isStreaming ? answer : answer || "…"} />
          ) : (
            <ChatMessage
              key={i}
              role={m.role}
              text={m.text}
              onInspect={m.candidates?.length ? () => setInspecting(m.candidates) : undefined}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: "16px 24px", borderTop: "1px solid var(--line)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about VWO test coverage..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            fontSize: 14,
            background: "white",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: isStreaming ? "var(--cream-300)" : "var(--coral-500)",
            color: "white",
            fontWeight: 600,
            fontSize: 14,
            cursor: isStreaming ? "default" : "pointer",
          }}
        >
          {isStreaming ? "Thinking…" : "Ask"}
        </button>
      </form>

      {inspecting && <ChunkInspector candidates={inspecting} onClose={() => setInspecting(null)} />}
    </div>
  );
}

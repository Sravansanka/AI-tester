import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ role, text, onInspect }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div
        style={{
          maxWidth: "72%",
          padding: "12px 16px",
          borderRadius: 14,
          background: isUser ? "var(--coral-500)" : "white",
          color: isUser ? "white" : "var(--ink-900)",
          border: isUser ? "none" : "1px solid var(--line)",
          boxShadow: "var(--shadow-sm)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {isUser ? (
          text
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || "…"}</ReactMarkdown>
        )}
        {!isUser && onInspect && (
          <button
            onClick={onInspect}
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--coral-600)",
              background: "transparent",
              border: "1px solid var(--coral-400)",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Inspect retrieved chunks
          </button>
        )}
      </div>
    </div>
  );
}

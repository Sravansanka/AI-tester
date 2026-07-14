export default function ChunkInspector({ candidates, onClose }) {
  if (!candidates) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 420,
        height: "100vh",
        background: "var(--cream-50)",
        borderLeft: "1px solid var(--line)",
        boxShadow: "var(--shadow-md)",
        overflowY: "auto",
        padding: 20,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Retrieved & Reranked Test Cases</h3>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 16,
            cursor: "pointer",
            color: "var(--ink-500)",
          }}
        >
          ✕
        </button>
      </div>
      {candidates.map((c) => (
        <div
          key={c.key}
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: 12,
            marginBottom: 10,
            background: "white",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--coral-600)" }}>{c.key}</span>
            <span style={{ fontSize: 11, color: "var(--ink-500)" }}>score {c.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

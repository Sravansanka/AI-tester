const STAGE_LABELS = {
  rewrite: "Query Rewrite",
  embed: "Hybrid Embed (BGE-M3)",
  retrieve: "Hybrid Retrieve (Qdrant)",
  rerank: "Rerank (bge-reranker-v2-m3)",
  generate: "Generate (GPT-4o)",
};

const STATUS_STYLES = {
  pending: { color: "var(--ink-500)", icon: "○", bg: "transparent" },
  running: { color: "var(--coral-600)", icon: "◐", bg: "rgba(217,115,71,0.08)" },
  done: { color: "var(--green-500)", icon: "●", bg: "transparent" },
  error: { color: "var(--red-500)", icon: "✕", bg: "rgba(193,80,59,0.08)" },
};

function DetailBody({ stage, detail }) {
  if (!detail || Object.keys(detail).length === 0) return null;

  if (stage === "rewrite" && detail.rewrites?.length) {
    return (
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {detail.rewrites.map((r, i) => (
          <li key={i} style={{ fontSize: 12, color: "var(--ink-700)" }}>
            {r}
          </li>
        ))}
      </ul>
    );
  }
  if (stage === "embed") {
    return (
      <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 4 }}>
        {detail.variants_embedded} variant(s) · {detail.dense_dim}-dim dense vectors
      </div>
    );
  }
  if ((stage === "retrieve" || stage === "rerank") && (detail.candidates || detail.reranked)) {
    const list = detail.candidates || detail.reranked;
    return (
      <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 4 }}>
        <div>{stage === "retrieve" ? detail.candidate_count : detail.top_k} candidates</div>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
          {list.slice(0, 5).map((c) => (
            <li key={c.key}>
              {c.key} <span style={{ color: "var(--ink-500)" }}>({c.score})</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (stage === "generate" && detail.citations?.length) {
    return (
      <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 4 }}>
        {detail.citations.length} citation(s)
      </div>
    );
  }
  return null;
}

export default function StageRow({ stage, status, detail }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius)",
        background: s.bg,
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: s.color, fontSize: 14, width: 14, textAlign: "center" }}>{s.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>
          {STAGE_LABELS[stage] || stage}
        </span>
      </div>
      <DetailBody stage={stage} detail={detail} />
    </div>
  );
}

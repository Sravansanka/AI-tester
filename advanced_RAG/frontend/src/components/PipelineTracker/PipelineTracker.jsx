import { STAGE_ORDER } from "../../hooks/useSSEStream.js";
import StageRow from "./StageRow.jsx";

export default function PipelineTracker({ stages, errors }) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: "var(--ink-900)" }}>
        Advanced RAG Explorer
      </h2>
      <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "0 0 18px" }}>
        Hybrid retrieval over 5,000 VWO test cases
      </p>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--ink-500)", marginBottom: 8 }}>
        PIPELINE
      </div>
      {STAGE_ORDER.map((stage) => (
        <StageRow key={stage} stage={stage} status={stages[stage].status} detail={stages[stage].detail} />
      ))}

      {errors.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            borderRadius: "var(--radius)",
            background: "rgba(193,80,59,0.08)",
            border: "1px solid rgba(193,80,59,0.25)",
          }}
        >
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--red-500)" }}>
              <strong>{e.stage}:</strong> {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

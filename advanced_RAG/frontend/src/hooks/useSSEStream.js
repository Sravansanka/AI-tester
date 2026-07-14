import { useCallback, useRef, useState } from "react";
import { streamChat } from "../api/client.js";

export const STAGE_ORDER = ["rewrite", "embed", "retrieve", "rerank", "generate"];

function initialStages() {
  return Object.fromEntries(STAGE_ORDER.map((s) => [s, { status: "pending", detail: {} }]));
}

export function useSSEStream() {
  const [stages, setStages] = useState(initialStages());
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef(null);

  const runQuery = useCallback((query, filters) => {
    controllerRef.current?.abort();

    setStages(initialStages());
    setAnswer("");
    setErrors([]);
    setIsStreaming(true);

    controllerRef.current = streamChat(query, filters, {
      onStage: ({ stage, status, detail }) => {
        setStages((prev) => ({ ...prev, [stage]: { status, detail } }));
      },
      onToken: (text) => {
        setAnswer((prev) => prev + text);
      },
      onError: ({ stage, message }) => {
        setErrors((prev) => [...prev, { stage, message }]);
        setStages((prev) =>
          prev[stage] ? { ...prev, [stage]: { ...prev[stage], status: "error" } } : prev,
        );
      },
      onDone: () => {
        setIsStreaming(false);
      },
    });
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { stages, answer, errors, isStreaming, runQuery, cancel };
}

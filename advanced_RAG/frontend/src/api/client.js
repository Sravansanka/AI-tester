import { fetchEventSource } from "@microsoft/fetch-event-source";

const API_BASE = "";

export async function getHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function getCollectionStats() {
  const res = await fetch(`${API_BASE}/api/collection/stats`);
  return res.json();
}

/**
 * Streams a chat query via SSE (POST body, so native EventSource won't work).
 * callbacks: { onStage, onToken, onDone, onError }
 * Returns an AbortController the caller can use to cancel the stream.
 */
export function streamChat(query, filters, callbacks) {
  const controller = new AbortController();

  fetchEventSource(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters }),
    signal: controller.signal,
    async onopen(response) {
      if (!response.ok) {
        throw new Error(`Chat stream failed to open: ${response.status}`);
      }
    },
    onmessage(msg) {
      const data = msg.data ? JSON.parse(msg.data) : {};
      if (msg.event === "stage") callbacks.onStage?.(data);
      else if (msg.event === "token") callbacks.onToken?.(data.text);
      else if (msg.event === "error") callbacks.onError?.(data);
      else if (msg.event === "done") callbacks.onDone?.();
    },
    onerror(err) {
      callbacks.onError?.({ stage: "connection", message: String(err) });
      throw err; // stop retrying — this is a one-shot query stream
    },
  });

  return controller;
}

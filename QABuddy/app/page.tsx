"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ---- Types ---------------------------------------------------------------- */

interface Citation {
  n: number;
  source_type: string;
  label: string;
  ref: string;
  path: string;
  rerank: number;
  snippet: string;
}

interface BotMsg {
  id: string;
  role: "assistant";
  thinking: boolean;
  content: string;
  mode?: string;
  citations: Citation[];
  elapsed?: string;
  error?: string;
  no_answer?: boolean;
}
interface UserMsg { id: string; role: "user"; content: string; }
type Message = UserMsg | BotMsg;

interface Stats { total_chunks: number; by_source: Record<string, number>; }

/* ---- Constants ------------------------------------------------------------ */

const SOURCES = [
  { st: "selenium",    label: "Selenium repo" },
  { st: "playwright",  label: "Playwright repo" },
  { st: "test_cases",  label: "Test Cases" },
  { st: "jira",        label: "JIRA tickets" },
  { st: "docs",        label: "Company Docs" },
  { st: "transcripts", label: "Meeting Notes" },
  { st: "prd",         label: "PRD / BRD / SRS" },
  { st: "jenkins",     label: "Jenkins Logs" },
  { st: "glossary",    label: "Glossary" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  selenium: "Selenium", playwright: "Playwright", test_cases: "Test Cases",
  jira: "JIRA", docs: "Docs", transcripts: "Meeting", prd: "PRD", jenkins: "Jenkins", glossary: "Glossary",
};

const SUGGESTIONS = [
  "Why is the checkout coupon test flaky?",
  "What failed in Jenkins build 4521?",
  "Generate test cases for the login module",
  "What is our flaky test quarantine policy?",
];

/* ---- Markdown renderer ---------------------------------------------------- */

function md(raw: string): string {
  let t = raw
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, (_: string, c: string) => `<pre><code>${c}</code></pre>`);
  t = t.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  t = t.replace(/^### (.*)$/gm, "<h3>$1</h3>")
       .replace(/^## (.*)$/gm,  "<h2>$1</h2>")
       .replace(/^# (.*)$/gm,   "<h1>$1</h1>");
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  t = t.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  t = t.replace(/\[(\d{1,2})\]/g, '<span class="cite-ref" data-n="$1">[$1]</span>');
  t = t.split(/\n{2,}/)
       .map((p: string) => /^<(h\d|ul|pre|li)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g,"<br>")}</p>`)
       .join("");
  return t;
}

/* ---- Citation card -------------------------------------------------------- */

function CitationCard({ c, msgId, onOpen }: { c: Citation; msgId: string; onOpen: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`cite${open ? " open" : ""}`}
      data-st={c.source_type}
      data-n={String(c.n)}
      onClick={() => { setOpen(v => !v); onOpen(c.n); }}
      style={{ animationDelay: `${(c.n - 1) * 60}ms` }}
    >
      <div className="cite-top">
        <span className="cite-n">[{c.n}]</span>
        <span className={`kb-swatch st-${c.source_type}`} />
        <span className="cite-label">{SOURCE_LABELS[c.source_type] ?? c.source_type}</span>
        <span className="cite-path">{c.ref}</span>
        <span className="cite-score">{c.rerank.toFixed(2)}</span>
      </div>
      {open && <div className="cite-snippet">{c.snippet}</div>}
    </div>
  );
}

/* ---- Bot message ---------------------------------------------------------- */

function BotMessage({ msg }: { msg: BotMsg }) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const citesRef  = useRef<Map<number, HTMLElement>>(new Map());

  const highlightCite = useCallback((n: number) => {
    const card = citesRef.current.get(n);
    if (!card) return;
    card.classList.add("flash");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => card.classList.remove("flash"), 1200);
  }, []);

  useEffect(() => {
    if (!bubbleRef.current) return;
    bubbleRef.current.querySelectorAll<HTMLElement>(".cite-ref").forEach(el => {
      el.onclick = () => highlightCite(Number(el.dataset.n));
    });
  });

  return (
    <div className="msg msg-bot">
      <div className="msg-head">
        <span>qabuddy</span>
        {msg.mode && <span className="mode-badge">{msg.mode}</span>}
        {msg.elapsed && <span className="head-time">{msg.elapsed}s</span>}
      </div>

      {msg.thinking ? (
        <div className="bubble thinking">retrieving from knowledge base…</div>
      ) : msg.error ? (
        <div className="bubble"><div className="err">✖ {msg.error}</div></div>
      ) : (
        <div className="bubble" ref={bubbleRef}>
          <div
            className={`answer${msg.no_answer ? " no-answer" : ""}`}
            dangerouslySetInnerHTML={{ __html: md(msg.content) }}
          />
          {msg.elapsed && (
            <div className="answer-foot">
              {msg.no_answer ? "below confidence threshold · " : ""}{msg.elapsed}s
            </div>
          )}
        </div>
      )}

      {msg.citations.length > 0 && (
        <div className="cites">
          <div className="cites-head">sources</div>
          {msg.citations.map(c => (
            <CitationCard
              key={c.n}
              c={c}
              msgId={msg.id}
              onOpen={highlightCite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Main page ------------------------------------------------------------ */

export default function Home() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [busy,      setBusy]      = useState(false);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [healthOk,  setHealthOk]  = useState<boolean | null>(null);
  const [keySet,    setKeySet]    = useState(false);
  const [selSrc,    setSelSrc]    = useState<Set<string>>(new Set(SOURCES.map(s => s.st)));
  const [mode,      setMode]      = useState("");
  const [ingestOpen,setIngestOpen]= useState(false);
  const [status,    setStatus]    = useState("boot");

  const threadRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Array<{role: string; content: string}>>([]);

  const scrollDown = () => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; };
  const autoGrow   = () => {
    const el = inputRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const refreshStats = useCallback(async () => {
    try { const s = await (await fetch("/api/stats")).json(); setStats(s); } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const h = await (await fetch("/api/health")).json();
        setHealthOk(h.status === "ok");
        setKeySet(h.openai_key_set);
        setStatus(h.openai_key_set ? "online" : "online · OPENAI KEY MISSING");
      } catch { setHealthOk(false); setStatus("server unreachable"); }
    })();
    refreshStats();
    const t = setInterval(refreshStats, 30_000);
    return () => clearInterval(t);
  }, [refreshStats]);

  const toggleSrc = (st: string) =>
    setSelSrc(prev => { const n = new Set(prev); n.has(st) ? n.delete(st) : n.add(st); return n; });

  /* ---- send ---------------------------------------------------------------- */
  const send = async (override?: string) => {
    const q = (override ?? input).trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setMessages(prev => [...prev, { id: String(Date.now()), role: "user", content: q }]);

    const botId = String(Date.now() + 1);
    setMessages(prev => [...prev, { id: botId, role: "assistant", thinking: true, content: "", citations: [] }]);
    setStatus("retrieving");
    setTimeout(scrollDown, 50);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          sources:  Array.from(selSrc),
          mode:     mode || null,
          history:  historyRef.current.slice(-6),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `HTTP ${res.status}`); }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "", fullAnswer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
          if (!frame.startsWith("data:")) continue;
          const ev = JSON.parse(frame.slice(5));

          if (ev.type === "meta") {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, mode: ev.mode } : m));
            setStatus(`mode ${ev.mode} · searching`);
          } else if (ev.type === "citations") {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, citations: ev.items ?? [] } : m));
            setStatus("generating");
          } else if (ev.type === "token") {
            fullAnswer += ev.text;
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, thinking: false, content: fullAnswer } : m));
            scrollDown();
          } else if (ev.type === "done") {
            setMessages(prev => prev.map(m => m.id === botId
              ? { ...m, thinking: false, content: ev.answer, elapsed: String(ev.elapsed), no_answer: ev.no_answer }
              : m));
            historyRef.current = [...historyRef.current,
              { role: "user", content: q },
              { role: "assistant", content: (ev.answer ?? "").slice(0, 800) }];
            setStatus("online"); refreshStats();
          } else if (ev.type === "error") {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, thinking: false, error: ev.message } : m));
            setStatus("error");
          }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, thinking: false, error: String(e) } : m));
      setStatus("error");
    } finally { setBusy(false); scrollDown(); inputRef.current?.focus(); }
  };

  /* ---- render -------------------------------------------------------------- */
  const showHero = messages.length === 0;

  return (
    <div className="shell">

      {/* ---- Left rail ---------------------------------------------------- */}
      <aside className="rail">
        <div className="brand">
          <div
            className={`brand-dot${healthOk === true ? " ok" : healthOk === false ? " bad" : ""}`}
            title={keySet ? "online" : "OPENAI KEY MISSING"}
          />
          <div>
            <div className="brand-name">QA Buddy</div>
            <div className="brand-sub">qa knowledge system</div>
          </div>
        </div>

        <section className="rail-block">
          <h3>knowledge base</h3>
          <ul className="kb-list">
            {SOURCES.map(s => (
              <li key={s.st}>
                <label className="kb-row">
                  <input
                    type="checkbox"
                    checked={selSrc.has(s.st)}
                    onChange={() => toggleSrc(s.st)}
                  />
                  <span className={`kb-swatch st-${s.st}`} />
                  <span className="kb-label">{s.label}</span>
                  <span className="kb-count">{stats?.by_source[s.st] ?? "–"}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="kb-total">total chunks <b>{stats?.total_chunks ?? "–"}</b></div>
          <div className="kb-actions">
            <button className="ghost" onClick={() => setSelSrc(new Set(SOURCES.map(s => s.st)))}>all</button>
            <button className="ghost" onClick={() => setSelSrc(new Set())}>none</button>
          </div>
        </section>

        <section className="rail-block">
          <h3>mode</h3>
          <select className="mode-select" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="">auto-detect</option>
            <option value="answer">answer</option>
            <option value="generate">generate test cases</option>
            <option value="review">review coverage / gaps</option>
            <option value="rca">root cause analysis</option>
          </select>
        </section>

        <section className="rail-block">
          <h3>
            ingest{" "}
            <button className="ghost tiny" onClick={() => setIngestOpen(v => !v)}>
              {ingestOpen ? "close" : "open"}
            </button>
          </h3>
          {ingestOpen && (
            <p className="ingest-note">
              Drop files into data/ folders and run<br />
              <code style={{ fontSize: 10 }}>python -m app.ingestion.cli ingest --all</code><br />
              on the local server. Vercel uses the<br />
              pre-loaded BM25 knowledge base.
            </p>
          )}
        </section>

        <div className="rail-foot">
          <div>llm <span className="mono">gpt-4o-mini</span></div>
          <div>search <span className="mono">BM25 hybrid</span></div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <a href="/architecture.html" target="_blank"
               style={{ color: "var(--accent)", textDecoration: "none", fontSize: 10 }}>architecture</a>
            <a href="/docs.html" target="_blank"
               style={{ color: "var(--accent)", textDecoration: "none", fontSize: 10 }}>docs</a>
          </div>
        </div>
      </aside>

      {/* ---- Main stage --------------------------------------------------- */}
      <main className="stage">
        <header className="topbar">
          <span>ask → hybrid search → rerank → cited answer</span>
          <span className="topbar-right">
            {status}<span className="caret">▌</span>
          </span>
        </header>

        <div className="thread" ref={threadRef}>
          {showHero && (
            <div className="hello">
              <div className="hello-mark">✳</div>
              <h1>QA Buddy</h1>
              <p className="hello-sub">
                One question, one <b>cited</b> answer, grounded in your team&apos;s real QA knowledge:
                the Selenium &amp; Playwright frameworks, {String.fromCharCode(126)}5,000 test cases, JIRA history,
                PRDs, meeting notes, and Jenkins logs.
              </p>

              <div className="how">
                <div className="how-title">How your answer is fetched</div>
                <div className="how-grid">
                  <div className="how-step">
                    <span className="how-n">1</span>
                    <div>
                      <b>Understand</b>
                      <span>your question is condensed and rewritten into search variants</span>
                    </div>
                  </div>
                  <div className="how-step">
                    <span className="how-n">2</span>
                    <div>
                      <b>Hybrid search</b>
                      <span>meaning (dense) + exact keywords (ids, exceptions, method names) across selected sources</span>
                    </div>
                  </div>
                  <div className="how-step">
                    <span className="how-n">3</span>
                    <div>
                      <b>Fuse &amp; rerank</b>
                      <span>both result lists merge (RRF), a cross-encoder keeps the 6 most relevant chunks</span>
                    </div>
                  </div>
                  <div className="how-step">
                    <span className="how-n">4</span>
                    <div>
                      <b>Cited answer</b>
                      <span>GPT-4o-mini answers only from those chunks, citing [n] → file:line, ticket, or build</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="sug" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m =>
            m.role === "user" ? (
              <div key={m.id} className="msg msg-user">
                <div className="bubble">{m.content}</div>
              </div>
            ) : (
              <BotMessage key={m.id} msg={m} />
            )
          )}
        </div>

        <footer className="composer">
          <div className="composer-box">
            <textarea
              ref={inputRef}
              className="composer-textarea"
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); autoGrow(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="ask about tests, tickets, failures, the framework..."
              autoFocus
            />
            <button
              className="send"
              disabled={busy || !input.trim()}
              onClick={() => send()}
              aria-label="send"
            >
              ↑
            </button>
          </div>
          <div className="composer-hint">
            enter to send · shift+enter for newline · answers always cite their sources
          </div>
        </footer>
      </main>
    </div>
  );
}

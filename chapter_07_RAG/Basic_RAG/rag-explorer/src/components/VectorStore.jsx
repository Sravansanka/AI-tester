import { useEffect, useRef, useState } from 'react'
import * as api from '../lib/api.js'

// Draws a 768-dim vector as a 1-D diverging heatmap: blue = negative,
// near-black = ~0, amber/red = positive. Each dimension is one column.
function VectorHeatmap({ vector }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !vector?.length) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const maxAbs = vector.reduce((m, x) => Math.max(m, Math.abs(x)), 1e-6)
    const colW = w / vector.length
    for (let i = 0; i < vector.length; i++) {
      const t = vector[i] / maxAbs // -1..1
      let r, g, b
      if (t >= 0) { r = 20 + 235 * t; g = 100 + 60 * t; b = 20 } // dark -> amber/red
      else { r = 20; g = 60 + 40 * -t; b = 60 + 195 * -t }       // dark -> blue
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
      ctx.fillRect(i * colW, 0, Math.max(colW, 0.6), h)
    }
  }, [vector])
  return <canvas ref={ref} className="heatmap" />
}

export default function VectorStore({ active }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState({})

  const load = () => {
    setLoading(true); setError('')
    api.getEmbeddings().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  // (re)load whenever this tab becomes visible
  useEffect(() => { if (active) load() }, [active])

  if (!active) return null

  return (
    <section className="panel vecstore">
      <div className="panel-head">
        <h2>Vector Store · how ChromaDB holds each chunk</h2>
        <button className="btn ghost" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      {error && <div className="alert err">{error}</div>}

      {data && data.count === 0 && (
        <p className="muted">Nothing stored yet. Go to <strong>Explorer</strong> and click <strong>Ingest PDF</strong> first.</p>
      )}

      {data && data.count > 0 && (
        <>
          <div className="vs-meta">
            <span>collection <code>{data.collection}</code></span>
            <span>{data.count} vectors</span>
            <span>{data.dims} dims each</span>
            <span>distance <code>{data.distance}</code></span>
            <span>model <code>{data.embedModel}</code></span>
          </div>
          <p className="muted small vs-explain">
            Each chunk is stored as an <strong>id → {data.dims}-dimensional vector</strong> (+ the original
            text and metadata). Similarity search compares the query vector against every row below using
            cosine distance. The strip visualizes one row's {data.dims} numbers; blue = negative, amber = positive.
          </p>

          <div className="legend">
            <span className="legend-neg" /> negative
            <span className="legend-zero" /> ~0
            <span className="legend-pos" /> positive
          </div>

          <div className="vs-list">
            {data.items.map((it) => {
              const open = expanded[it.id]
              return (
                <div className="vs-row" key={it.id}>
                  <div className="vs-row-head">
                    <span className="vs-id">{it.id}</span>
                    <span className="chunk-meta">
                      {it.metadata.file ? `${it.metadata.file} · ` : ''}chunk {it.metadata.index ?? '?'}
                      {it.metadata.charStart != null ? ` · chars ${it.metadata.charStart}–${it.metadata.charEnd}` : ''}
                    </span>
                    <span className="vs-stats">
                      dims {it.dims} · ‖v‖ {it.stats.norm.toFixed(3)} · min {it.stats.min.toFixed(3)} · max {it.stats.max.toFixed(3)}
                    </span>
                  </div>

                  <VectorHeatmap vector={it.vector} />

                  <p className="vs-preview">{it.preview}…</p>

                  <button className="link" onClick={() => setExpanded((e) => ({ ...e, [it.id]: !open }))}>
                    {open ? 'Hide' : 'Show'} raw vector values
                  </button>
                  {open && (
                    <pre className="vs-raw">
[{it.vector.slice(0, 24).map((n) => n.toFixed(5)).join(', ')}, … {it.dims - 24} more]
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

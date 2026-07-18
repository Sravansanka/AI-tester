const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

let STATE = { columns: [], page: 1 };

function showAlert(msg) { const a = $('#alert'); a.textContent = msg; a.hidden = !msg; }
function setStage(listId, key, cls) {
  const li = $(`#${listId} li[data-s="${key}"]`); if (li) li.className = cls;
}
function resetStages(listId) { $$(`#${listId} li`).forEach(li => li.className = ''); }

// ---- tabs ----
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('on')); t.classList.add('on');
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === t.dataset.tab));
  if (t.dataset.tab === 'chunks') loadChunks(1);
});

// ---- status ----
async function refreshStatus() {
  try {
    const s = await (await fetch('/status')).json();
    $('#collCount').textContent = (s.collection.points || 0) + ' pts';
    if (!s.llm_key) showAlert('GROQ_API_KEY missing — add it to .env for rewrite + generation.');
  } catch (e) { /* ignore */ }
}

// ---- upload ----
async function doUpload(useBundled) {
  showAlert('');
  const fd = new FormData();
  if (!useBundled) {
    const f = $('#fileInput').files[0];
    if (!f) { showAlert('Pick a file, or click "Use bundled 5,000".'); return; }
    fd.append('file', f);
  }
  const r = await fetch('/upload', { method: 'POST', body: fd });
  const d = await r.json();
  if (!r.ok) { showAlert(d.error || 'Upload failed'); return; }
  STATE.columns = d.columns;
  renderPreview(d);
  $('#ingestBtn').disabled = false;
}

function renderPreview(d) {
  const cols = d.columns;
  const textDefault = ['Summary', 'Description', 'Preconditions', 'Steps', 'Expected Result'];
  const metaDefault = ['Issue Key', 'Priority', 'Component', 'Test Type', 'Status'];
  const pick = (name, arr, def) => `<div class="section-title">${name}</div><div class="chips">` +
    arr.map(c => `<label class="chip"><input type="checkbox" data-grp="${name}" value="${esc(c)}" ${def.includes(c) ? 'checked' : ''}> ${esc(c)}</label>`).join('') + `</div>`;
  const rows = d.head.map(row => `<tr>${cols.map(c => `<td>${esc(row[c]).slice(0, 60)}</td>`).join('')}</tr>`).join('');
  $('#preview').innerHTML = '';
  $('#preview').append(el(`<div class="card">
    <h2>${esc(d.file)}</h2>
    <div class="stat-row">
      <div class="stat"><b>${d.rows}</b><span>rows</span></div>
      <div class="stat"><b>${cols.length}</b><span>columns</span></div>
    </div>
    <div style="overflow-x:auto"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    ${pick('text', cols, textDefault)}
    ${pick('meta', cols, metaDefault)}
    <p class="muted" style="margin-top:12px">Text columns get embedded; meta columns are stored for filtering. Switch to the <b>Ingest</b> tab to build the index.</p>
  </div>`));
}
function selectedCols(grp) { return $$(`#preview input[data-grp="${grp}"]:checked`).map(i => i.value); }

$('#uploadBtn').onclick = () => doUpload(false);
$('#useBundled').onclick = () => doUpload(true);

// ---- ingest (SSE) ----
$('#ingestBtn').onclick = () => {
  showAlert(''); resetStages('ingestStages'); $('#ingestCards').innerHTML = '';
  const text = selectedCols('text'), meta = selectedCols('meta');
  const limit = $('#ingestLimit').value;
  const qs = new URLSearchParams({ text_cols: text.join(','), meta_cols: meta.join(',') });
  if (limit) qs.set('limit', limit);
  $('#ingestBtn').disabled = true;
  const es = new EventSource('/ingest?' + qs.toString());
  const cards = $('#ingestCards');
  const card = (id, html) => { let c = $('#' + id); if (!c) { c = el(`<div class="card" id="${id}">${html}</div>`); cards.append(c); } else c.innerHTML = html; return c; };

  es.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.stage === 'error') { showAlert(d.message); es.close(); $('#ingestBtn').disabled = false; return; }
    if (d.stage === 'done') {
      setStage('ingestStages', 'index', 'done');
      card('c-done', `<h2>Indexed</h2><p class="muted">Collection <code>${esc(d.collection.collection)}</code> now holds <b>${d.collection.points}</b> points. Open the <b>Chunks</b> tab to browse, or <b>Chat</b> to query.</p>`);
      es.close(); $('#ingestBtn').disabled = false; refreshStatus(); return;
    }
    const active = { read: 'read', build: 'build', chunk: 'chunk', embed: 'embed', index: 'index' }[d.stage];
    if (active) {
      ['read', 'build', 'chunk', 'embed', 'index'].forEach(s => {
        const order = ['read', 'build', 'chunk', 'embed', 'index'];
        if (order.indexOf(s) < order.indexOf(active)) setStage('ingestStages', s, 'done');
      });
      setStage('ingestStages', active, 'active');
    }
    if (d.stage === 'read' && d.status === 'done')
      card('c-read', `<h2>Read</h2><div class="stat-row"><div class="stat"><b>${d.rows}</b><span>rows</span></div><div class="stat"><b>${d.columns.length}</b><span>cols</span></div></div><p class="muted">text: ${d.text_cols.map(esc).join(', ')}<br>meta: ${d.meta_cols.map(esc).join(', ')}</p>`);
    if (d.stage === 'chunk' && d.status === 'done') {
      const mx = Math.max(...d.histogram, 1);
      card('c-chunk', `<h2>Chunk</h2>
        <div class="stat-row"><div class="stat"><b>${d.total}</b><span>chunks</span></div><div class="stat"><b>${d.avg}</b><span>avg chars</span></div><div class="stat"><b>${d.min}</b><span>min</span></div><div class="stat"><b>${d.max}</b><span>max</span></div></div>
        <div class="hist">${d.histogram.map(h => `<div style="height:${Math.round(h / mx * 100)}%" title="${h}"></div>`).join('')}</div>
        ${d.samples.map((s, i) => `<div class="chunk"><div class="h"><b>sample ${i + 1}</b></div><div class="t">${esc(s)}...</div></div>`).join('')}`);
    }
    if (d.stage === 'embed' && d.status === 'progress') {
      const pct = Math.round(d.done / d.total * 100);
      const pv = d.preview || {};
      card('c-embed', `<h2>Embed - bge-m3 (dense + sparse)</h2>
        <div class="bar"><div style="width:${pct}%"></div></div><p class="muted">${d.done}/${d.total} chunks embedded (${pct}%)</p>
        ${pv.dense_preview ? `<div class="section-title">dense vector (first 8 of ${pv.dense_dim})</div><div class="vecline">[${pv.dense_preview.join(', ')}, ...]</div>` : ''}
        ${pv.sparse_top ? `<div class="section-title">sparse - top tokens by weight</div><div>${pv.sparse_top.map(t => `<span class="tok">${esc(t.token)} ${t.weight}</span>`).join('')}</div>` : ''}`);
    }
    if (d.stage === 'index' && d.status === 'progress') {
      const pct = Math.round(d.done / d.total * 100);
      card('c-index', `<h2>Index - Qdrant</h2><div class="bar"><div style="width:${pct}%"></div></div><p class="muted">${d.done}/${d.total} points upserted into <code>vwo_test_cases</code></p>`);
    }
  };
  es.onerror = () => { es.close(); $('#ingestBtn').disabled = false; };
};

// ---- chunks ----
async function loadChunks(page) {
  STATE.page = page || STATE.page;
  const qs = new URLSearchParams({ page: STATE.page });
  if ($('#chunkQ').value) qs.set('q', $('#chunkQ').value);
  if ($('#fPriority').value) qs.set('priority', $('#fPriority').value);
  if ($('#fModule').value) qs.set('module', $('#fModule').value);
  if ($('#fJira').value) qs.set('jira_id', $('#fJira').value);
  const d = await (await fetch('/chunks?' + qs)).json();
  if (d.error) { showAlert(d.error); return; }
  $('#pageInfo').textContent = `page ${d.page} - ${d.count} in collection`;
  const used = new Set(d.last_chat_ids || []);
  $('#chunkList').innerHTML = d.chunks.map(c => {
    const p = c.payload || {};
    return `<div class="chunk ${used.has(c.id) ? 'used' : ''}"><div class="h"><b>#${c.id}</b>
      ${['Issue Key', 'Component', 'Test Type', 'Priority', 'Status'].filter(k => p[k]).map(k => `${esc(p[k])}`).join(' · ')}</div>
      <div class="t">${esc(p.text || '')}</div></div>`;
  }).join('') || '<p class="muted">No chunks. Ingest first.</p>';
}
$('#chunkSearch').onclick = () => loadChunks(1);
$('#prevPage').onclick = () => { if (STATE.page > 1) loadChunks(STATE.page - 1); };
$('#nextPage').onclick = () => loadChunks(STATE.page + 1);

// ---- chat ----
const SAMPLES = ['Which modules have the most security test cases?', 'How is traffic allocation tested in A/B Testing?', 'Create a test case for VWO-3400 heatmap privacy masking'];
$('#chatChips').innerHTML = SAMPLES.map(s => `<span class="chip">${esc(s)}</span>`).join('');
$$('#chatChips .chip').forEach(c => c.onclick = () => { $('#chatInput').value = c.textContent; sendChat(); });
$('#chatBtn').onclick = sendChat;

async function sendChat() {
  const q = $('#chatInput').value.trim(); if (!q) return;
  showAlert(''); resetStages('chatStages'); $('#chatResult').innerHTML = '<p class="muted">Thinking - rewriting, hybrid search, rerank, generate...</p>';
  ['rewrite', 'dense', 'sparse', 'rrf', 'rerank', 'answer'].forEach((s, i) => setTimeout(() => setStage('chatStages', s, 'active'), i * 120));
  $('#chatBtn').disabled = true;
  try {
    const d = await (await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })).json();
    if (d.error) { showAlert(d.error); $('#chatResult').innerHTML = ''; return; }
    ['rewrite', 'dense', 'sparse', 'rrf', 'rerank', 'answer'].forEach(s => setStage('chatStages', s, 'done'));
    renderChat(d);
  } catch (e) { showAlert(String(e)); }
  finally { $('#chatBtn').disabled = false; }
}

function hitTable(hits, cols) {
  return `<table><thead><tr><th>id</th>${cols.map(c => `<th>${c}</th>`).join('')}<th>meta</th></tr></thead><tbody>` +
    hits.map(h => `<tr><td>${h.id}</td>${cols.map(c => `<td>${h[c] != null ? (+h[c]).toFixed(4) : '-'}</td>`).join('')}<td>${esc(Object.values(h.meta || {}).join(' · '))}</td></tr>`).join('') + '</tbody></table>';
}

function renderChat(d) {
  const r = $('#chatResult'); r.innerHTML = '';
  r.append(el(`<div class="card"><div class="h" style="display:flex;justify-content:space-between"><h2 style="margin:0">Answer <span class="muted" style="font-size:12px">(${esc(d.mode)} · ${d.elapsed}s)</span></h2></div>
    <div class="answer">${esc(d.answer)}</div></div>`));
  r.append(el(`<div class="card"><div class="section-title">1 · query rewrites</div>
    <div class="chips">${d.rewrites.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    <div class="section-title">2 · dense top-${d.dense.length} (bge-m3 dense)</div>${hitTable(d.dense.slice(0, 8), ['score'])}
    <div class="section-title">3 · sparse top-${d.sparse.length} (bge-m3 lexical)</div>${hitTable(d.sparse.slice(0, 8), ['score'])}
    <div class="section-title">4 · RRF fused</div>${hitTable(d.fused.slice(0, 8), ['rrf'])}
    <div class="section-title">5 · re-ranked (bge-reranker-v2-m3) -> sent to LLM</div>${hitTable(d.reranked, ['rrf', 'rerank'])}</div>`));
}

refreshStatus();
setInterval(refreshStatus, 15000);

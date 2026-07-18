import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { listPdfs, extractPdf, extractPdfBuffer } from './lib/pdf.js'
import { chunkText } from './lib/chunk.js'
import { embedTexts, embedInfo } from './lib/embed.js'
import { getCollection, resetCollection, storeChunks, retrieve, countChunks, pingChroma } from './lib/chroma.js'
import { generateAnswer, groqInfo } from './lib/groq.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || '../data')
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE || 1200)
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP || 200)
const TOP_K = Number(process.env.TOP_K || 4)
const PORT = Number(process.env.PORT || 8787)

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Remembers the last ingestion so the UI can render the pipeline state.
let lastIngest = null

const wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error(err)
  res.status(500).json({ error: err.message || String(err) })
})

// Shared pipeline: sources[{ file, text, numPages }] -> chunk -> embed -> store.
async function runIngest(sources) {
  const collection = await resetCollection() // fresh store each ingest
  const files = []
  let allChunks = []

  for (const s of sources) {
    const chunks = chunkText(s.text, { size: CHUNK_SIZE, overlap: CHUNK_OVERLAP })
    chunks.forEach((c) => { c.file = s.file })
    files.push({ file: s.file, numPages: s.numPages || 0, chars: s.text.length, numChunks: chunks.length })
    allChunks = allChunks.concat(chunks)
  }
  if (!allChunks.length) throw new Error('No text extracted from the document.')

  const embeddings = await embedTexts(allChunks.map((c) => c.text))
  const dims = embeddings[0]?.length || 0

  await storeChunks(collection, {
    ids: allChunks.map((c, i) => `chunk_${i}`),
    documents: allChunks.map((c) => c.text),
    embeddings,
    metadatas: allChunks.map((c) => ({
      file: c.file, index: c.index, charStart: c.charStart, charEnd: c.charEnd, length: c.length,
    })),
  })

  lastIngest = {
    at: null,
    files,
    totalChunks: allChunks.length,
    embedDims: dims,
    embedModel: embedInfo.model,
    sampleChunks: allChunks.slice(0, 3).map((c) => ({
      index: c.index, file: c.file, length: c.length, preview: c.text.slice(0, 320),
    })),
    sampleVector: (embeddings[0] || []).slice(0, 8),
  }
  return lastIngest
}

// --- Status: what's wired up, what's ingested -------------------------------
app.get('/api/status', wrap(async (req, res) => {
  const chromaUp = await pingChroma()
  let stored = 0
  if (chromaUp) {
    const col = await getCollection()
    stored = await countChunks(col)
  }
  res.json({
    dataDir: DATA_DIR,
    pdfs: listPdfs(DATA_DIR).map((p) => p.file),
    embed: embedInfo,
    llm: groqInfo,
    groqKeySet: Boolean(process.env.GROQ_API_KEY),
    chroma: { url: process.env.CHROMA_URL || 'http://localhost:8000', up: chromaUp, stored },
    config: { chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP, topK: TOP_K },
    lastIngest,
  })
}))

// --- Ingest from the data folder --------------------------------------------
app.post('/api/ingest', wrap(async (req, res) => {
  const pdfs = listPdfs(DATA_DIR)
  if (!pdfs.length) return res.status(400).json({ error: `No PDFs found in ${DATA_DIR}` })

  const sources = []
  for (const pdf of pdfs) {
    const { text, numPages } = await extractPdf(pdf.path)
    sources.push({ file: pdf.file, text, numPages })
  }
  res.json(await runIngest(sources))
}))

// --- Ingest an uploaded PDF / .txt / .md ------------------------------------
app.post('/api/ingest-upload', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' })
  const { originalname, mimetype, buffer } = req.file
  const name = originalname.toLowerCase()

  let text = ''
  let numPages = 0
  if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const r = await extractPdfBuffer(buffer)
    text = r.text; numPages = r.numPages
  } else if (name.endsWith('.txt') || name.endsWith('.md') || (mimetype || '').startsWith('text/')) {
    text = buffer.toString('utf8')
  } else {
    return res.status(400).json({ error: `Unsupported file: ${originalname}. Upload a PDF, .txt, or .md.` })
  }
  if (!text.trim()) return res.status(400).json({ error: 'No extractable text found in that file.' })

  res.json(await runIngest([{ file: originalname, text, numPages }]))
}))

// --- Embeddings: show exactly what ChromaDB stored per chunk ----------------
app.get('/api/embeddings', wrap(async (req, res) => {
  const collection = await getCollection()
  const stored = await countChunks(collection)
  if (!stored) return res.json({ collection: process.env.CHROMA_COLLECTION || 'vwo_prd', count: 0, dims: 0, items: [] })

  // Pull every record back out of the vector DB *including* the raw vectors.
  const data = await collection.get({ include: ['embeddings', 'documents', 'metadatas'] })
  const ids = data.ids || []
  const embs = data.embeddings || []
  const docs = data.documents || []
  const metas = data.metadatas || []

  const items = ids.map((id, i) => {
    const v = embs[i] || []
    let min = Infinity, max = -Infinity, sumSq = 0
    for (const x of v) { if (x < min) min = x; if (x > max) max = x; sumSq += x * x }
    return {
      id,
      metadata: metas[i] || {},
      preview: (docs[i] || '').slice(0, 220),
      dims: v.length,
      vector: v, // full vector — the UI draws a heatmap + shows a raw slice
      stats: {
        min: v.length ? min : 0,
        max: v.length ? max : 0,
        norm: Math.sqrt(sumSq), // L2 magnitude of the stored vector
      },
    }
  })

  // keep them in chunk order for a readable table
  items.sort((a, b) => (a.metadata.index ?? 0) - (b.metadata.index ?? 0))

  res.json({
    collection: process.env.CHROMA_COLLECTION || 'vwo_prd',
    distance: 'cosine',
    embedModel: embedInfo.model,
    count: items.length,
    dims: items[0]?.dims || 0,
    items,
  })
}))

// --- Query: embed -> retrieve top-k -> Groq answer --------------------------
app.post('/api/query', wrap(async (req, res) => {
  const question = (req.body?.question || '').trim()
  if (!question) return res.status(400).json({ error: 'question is required' })

  const collection = await getCollection()
  const stored = await countChunks(collection)
  if (!stored) return res.status(400).json({ error: 'Nothing ingested yet. Click "Ingest PDF" first.' })

  const { results, queryEmbedding } = await retrieve(collection, question, TOP_K)
  const { answer, prompt, model, usage } = await generateAnswer(question, results)

  res.json({
    question,
    retrieved: results,
    answer,
    prompt,
    model,
    usage,
    queryVectorPreview: queryEmbedding.slice(0, 8),
    topK: TOP_K,
  })
}))

// --- Reset the vector store -------------------------------------------------
app.post('/api/reset', wrap(async (req, res) => {
  await resetCollection()
  lastIngest = null
  res.json({ ok: true })
}))

// Turn multer / body errors into clean JSON instead of HTML stack traces.
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || String(err) })
  next()
})

app.listen(PORT, () => {
  console.log(`RAG Explorer API on http://localhost:${PORT}`)
  console.log(`  data dir : ${DATA_DIR}`)
  console.log(`  embed    : ${embedInfo.model} (ollama)`)
  console.log(`  llm      : ${groqInfo.model} (groq)  key ${process.env.GROQ_API_KEY ? 'set' : 'MISSING'}`)
})

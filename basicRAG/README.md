# Basic RAG (Retrieval-Augmented Generation)

An end-to-end **Retrieval-Augmented Generation (RAG)** demonstration project that showcases how to build an intelligent document querying system using modern AI technologies.

## 📋 Project Overview

This project implements a complete RAG pipeline that allows users to:
- Upload and process PDF documents
- Convert documents into semantic embeddings
- Store embeddings in a vector database
- Query documents with natural language questions
- Generate accurate answers using retrieved context and a large language model

### The RAG Pipeline

```
PDF Documents → Text Extraction → Chunking → Embedding → Vector Store → Retrieval → LLM → Answer
```

## 🏗️ Architecture

### Components

**rag-explorer** - Full-stack application with server and client

#### Backend (Node.js Express Server)
- **PDF Processing**: Extract text from PDF files using `pdf-parse`
- **Chunking**: Split documents into semantic chunks with configurable size and overlap
- **Embedding**: Generate embeddings using Nomic embed model via Ollama
- **Vector Storage**: Store and retrieve embeddings using ChromaDB
- **LLM Integration**: Generate answers using Groq API with gpt-oss-120b model

#### Frontend (React + Vite)
- Interactive UI for:
  - PDF ingestion and processing
  - Document querying
  - Real-time response streaming
  - Vector visualization and debugging

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** with pip (for ChromaDB)
- **Ollama** (for embedding generation) - [Download](https://ollama.ai)
- **Groq API Key** (for LLM) - [Get free API key](https://console.groq.com)

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd basicRAG/rag-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in `rag-explorer/`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   CHROMA_URL=http://localhost:8000
   DATA_DIR=../data
   CHUNK_SIZE=1200
   CHUNK_OVERLAP=200
   TOP_K=4
   PORT=8787
   
   # Optional: Basic authentication
   # BASIC_AUTH_USER=username
   # BASIC_AUTH_PASS=password
   ```

4. **Create data directory**
   ```bash
   mkdir ../data
   # Add your PDF files to this directory
   ```

### Running the Application

#### Option 1: Development Mode (Concurrent Services)
```bash
npm run dev
```
This starts:
- ChromaDB server on `http://localhost:8000`
- Express backend on `http://localhost:8787`
- Vite frontend on `http://localhost:5175`

#### Option 2: Individual Services
**Terminal 1 - ChromaDB:**
```bash
npm run chroma
```

**Terminal 2 - Backend Server:**
```bash
npm run server
```

**Terminal 3 - Frontend:**
```bash
npm run client
```

#### Production Build
```bash
npm run build
npm run preview
```

## 📊 Project Structure

```
basicRAG/
├── README.md              # This file
├── .gitignore            # Git ignore rules
├── data/                 # PDF storage directory
├── prompt/               # Prompt templates (if used)
└── rag-explorer/
    ├── package.json
    ├── vite.config.js
    ├── server/
    │   ├── index.js             # Main Express server
    │   └── lib/
    │       ├── pdf.js           # PDF extraction
    │       ├── chunk.js         # Text chunking
    │       ├── embed.js         # Embedding generation (Ollama)
    │       ├── chroma.js        # Vector store operations
    │       └── groq.js          # LLM integration (Groq)
    ├── src/                     # React frontend
    ├── dist/                    # Built frontend (production)
    └── chroma-data/            # Vector database storage
```

## 🔧 API Endpoints

### GET `/api/status`
Get system status and configuration
```json
{
  "dataDir": "path/to/data",
  "pdfs": ["doc1.pdf", "doc2.pdf"],
  "embed": {"model": "nomic-embed-text", "provider": "ollama"},
  "llm": {"model": "gpt-oss-120b", "provider": "groq"},
  "chroma": {"url": "http://localhost:8000", "up": true, "stored": 1250},
  "config": {"chunkSize": 1200, "chunkOverlap": 200, "topK": 4}
}
```

### POST `/api/ingest`
Ingest PDFs: extract → chunk → embed → store
```json
Response: {
  "files": [{"file": "doc.pdf", "numPages": 10, "chars": 50000, "numChunks": 42}],
  "totalChunks": 42,
  "embedDims": 768,
  "embedModel": "nomic-embed-text",
  "sampleChunks": [...]
}
```

### POST `/api/query`
Query documents with natural language
```json
Request: {"question": "What is the main topic?"}
Response: {
  "question": "What is the main topic?",
  "retrieved": [{"text": "...", "file": "doc.pdf", "metadata": {...}}],
  "answer": "The main topic is...",
  "model": "gpt-oss-120b",
  "usage": {"prompt_tokens": 150, "completion_tokens": 100}
}
```

### POST `/api/reset`
Clear all stored embeddings and reset the vector database

## 🎯 Key Features

✅ **Full RAG Pipeline** - Complete end-to-end document understanding  
✅ **PDF Support** - Automatic extraction from PDF files  
✅ **Semantic Search** - Vector-based retrieval using embeddings  
✅ **Multiple Sources** - Process and query across multiple documents  
✅ **Real-time Answers** - Fast LLM-generated responses  
✅ **Visual Debugging** - See embeddings and retrieved chunks  
✅ **Configurable** - Adjust chunk size, overlap, top-k results  
✅ **Optional Auth** - Basic authentication for public deployments  

## 🔗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, React Markdown |
| **Backend** | Node.js, Express, ES Modules |
| **Embedding** | Nomic Embed (via Ollama) |
| **Vector DB** | ChromaDB |
| **LLM** | Groq API (gpt-oss-120b) |
| **PDF** | pdf-parse |

## 📝 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `../data` | Directory containing PDF files |
| `CHUNK_SIZE` | `1200` | Characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `TOP_K` | `4` | Number of retrieved chunks per query |
| `PORT` | `8787` | Backend server port |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server URL |
| `GROQ_API_KEY` | - | **Required** for LLM responses |
| `BASIC_AUTH_USER` | - | Optional: Basic auth username |
| `BASIC_AUTH_PASS` | - | Optional: Basic auth password |

## 🐳 Docker Support

Build and run with Docker for consistent deployments:
```bash
docker build -t rag-explorer .
docker run -p 8787:8787 -e GROQ_API_KEY=your_key rag-explorer
```

## 🔐 Security

- **Basic Auth**: Optional authentication when deployed publicly (set `BASIC_AUTH_USER` and `BASIC_AUTH_PASS`)
- **CORS**: Configured for cross-origin requests
- **File Limits**: JSON payload limited to 2MB
- **Environment Variables**: Sensitive keys stored in `.env` (excluded via `.gitignore`)

## 💡 Use Cases

- 📚 **Document Q&A**: Ask questions about uploaded documents
- 🏢 **Knowledge Base**: Build searchable document repositories
- 📋 **Report Analysis**: Extract insights from PDF reports
- 🎓 **Educational**: Learn how RAG systems work end-to-end

## 🛠️ Development

### Add New Dependencies
```bash
npm install package-name
```

### Rebuild Frontend
```bash
npm run build
```

### Run Tests (if available)
```bash
npm test
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| ChromaDB connection refused | Ensure ChromaDB is running on port 8000: `npm run chroma` |
| Embedding errors | Check Ollama is running: `ollama serve` |
| No response from Groq | Verify `GROQ_API_KEY` is set and valid in `.env` |
| PDF ingestion fails | Ensure PDFs are in `basicRAG/data/` directory |
| Port already in use | Change `PORT` in `.env` or kill existing process |

## 📖 References

- [Retrieval-Augmented Generation (RAG)](https://en.wikipedia.org/wiki/Prompt_engineering#Retrieval-augmented_generation)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Ollama Models](https://ollama.ai)
- [Groq API](https://console.groq.com)

## 📄 License

This project is part of the AI-tester repository.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the project.

---

**Happy RAG-ing!** 🚀

# 🚀 VexaDoc — Enterprise AI Document Intelligence Platform

> **Status:** 🚀 Deployment-Ready MVP

VexaDoc is an AI-powered document intelligence platform built around Retrieval-Augmented Generation (RAG). Upload PDF and DOCX documents, ask questions in natural language, and receive grounded answers with source citations based on your documents — or use general AI knowledge when required.

VexaDoc combines hybrid semantic + keyword retrieval, multi-turn conversational memory, streaming LLM responses, document management, and a polished responsive interface into a single platform.

---

## 📖 Overview

Traditional keyword search can fail when users phrase their questions differently from the wording used in a document.

VexaDoc addresses this using **hybrid retrieval**:

* Dense vector search understands semantic meaning.
* BM25 lexical search captures exact terms, IDs, codes, and technical keywords.
* Reciprocal Rank Fusion (RRF) combines both rankings.
* Retrieved context is passed to the LLM for grounded answer generation.

Users can interact with VexaDoc through three answer modes:

* **Documents** — answers based strictly on uploaded documents.
* **AI** — answers using general LLM knowledge.
* **Hybrid** — prioritizes uploaded documents while allowing supplementary AI knowledge.

---

## ✨ Features

### 📄 Document Processing

* PDF and DOCX parsing
* Full text extraction
* Intelligent text chunking with overlap
* Automatic document metadata extraction
* Page-aware document processing
* Complete ingestion pipeline

### 🧠 AI & LLM Pipeline

* Groq LLM integration
* Token-by-token streaming responses
* Documents / AI / Hybrid answer modes
* Automatic document summarization
* Structured document summaries
* Source citations with document and page information
* Prompt-based grounding and answer control

> **Note:** The default model is **GPT-OSS 120B** (`openai/gpt-oss-120b`) hosted on Groq. The model is configurable via the `LLM_MODEL` environment variable, so you can switch to any Groq-supported model without changing code.

### 💬 Conversational Memory

* Multi-turn conversation context
* Follow-up question understanding
* Conversation-specific history
* Automatic local persistence
* Configurable conversation history window

### 🔍 Hybrid Search Engine

* Dense semantic search using sentence-transformer embeddings
* BM25 lexical keyword retrieval
* Reciprocal Rank Fusion (RRF)
* Active document filtering
* Configurable retrieval thresholds
* Configurable candidate pools

### 🗄️ Vector Storage

* ChromaDB integration
* Persistent local vector storage during runtime
* Document-level CRUD operations
* Metadata-filtered retrieval
* Filtering by document ID and source metadata

### ⚙️ Backend API — FastAPI

* Health endpoint
* Query endpoint
* Streaming query endpoint
* Document ingestion endpoint
* Document listing endpoint
* Document deletion endpoint
* Pydantic request/response validation
* CORS configuration
* Modular ingestion → retrieval → generation architecture

### 💻 Frontend — Next.js

* Real-time streaming chat interface
* Conversation history
* Pin / rename / delete conversations
* Conversation search
* Document Manager
* Active document selection
* Document deletion
* Three-mode knowledge toggle
* File upload with progress feedback
* Source citation panel
* Answer source badges
* Copy response
* Stop generation
* Dark / Light mode
* System theme detection
* Mobile-responsive sidebar drawer
* Keyboard shortcuts
* localStorage conversation persistence

---

## 🛠 Tech Stack

| Layer                 | Technology                                    |
| --------------------- | --------------------------------------------- |
| **LLM Provider**      | Groq                                          |
| **LLM**               | GPT-OSS 120B (`openai/gpt-oss-120b`) via Groq |
| **Embeddings**        | Sentence Transformers — `all-MiniLM-L6-v2`    |
| **Vector Database**   | ChromaDB                                      |
| **Backend**           | Python 3.10+, FastAPI, Uvicorn                |
| **Frontend**          | Next.js 16, React 19, TypeScript              |
| **Styling**           | Tailwind CSS v4                               |
| **Document Parsing**  | PyMuPDF, python-docx                          |
| **Search**            | BM25 + Dense Vectors + RRF                    |
| **Local Persistence** | ChromaDB + localStorage                       |
| **Deployment**        | Render + Vercel                               |

> **Frontend requirement:** Next.js 16 requires Node.js **20.9 or newer**.

---

## 📂 Project Structure

```text
vexadoc/
│
├── api/
│   ├── main.py
│   ├── routes.py
│   └── models.py
│
├── ingestion/
│   ├── parser.py
│   ├── chunker.py
│   ├── embedder.py
│   ├── metadata.py
│   └── loader.py
│
├── retrieval/
│   ├── retriever.py
│   └── search.py
│
├── generation/
│   ├── prompt.py
│   ├── llm.py
│   └── citations.py
│
├── storage/
│   ├── chroma_db.py
│   └── vector_store.py
│
├── tests/
│   └── test_phase1.py
│
├── scripts/
│   └── setup_db.py
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── data/
│   ├── raw_docs/
│   ├── processed/
│   └── chroma_db/
│
├── ui/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatInput.tsx
│   │   ├── CitationPanel.tsx
│   │   ├── KnowledgeToggle.tsx
│   │   ├── Sidebar.tsx
│   │   ├── UploadButton.tsx
│   │   └── DocumentModal.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   └── conversations.ts
│   │
│   └── package.json
│
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🔄 Data Pipeline

```text
PDF / DOCX Upload
        │
        ▼
Document Parsing
(PyMuPDF / python-docx)
        │
        ▼
Metadata Extraction
        │
        ▼
Text Chunking
        │
        ▼
Embedding Generation
(all-MiniLM-L6-v2)
        │
        ▼
ChromaDB
        │
        ▼
User Query
        │
        ▼
Hybrid Retrieval
(BM25 + Dense + RRF)
        │
        ▼
Prompt Assembly
(mode + history + context)
        │
        ▼
LLM Generation
        │
        ▼
Streaming Response
        │
        ▼
Source Citations
```

---

## 🚀 Quick Start

### Prerequisites

* Python 3.10+
* Node.js **20.9+**
* npm
* Groq API key

### 1. Clone the repository

```bash
git clone https://github.com/25f2005396/vexadoc.git
cd vexadoc
```

### 2. Backend

Create and activate the virtual environment:

```bash
python -m venv venv
```

Windows:

```powershell
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env`:

```env
GROQ_API_KEY=your_key_here
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b
LLM_MAX_TOKENS=2048
```

Start the API:

```bash
uvicorn api.main:app --reload
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### 3. Frontend

```bash
cd ui
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut                               | Action                                        |
| -------------------------------------- | --------------------------------------------- |
| `Ctrl + K` / `Cmd + K`                 | Start a new chat                              |
| `Ctrl + Shift + D` / `Cmd + Shift + D` | Open Document Manager                         |
| `Escape`                               | Stop generation / close modal / close sidebar |

---

# 🌐 Deployment

## Backend → Render

VexaDoc's FastAPI backend can be deployed as a Render Web Service.

### Render configuration

| Setting            | Value                                              |
| ------------------ | -------------------------------------------------- |
| **Service Type**   | Web Service                                        |
| **Repository**     | `25f2005396/vexadoc`                               |
| **Branch**         | `main`                                             |
| **Root Directory** | Leave blank                                        |
| **Runtime**        | Python                                             |
| **Build Command**  | `pip install -r requirements.txt`                  |
| **Start Command**  | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |

Render web services must bind to `0.0.0.0` and use the assigned service port.

### Environment variables

Add:

```text
GROQ_API_KEY=your_groq_api_key
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b
LLM_MAX_TOKENS=2048
```

After deployment, Render provides a public URL similar to:

```text
https://vexadoc-backend.onrender.com
```

---

## Frontend → Vercel

Import the same GitHub repository into Vercel.

Set:

```text
Root Directory: ui
```

Add the environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
```

Then deploy the Next.js application.

---

## ⚠️ Demo Deployment Storage Limitation

The current VexaDoc architecture uses local ChromaDB and local filesystem storage.

Render services use an **ephemeral filesystem by default**, meaning files written by the application can be lost when the service restarts, redeploys, or spins down. Render's Free web services also spin down after 15 minutes without inbound traffic.

Therefore, the initial Render deployment should be considered a:

> **Public demo / portfolio deployment**

rather than a fully persistent production deployment.

For a persistent enterprise deployment, VexaDoc will migrate document and vector storage to cloud infrastructure.

---

# 🗺️ Roadmap

## ✅ Completed

* Full RAG pipeline
* PDF / DOCX ingestion
* Streaming LLM responses
* Source citations
* Three answer modes
* Document summarization
* Multi-turn conversational memory
* Hybrid BM25 + Dense retrieval
* RRF fusion
* Document Manager
* Active document filtering
* Dark / Light mode
* Mobile responsive UI
* Keyboard shortcuts
* Render / Vercel deployment configuration

## 🔜 Enterprise Roadmap

* Authentication and authorization
* PostgreSQL + pgvector
* Cloud object storage
* Cloud-synchronized conversations
* Multi-tenant architecture
* User-level document isolation
* Rate limiting
* Audit logging
* Cross-encoder reranking
* Retrieval evaluation framework
* RAG quality benchmarks
* Automated testing
* CI/CD pipeline
* Docker-based deployment
* Observability and monitoring
* Production-grade background ingestion
* Document versioning
* Advanced citation verification

---

## 📚 Skills Demonstrated

* Retrieval-Augmented Generation (RAG)
* Large Language Model integration
* Hybrid search
* BM25 lexical retrieval
* Dense vector retrieval
* Reciprocal Rank Fusion
* Vector databases
* Sentence Transformers
* Streaming API design
* Server-Sent Events
* FastAPI architecture
* Next.js
* React
* TypeScript
* Tailwind CSS
* Responsive UI development
* Dark mode architecture
* Document parsing
* Prompt engineering
* API integration
* Cloud deployment
* Git / GitHub

---

## 👨‍💻 Author

**Neelisetty Venkata Naga Teja**

B.Tech Computer Science and Engineering (AI & ML)
Vellore Institute of Technology, Chennai

BS in Data Science and Applications
Indian Institute of Technology Madras

GitHub: **github.com/25f2005396**

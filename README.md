# 🚀 VexaDoc – Enterprise Retrieval-Augmented Generation (RAG) System

> **Status:** 🚧 Active Development

An enterprise-grade AI document intelligence system that enables semantic document search and AI-powered question answering using Retrieval-Augmented Generation (RAG).

The project combines document ingestion, vector embeddings, semantic retrieval, and modern web technologies to create an intelligent document assistant capable of understanding enterprise knowledge bases.

---

# 📖 Overview

VexaDoc is designed to overcome the limitations of traditional keyword-based document search by using semantic understanding powered by modern AI.

Users can upload enterprise documents, which are processed into searchable chunks, embedded into a vector database, and retrieved intelligently based on user queries before generating contextual responses.

---

# ✨ Features

## ✅ Implemented

### 📄 Document Processing
- PDF Parsing
- Text Extraction
- Metadata Extraction
- Intelligent Text Chunking

### 🧠 AI Pipeline
- Sentence Transformer Embeddings
- Embedding Generation
- Retrieval-Augmented Generation Architecture

### 🗄️ Vector Storage
- ChromaDB Integration
- Local Vector Storage
- Persistent Database Support

### 🔍 Retrieval Module
- Semantic Search
- Retriever Pipeline
- Search Engine Module

### ⚙ Backend API
- FastAPI Backend
- Modular API Architecture
- Request Models
- Route Management

### 💻 Frontend (Ongoing)
- Next.js
- TypeScript
- Chat Interface
- Upload Component
- Citation Panel
- Knowledge Toggle
- API Integration

---

# 🚧 Currently Under Development

- LLM Response Generation
- Streaming Responses
- Citation Generation Improvements
- Multi-document Retrieval
- Authentication
- Performance Optimization
- Docker Deployment

---

# 🛠 Tech Stack

## Programming
- Python
- TypeScript

## Backend
- FastAPI

## AI / Machine Learning
- Retrieval-Augmented Generation (RAG)
- LangChain
- Sentence Transformers

## Vector Database
- ChromaDB

## Document Processing
- PyMuPDF

## Frontend
- Next.js
- React
- Tailwind CSS

## Database
- SQLite (Chroma Persistence)

## Version Control
- Git
- GitHub

---

# 📂 Project Structure

```
VexaDoc
│
├── api/
│   ├── main.py
│   ├── models.py
│   └── routes.py
│
├── ingestion/
│   ├── parser.py
│   ├── chunker.py
│   ├── metadata.py
│   ├── embedder.py
│   └── loader.py
│
├── storage/
│   ├── chroma_db.py
│   └── vector_store.py
│
├── retrieval/
│   ├── retriever.py
│   └── search.py
│
├── generation/
│   ├── llm.py
│   ├── prompt.py
│   └── citations.py
│
├── ui/
│   ├── app/
│   ├── components/
│   └── lib/
│
├── data/
│   ├── raw_docs/
│   ├── processed/
│   └── chroma_db/
│
├── tests/
│
└── requirements.txt
```

---

# 🔄 Current Pipeline

```
PDF Upload
      │
      ▼
Document Parsing
      │
      ▼
Metadata Extraction
      │
      ▼
Text Chunking
      │
      ▼
Embedding Generation
      │
      ▼
ChromaDB Storage
      │
      ▼
Semantic Retrieval
      │
      ▼
LLM Context Generation
      │
      ▼
AI Response
```

---

# 🧪 Modules

### Ingestion
Responsible for parsing documents, extracting metadata, chunking text and generating embeddings.

### Storage
Stores embeddings using ChromaDB and manages vector persistence.

### Retrieval
Performs semantic similarity search and retrieves the most relevant document chunks.

### Generation
Generates contextual AI responses and manages citations.

### API
Provides REST endpoints for document upload and querying.

### UI
Modern chat interface built using Next.js and TypeScript.

---

# 📚 Skills Demonstrated

- Python
- FastAPI
- Retrieval-Augmented Generation (RAG)
- LangChain
- ChromaDB
- Sentence Transformers
- Semantic Search
- Vector Databases
- API Development
- Next.js
- React
- TypeScript
- Tailwind CSS
- Git
- Software Architecture

---

# 🎯 Learning Objectives

This project is being developed to gain hands-on experience in:

- Enterprise AI Systems
- Large Language Models
- Vector Databases
- Semantic Search
- Information Retrieval
- Backend API Development
- Modern Frontend Development
- AI Application Deployment

---

# 📌 Current Status

🚧 **Work in Progress**

Core ingestion, storage, retrieval and frontend foundations have been implemented.

The LLM response generation pipeline and deployment features are currently being developed.

---

## 👨‍💻 Author

**Neelisetty Venkata Naga Teja**

B.Tech Computer Science and Engineering (AI & ML)  
Vellore Institute of Technology, Chennai

BS in Data Science and Applications  
Indian Institute of Technology Madras

GitHub: https://github.com/25f2005396
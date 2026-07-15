"""
Vexadoc — API Routes
All endpoints for the Vexadoc REST API.

Endpoints:
    GET    /health              — health check
    POST   /query               — ask a question
    POST   /ingest              — upload and index a document
    GET    /documents           — list all documents
    DELETE /documents/{id}      — delete a document
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv

from api.models import (
    QueryRequest, QueryResponse, CitationResponse,
    DocumentResponse, IngestResponse, DeleteResponse, HealthResponse
)
from retrieval.search import search, search_user_docs
from generation.prompt import build_prompt, build_general_knowledge_prompt
from generation.llm import generate
from generation.citations import build_citations
from storage.vector_store import save_document, delete_document, list_documents
from storage.chroma_db import get_collection_stats
from ingestion.loader import ingest_document

load_dotenv()

router = APIRouter(tags=["Vexadoc"])


# ── Health ─────────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse)
def health():
    """Check if the API and database are running."""
    return {
        "status":           "ok",
        "version":          "0.1.0",
        "provider":         os.getenv("LLM_PROVIDER", "groq"),
        "collection_stats": get_collection_stats()
    }


# ── Query ──────────────────────────────────────────────────────
@router.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    """
    Ask a question and get an AI-generated answer with citations.

    Body:
        query:          Your question
        top_k:          Number of chunks to retrieve (default 5)
        source_type:    "admin" or "user" (default "admin")
        owner_id:       Required if source_type is "user"
        use_general_ai: True to allow AI general knowledge fallback
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        # ── Step 1: Retrieve ───────────────────────────────────
        if request.source_type == "user" and request.owner_id:
            results = search_user_docs(
                request.query,
                owner_id=request.owner_id,
                top_k=request.top_k
            )
        else:
            results = search(request.query, top_k=request.top_k)

        chunks = results["results"]

        # ── Step 2: No chunks found ────────────────────────────
        if not chunks:
            if request.use_general_ai:
                prompt = build_general_knowledge_prompt(request.query)
                answer = generate(prompt)
                return {
                    "query":         request.query,
                    "answer":        answer,
                    "citations":     [],
                    "chunks_used":   0,
                    "provider":      os.getenv("LLM_PROVIDER", "groq"),
                    "answer_source": "general_ai"
                }
            else:
                return {
                    "query":         request.query,
                    "answer":        "I couldn't find that information in the uploaded documents.",
                    "citations":     [],
                    "chunks_used":   0,
                    "provider":      os.getenv("LLM_PROVIDER", "groq"),
                    "answer_source": "not_found"
                }

        # ── Step 3: Build RAG prompt ───────────────────────────
        prompt = build_prompt(request.query, chunks)

        # ── Step 4: Generate answer ────────────────────────────
        answer = generate(prompt)

        # ── Step 5: Build citations ────────────────────────────
        citations = build_citations(chunks)

        return {
            "query":         request.query,
            "answer":        answer,
            "citations":     citations,
            "chunks_used":   len(chunks),
            "provider":      os.getenv("LLM_PROVIDER", "groq"),
            "answer_source": "documents"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Ingest ─────────────────────────────────────────────────────
@router.post("/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)):
    """
    Upload and index a document (PDF or DOCX).
    Temporary file is deleted after ingestion.
    """
    allowed = (".pdf", ".docx")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed}"
        )

    os.makedirs("data/raw_docs", exist_ok=True)
    temp_path = f"data/raw_docs/{file.filename}"

    try:
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)

        result = ingest_document(temp_path, source_type="admin")
        saved = save_document(result)
        return saved

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── List Documents ─────────────────────────────────────────────
@router.get("/documents", response_model=list[DocumentResponse])
def get_documents():
    """List all documents currently indexed in Vexadoc."""
    try:
        return list_documents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete Document ────────────────────────────────────────────
@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def remove_document(document_id: str):
    """
    Delete a document and all its chunks from the database.
    """
    try:
        return delete_document(document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
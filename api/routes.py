"""
Vexadoc — API Routes
All endpoints for the Vexadoc REST API.

Endpoints:
    GET    /health              — health check
    POST   /query               — ask a question
    POST   /query/stream        — ask a question, streamed token by token
    POST   /ingest              — upload and index a document
    GET    /documents           — list all documents
    DELETE /documents/{id}      — delete a document
"""

import os
import re
import json
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from api.models import (
    QueryRequest, QueryResponse, CitationResponse,
    DocumentResponse, IngestResponse, DeleteResponse, HealthResponse
)
from retrieval.search import search, search_user_docs
from generation.prompt import (
    build_prompt, build_ai_prompt, build_hybrid_prompt,
    build_document_summary_prompt, build_hybrid_document_summary_prompt
)
from generation.llm import generate, generate_stream
from generation.citations import build_citations
from storage.vector_store import save_document, delete_document, list_documents
from storage.chroma_db import get_collection_stats, get_collection
from ingestion.loader import ingest_document

load_dotenv()

router = APIRouter(tags=["Vexadoc"])

# Marker that separates streamed answer text from trailing JSON metadata.
# Must match STREAM_METADATA_MARKER in ui/lib/api.ts exactly.
STREAM_METADATA_MARKER = "\u241E__VEXADOC_STREAM_META__\u241E"

# ── Summary query triggers ─────────────────────────────────────
SUMMARY_TRIGGERS = [
    # What is in / about
    "what is in the document",
    "what is this document about",
    "what all are in the document",
    "what all is in the document",
    "what all are given in the document",
    "what all is given in the document",
    "what is given in the document",
    "what is the document",
    "what is the document about",
    "what does this document contain",
    "what does this document cover",
    "what does this document include",
    "what does this document say",
    "what does this document talk about",
    "what is covered in this document",
    "what is included in this document",
    "what topics are covered",
    "what topics are in this document",
    "what are the contents",
    "contents of the document",
    "what information is in the document",
    "what data is in the document",

    # Summarize
    "summarize",
    "summarize this",
    "summarize the document",
    "summarize this document",
    "summarize this file",
    "summarize the file",
    "summarize the content",
    "summarize the contents",
    "summary",
    "give me a summary",
    "give summary",
    "give me the summary",
    "provide a summary",
    "write a summary",
    "create a summary",
    "brief summary",
    "short summary",
    "quick summary",
    "document summary",

    # Overview / explain
    "give me an overview",
    "overview",
    "give an overview",
    "provide an overview",
    "give me overview",
    "explain the document",
    "explain this document",
    "explain this file",
    "explain the file",
    "explain the content",
    "explain the contents",
    "tell me about the document",
    "tell me about this document",
    "tell me what is in this document",
    "tell me what this document contains",
    "describe the document",
    "describe this document",
    "describe this file",
    "describe the contents",

    # What is this
    "what is this",
    "what is this file",
    "what is this about",
    "what is this file about",
    "what is this pdf about",
    "what is this docx about",
    "what is this doc about",

    # Key points / highlights
    "key points",
    "main points",
    "key takeaways",
    "takeaways",
    "highlights",
    "main highlights",
    "important points",
    "major points",
    "key information",
    "main information",
    "key details",
    "main details",
    "what are the key points",
    "what are the main points",
    "what are the highlights",
    "what are the takeaways",
    "list the key points",
    "list the main points",

    # Read / review
    "read the document",
    "read this document",
    "review the document",
    "review this document",
    "go through the document",
    "go through this document",
    "analyze the document",
    "analyze this document",
    "what can you tell me about this document",
    "what can you tell me about this file",
]

MAX_SUMMARY_CHUNKS = 25


def is_summary_query(query: str) -> bool:
    """Check if the query is asking for a document summary or overview."""
    query_normalized = re.sub(r"\s+", " ", query.strip().lower())
    return any(trigger in query_normalized for trigger in SUMMARY_TRIGGERS)


def _chunk_sort_key(chunk: dict):
    """Sort key for restoring original document order."""
    metadata = chunk.get("metadata") or {}
    if "chunk_index" in metadata and metadata["chunk_index"] is not None:
        return metadata["chunk_index"]
    if "page_number" in metadata and metadata["page_number"] is not None:
        return metadata["page_number"]
    return 0


def fetch_all_chunks(document_id: str = None) -> list:
    """
    Fetch all chunks from ChromaDB for summary queries.
    Returns empty list if no document_id provided.
    """
    if not document_id:
        return []

    collection = get_collection()

    try:
        raw = collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"]
        )
    except Exception:
        return []

    if not raw or not raw["documents"]:
        return []

    chunks = []
    for i in range(len(raw["documents"])):
        chunks.append({
            "text":       raw["documents"][i],
            "metadata":   raw["metadatas"][i],
            "similarity": 1.0,
        })

    chunks.sort(key=_chunk_sort_key)
    return chunks[:MAX_SUMMARY_CHUNKS]


def _serialize_citations(citations: list) -> list:
    """Serialize citations list to JSON-safe dicts."""
    result = []
    for c in citations:
        if isinstance(c, dict):
            result.append({
                "source_number": c.get("source_number", 0),
                "file_name":     c.get("file_name", ""),
                "page_number":   c.get("page_number"),
                "similarity":    c.get("similarity", 0),
                "document_id":   c.get("document_id"),
                "chunk_index":   c.get("chunk_index"),
            })
        else:
            result.append({
                "source_number": getattr(c, "source_number", 0),
                "file_name":     getattr(c, "file_name", ""),
                "page_number":   getattr(c, "page_number", None),
                "similarity":    getattr(c, "similarity", 0),
                "document_id":   getattr(c, "document_id", None),
                "chunk_index":   getattr(c, "chunk_index", None),
            })
    return result


def _resolve_query_pipeline(request: QueryRequest):
    """
    Shared retrieval + prompt-selection pipeline used by both
    /query and /query/stream so they behave identically.

    Returns:
        (direct_answer, prompt, citations, chunks_used, answer_source)
    """
    # ── Mode: AI Only ──────────────────────────────────────
    if request.mode == "ai":
        prompt = build_ai_prompt(request.query)
        return None, prompt, [], 0, "ai"

    summary_query = is_summary_query(request.query)

    # ── Summary queries — fetch all chunks ─────────────────
    if summary_query:
        chunks = fetch_all_chunks(document_id=request.document_id)
        if not chunks:
            return (
                "No uploaded document is available to summarize. Please upload a PDF or DOCX document first.",
                None, [], 0, "not_found"
            )
    else:
        # ── Normal semantic search ─────────────────────────
        if request.source_type == "user" and request.owner_id:
            results = search_user_docs(
                request.query,
                owner_id=request.owner_id,
                top_k=request.top_k,
                document_id=request.document_id
            )
        else:
            results = search(
                request.query,
                top_k=request.top_k,
                document_id=request.document_id
            )
        chunks = results["results"]

    # ── Mode: Documents Only ───────────────────────────────
    if request.mode == "documents":
        if not chunks:
            return (
                "I couldn't find that information in the uploaded documents.",
                None, [], 0, "not_found"
            )
        prompt = build_document_summary_prompt(chunks) if summary_query else build_prompt(request.query, chunks)
        citations = build_citations(chunks)
        return None, prompt, citations, len(chunks), "documents"

    # ── Mode: Hybrid ───────────────────────────────────────
    if request.mode == "hybrid":
        if summary_query:
            if not chunks:
                return (
                    "No uploaded document is available to summarize. Please upload a PDF or DOCX document first.",
                    None, [], 0, "not_found"
                )
            prompt = build_hybrid_document_summary_prompt(chunks)
        else:
            prompt = build_hybrid_prompt(request.query, chunks)
        citations = build_citations(chunks) if chunks else []
        return None, prompt, citations, len(chunks), "hybrid"

    return None, None, [], 0, None


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
    """Ask a question and get an AI-generated answer."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        direct_answer, prompt, citations, chunks_used, answer_source = (
            _resolve_query_pipeline(request)
        )

        if direct_answer is not None:
            return {
                "query":         request.query,
                "answer":        direct_answer,
                "citations":     [],
                "chunks_used":   0,
                "provider":      os.getenv("LLM_PROVIDER", "groq"),
                "answer_source": answer_source or "not_found"
            }

        if prompt is None:
            raise HTTPException(status_code=400, detail=f"Unsupported mode: {request.mode}")

        answer = generate(prompt)
        return {
            "query":         request.query,
            "answer":        answer,
            "citations":     citations,
            "chunks_used":   chunks_used,
            "provider":      os.getenv("LLM_PROVIDER", "groq"),
            "answer_source": answer_source or "documents"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Query (Streaming) ──────────────────────────────────────────

# Common headers for the SSE-style response: disable proxy/browser
# buffering so tokens reach the client as soon as they're yielded
# instead of being held back until the response completes.
_STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/query/stream")
def query_stream(request: QueryRequest):
    """
    Same as /query but streams the answer token by token.
    Appends STREAM_METADATA_MARKER + JSON at end of stream
    so the frontend can recover citations and answer_source.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        direct_answer, prompt, citations, chunks_used, answer_source = (
            _resolve_query_pipeline(request)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Build metadata payload
    metadata_payload = json.dumps({
        "citations":     _serialize_citations(citations),
        "answer_source": answer_source or "documents",
    })

    # Direct answer — no LLM call needed
    if direct_answer is not None:
        def direct_generator():
            yield direct_answer
            yield STREAM_METADATA_MARKER + metadata_payload
        return StreamingResponse(
            direct_generator(),
            media_type="text/event-stream",
            headers=_STREAM_HEADERS,
        )

    if prompt is None:
        raise HTTPException(status_code=400, detail=f"Unsupported mode: {request.mode}")

    async def token_generator():
        try:
            for token in generate_stream(prompt):
                yield token
                # Yield control back to the event loop after every token
                # so Starlette/uvicorn can flush it immediately instead
                # of batching multiple tokens into one write.
                await asyncio.sleep(0)
        except RuntimeError as e:
            yield f"\n\n[Error: {e}]"
        finally:
            # Always append metadata at end of stream
            yield STREAM_METADATA_MARKER + metadata_payload

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers=_STREAM_HEADERS,
    )


# ── Ingest ─────────────────────────────────────────────────────
@router.post("/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)):
    """Upload and index a document (PDF or DOCX)."""
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
    """Delete a document and all its chunks from the database."""
    try:
        return delete_document(document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
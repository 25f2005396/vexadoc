"""
Vexadoc — API Models
Request and response schemas using Pydantic.
"""

from pydantic import BaseModel
from typing import List, Optional


# ── Request Models ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    source_type: Optional[str] = "admin"
    owner_id: Optional[str] = None


# ── Response Models ────────────────────────────────────────────

class CitationResponse(BaseModel):
    source_number: int
    file_name: str
    page_number: Optional[int] = None
    similarity: float
    document_id: Optional[str] = None
    chunk_index: Optional[int] = None


class QueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[CitationResponse]
    chunks_used: int
    provider: str


class DocumentResponse(BaseModel):
    document_id: str
    file_name: str
    file_type: str
    source_type: str
    uploaded_at: str


class IngestResponse(BaseModel):
    document_id: str
    file_name: str
    chunks_saved: int
    status: str


class DeleteResponse(BaseModel):
    document_id: str
    status: str


class HealthResponse(BaseModel):
    status: str
    version: str
    provider: str
    collection_stats: dict
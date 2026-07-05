"""
Vexadoc — Document Loader
Orchestrates the full ingestion pipeline:
parse → chunk → embed → return result

Two ways this gets called:
    Pattern 1 (Admin): python scripts/ingest_docs.py
    Pattern 2 (User):  POST /api/ingest (triggered from chat UI)

Usage:
    from ingestion.loader import ingest_document
    result = ingest_document("data/raw_docs/sample.pdf")
"""

import os
import time
import uuid
from ingestion.parser import parse_file
from ingestion.chunker import chunk_document
from ingestion.embedder import embed_chunks
from ingestion.metadata import extract_metadata


def ingest_document(file_path: str, source_type: str = "admin", owner_id: str = None) -> dict:
    """
    Run the full ingestion pipeline for a single document.

    Args:
        file_path:   Path to the PDF or DOCX file
        source_type: "admin" (pre-indexed) or "user" (uploaded in chat)
        owner_id:    User ID if source_type is "user", None for admin docs

    Returns:
        {
            "metadata": { file info + source_type + owner_id + document_id },
            "chunks":   [ { chunk_index, page_number, text, embedding } ]
        }
    """

    # ── Step 0: Validate ──────────────────────────────────────
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    supported = (".pdf", ".docx")
    if not file_path.lower().endswith(supported):
        raise ValueError(f"Unsupported file type. Supported: {supported}")

    if source_type not in ("admin", "user"):
        raise ValueError("source_type must be 'admin' or 'user'")

    if source_type == "user" and not owner_id:
        raise ValueError("owner_id is required when source_type is 'user'")

    # ── Start timer ───────────────────────────────────────────
    start = time.time()

    try:
        # ── Step 1: Parse ─────────────────────────────────────
        print(f"\n[1/4] Parsing: {file_path}")
        parsed = parse_file(file_path)
        print(f"       → {parsed['total_pages']} page(s) found")

        # ── Step 2: Metadata ──────────────────────────────────
        print(f"[2/4] Extracting metadata...")
        metadata = extract_metadata(file_path, parsed)
        metadata["document_id"] = str(uuid.uuid4())
        metadata["source_type"] = source_type
        metadata["owner_id"] = owner_id or "admin"
        print(f"       → {metadata['file_name']} ({metadata['file_size_kb']} KB)")
        print(f"       → document_id: {metadata['document_id']}")

        # ── Step 3: Chunk ─────────────────────────────────────
        chunk_size = int(os.getenv("CHUNK_SIZE", 500))
        chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 50))

        print(f"[3/4] Chunking text (size={chunk_size}, overlap={chunk_overlap})...")
        chunks = chunk_document(parsed, chunk_size, chunk_overlap)
        print(f"       → {len(chunks)} chunks created")

        # ── Step 4: Embed ─────────────────────────────────────
        print(f"[4/4] Embedding chunks...")
        chunks = embed_chunks(chunks)
        print(f"       → Done")

    except Exception as e:
        raise RuntimeError(
            f"Document ingestion failed: {file_path}"
        ) from e

    # ── Finish ────────────────────────────────────────────────
    elapsed = time.time() - start
    print(f"\nIngestion completed in {elapsed:.2f}s")
    print(f"Document: {metadata['file_name']}")
    print(f"Chunks:   {len(chunks)}")
    print(f"ID:       {metadata['document_id']}\n")

    return {
        "metadata": metadata,
        "chunks": chunks
    }
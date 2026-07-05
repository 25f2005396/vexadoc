"""
Vexadoc — Vector Store
Handles saving and deleting chunks in ChromaDB.
This is the only file the rest of the app talks to for storage.

Usage:
    from storage.vector_store import save_document, delete_document
    save_document(result)       # result from ingestion.loader
    delete_document(doc_id)     # remove by document_id
"""

from typing import List
from storage.chroma_db import collection


def save_document(ingestion_result: dict) -> dict:
    """
    Save all chunks from an ingested document into ChromaDB.
    Safe to call multiple times — re-indexes if document already exists.

    Args:
        ingestion_result: Output from ingestion.loader.ingest_document()

    Returns:
        Summary dict with document_id and chunks saved.
    """
    metadata = ingestion_result["metadata"]
    chunks = ingestion_result["chunks"]

    if not chunks:
        raise ValueError("No chunks to save — document may be image-based or empty.")

    # ── Build ChromaDB inputs ──────────────────────────────────
    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for chunk in chunks:
        chunk_id = f"{metadata['document_id']}__chunk__{chunk['chunk_index']}"

        ids.append(chunk_id)
        embeddings.append(chunk["embedding"])
        documents.append(chunk["text"])
        metadatas.append({
            "document_id": metadata["document_id"],
            "file_name":   metadata["file_name"],
            "file_type":   metadata["file_type"],
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "source_type": metadata["source_type"],
            "owner_id":    metadata["owner_id"],
            "uploaded_at": metadata["uploaded_at"],
        })

    # ── Remove previous copy if it exists ─────────────────────
    try:
        collection.delete(
            where={"document_id": metadata["document_id"]}
        )
    except Exception as e:
        raise RuntimeError("Failed to remove existing document from ChromaDB.") from e

    # ── Save to ChromaDB ───────────────────────────────────────
    try:
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
    except Exception as e:
        raise RuntimeError("Failed to save document to ChromaDB.") from e

    return {
        "document_id":  metadata["document_id"],
        "file_name":    metadata["file_name"],
        "chunks_saved": len(chunks),
        "status":       "saved"
    }


def delete_document(document_id: str) -> dict:
    """
    Delete all chunks belonging to a document from ChromaDB.

    Args:
        document_id: The UUID from metadata["document_id"]

    Returns:
        Confirmation dict.
    """
    try:
        collection.delete(
            where={"document_id": document_id}
        )
    except Exception as e:
        raise RuntimeError(f"Failed to delete document {document_id} from ChromaDB.") from e

    return {
        "document_id": document_id,
        "status":      "deleted"
    }


def list_documents() -> List[dict]:
    """
    List all unique documents currently stored in ChromaDB.
    Returns one entry per document, not per chunk.
    """
    if collection.count() == 0:
        return []

    results = collection.get(include=["metadatas"])
    seen = {}

    for meta in results["metadatas"]:
        doc_id = meta["document_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "document_id": doc_id,
                "file_name":   meta["file_name"],
                "file_type":   meta["file_type"],
                "source_type": meta["source_type"],
                "uploaded_at": meta["uploaded_at"],
            }

    return list(seen.values())
"""
Vexadoc — Retriever
Converts a user question into a vector and searches ChromaDB
for the most relevant chunks.

Usage:
    from retrieval.retriever import retrieve
    results = retrieve("What is the leave policy?")
"""

import os
from ingestion.embedder import embed_text
from storage.chroma_db import get_collection


def retrieve(
    query: str,
    top_k: int = None,
    source_type: str = None,
    owner_id: str = None
) -> list[dict]:
    """
    Search ChromaDB for chunks most relevant to the query.

    Args:
        query:       The user's question in plain English
        top_k:       Number of results to return (default from .env)
        source_type: Filter by "admin" or "user" (optional)
        owner_id:    Filter by uploader ID (optional)

    Returns:
        List of matching chunks with text, metadata, and similarity score
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty.")

    top_k = top_k or int(os.getenv("RETRIEVAL_TOP_K", 5))
    MIN_SIMILARITY = 0.25   # Ignore anything below 25%

    # ── Step 1: Embed the query ────────────────────────────────
    query_embedding = embed_text(query)

    # ── Step 2: Build filters ──────────────────────────────────
    where = {}
    if source_type:
        where["source_type"] = source_type
    if owner_id:
        where["owner_id"] = owner_id

    # ── Step 3: Search ChromaDB ────────────────────────────────
    try:
        collection = get_collection()

        search_kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"]
        }
        if where:
            search_kwargs["where"] = where

        results = collection.query(**search_kwargs)

    except Exception as e:
        raise RuntimeError("ChromaDB search failed.") from e

    # ── Step 4: Handle empty results ──────────────────────────
    if not results["documents"] or not results["documents"][0]:
        return []

    # ── Step 5: Format results ─────────────────────────────────
    formatted = []

    for i in range(len(results["documents"][0])):
        similarity = round(1 - results["distances"][0][i], 4)

        # Skip weak matches
        if similarity < MIN_SIMILARITY:
            continue

        formatted.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "similarity": similarity,
        })

    return formatted
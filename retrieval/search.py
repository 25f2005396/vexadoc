"""
Vexadoc — Search
Higher-level search functions built on top of retriever.py.
This is what the API and UI call directly.

Usage:
    from retrieval.search import search
    results = search("What is the leave policy?")
"""

import os
from typing import Optional, Dict, Any
from retrieval.retriever import retrieve


# ── Helper ─────────────────────────────────────────────────────
def _build_response(query: str, results: list) -> Dict[str, Any]:
    """Build a standard search response dict."""
    return {
        "query":   query,
        "results": results,
        "count":   len(results)
    }


def _default_top_k(top_k: Optional[int] = None) -> int:
    """Return top_k from argument or fall back to .env value."""
    if top_k is not None:
        return top_k
    return int(os.getenv("RETRIEVAL_TOP_K", "5"))


# ── Search Functions ───────────────────────────────────────────
def search(
    query: str,
    top_k: Optional[int] = None,
    document_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Hybrid search across admin documents.
    If document_id is provided, searches only that document.

    Args:
        query:       User's question
        top_k:       Number of results (default from .env)
        document_id: Filter to active document (optional)

    Returns:
        Dict with query, results, and count
    """
    if not query or not query.strip():
        return _build_response(query, [])

    results = retrieve(
        query,
        top_k=_default_top_k(top_k),
        source_type="admin",
        document_id=document_id
    )
    return _build_response(query, results)


def search_user_docs(
    query: str,
    owner_id: str,
    top_k: Optional[int] = None,
    document_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Hybrid search across documents uploaded by a specific user.

    Args:
        query:       User's question
        owner_id:    The user's ID
        top_k:       Number of results (default from .env)
        document_id: Filter to active document (optional)

    Returns:
        Dict with query, results, and count
    """
    if not query or not query.strip():
        return _build_response(query, [])

    if not owner_id:
        raise ValueError("owner_id is required for user document search.")

    results = retrieve(
        query,
        top_k=_default_top_k(top_k),
        owner_id=owner_id,
        document_id=document_id
    )
    return _build_response(query, results)


def search_all(query: str, top_k: Optional[int] = None) -> Dict[str, Any]:
    """
    Hybrid search across ALL documents regardless of source_type.

    Args:
        query:  User's question
        top_k:  Number of results (default from .env)

    Returns:
        Dict with query, results, and count
    """
    if not query or not query.strip():
        return _build_response(query, [])

    results = retrieve(query, top_k=_default_top_k(top_k))
    return _build_response(query, results)
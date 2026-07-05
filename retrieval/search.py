"""
Vexadoc — Search
Higher-level search functions built on top of retriever.py.
This is what the API and UI will call directly.

Usage:
    from retrieval.search import search
    results = search("What is the leave policy?")
"""

import os
from retrieval.retriever import retrieve


# ── Helper ─────────────────────────────────────────────────────
def _build_response(query: str, results: list) -> dict[str, object]:
    """Build a standard search response dict."""
    return {
        "query":   query,
        "results": results,
        "count":   len(results)
    }


def _default_top_k(top_k: int = None) -> int:
    """Return top_k from argument or fall back to .env value."""
    return top_k or int(os.getenv("RETRIEVAL_TOP_K", 5))


# ── Search Functions ───────────────────────────────────────────
def search(query: str, top_k: int = None) -> dict[str, object]:
    """
    Search across all admin documents.
    Main search function for the knowledge base.

    Args:
        query:  User's question
        top_k:  Number of results (default from .env)

    Returns:
        Dict with query, results, and count
    """
    if not query or not query.strip():
        return _build_response(query, [])

    results = retrieve(query, top_k=_default_top_k(top_k), source_type="admin")
    return _build_response(query, results)


def search_user_docs(query: str, owner_id: str, top_k: int = None) -> dict[str, object]:
    """
    Search only documents uploaded by a specific user.
    Used for Pattern 2 (user uploads their own document).

    Args:
        query:    User's question
        owner_id: The user's ID
        top_k:    Number of results (default from .env)

    Returns:
        Dict with query, results, and count
    """
    if not query or not query.strip():
        return _build_response(query, [])

    if not owner_id:
        raise ValueError("owner_id is required for user document search.")

    results = retrieve(query, top_k=_default_top_k(top_k), owner_id=owner_id)
    return _build_response(query, results)


def search_all(query: str, top_k: int = None) -> dict[str, object]:
    """
    Search across ALL documents regardless of source_type.
    Used by admins to search everything.

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
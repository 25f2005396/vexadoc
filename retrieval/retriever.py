"""
Vexadoc — Hybrid Retriever

Combines:
1. Dense vector search using ChromaDB + sentence-transformer embeddings
2. Lexical keyword search using BM25-style scoring
3. Reciprocal Rank Fusion (RRF) to merge both result sets

This improves retrieval for:
- Exact terms and names
- IDs, policy numbers, codes, and technical keywords
- Semantic / natural-language questions
- Documents where wording is similar but not identical

Usage:
    from retrieval.retriever import retrieve

    results = retrieve("What is the leave policy?")
"""

import os
import math
import re
from collections import Counter

from ingestion.embedder import embed_text
from storage.chroma_db import get_collection


# ── Retrieval Configuration ────────────────────────────────────

MIN_SIMILARITY = float(os.getenv("MIN_SIMILARITY", "0.15"))

# Fetch more vector candidates than the final top_k because hybrid fusion
# needs a larger candidate pool to compare semantic and keyword results.
CANDIDATE_MULTIPLIER = int(os.getenv("RETRIEVAL_CANDIDATE_MULTIPLIER", "4"))
MIN_CANDIDATES = int(os.getenv("RETRIEVAL_MIN_CANDIDATES", "20"))

# Standard RRF constant. Higher values make rank differences less aggressive.
RRF_K = int(os.getenv("RRF_K", "60"))

# BM25 tuning values.
BM25_K1 = float(os.getenv("BM25_K1", "1.5"))
BM25_B = float(os.getenv("BM25_B", "0.75"))


def _tokenize(text: str) -> list[str]:
    """
    Convert text into lowercase searchable tokens.

    Keeps letters and numbers, so values like policy IDs, dates,
    product codes, and technical terms still participate in matching.
    """
    if not text:
        return []

    return re.findall(r"[a-zA-Z0-9_./-]+", text.lower())


def _build_where_filter(
    source_type: str | None = None,
    owner_id: str | None = None,
    document_id: str | None = None,
) -> dict:
    """
    Build the ChromaDB metadata filter.

    document_id takes priority because selecting an active document
    should restrict retrieval only to that document.
    """
    where = {}

    if document_id:
        where["document_id"] = document_id
        return where

    if source_type:
        where["source_type"] = source_type

    if owner_id:
        where["owner_id"] = owner_id

    return where


def _safe_similarity(distance: float) -> float:
    """
    Preserve Vexadoc's existing similarity convention: 1 - distance.

    ChromaDB normally returns cosine distance for a cosine collection.
    Clamp the result to prevent negative similarity values.
    """
    try:
        return round(max(0.0, min(1.0, 1 - float(distance))), 4)
    except (TypeError, ValueError):
        return 0.0


def _bm25_scores(query: str, documents: list[str]) -> list[float]:
    """
    Calculate lightweight BM25 scores without requiring an additional
    rank_bm25 dependency.

    BM25 is useful for exact keyword matching, names, labels, codes,
    IDs, numbers, and domain-specific terminology.
    """
    if not documents:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        return [0.0] * len(documents)

    tokenized_docs = [_tokenize(doc) for doc in documents]
    total_docs = len(tokenized_docs)

    if total_docs == 0:
        return []

    document_lengths = [len(tokens) for tokens in tokenized_docs]
    average_doc_length = sum(document_lengths) / total_docs if total_docs else 1.0
    average_doc_length = max(average_doc_length, 1.0)

    # Number of documents containing each term.
    document_frequency = Counter()
    for tokens in tokenized_docs:
        for token in set(tokens):
            document_frequency[token] += 1

    scores = []

    for tokens, document_length in zip(tokenized_docs, document_lengths):
        token_counts = Counter(tokens)
        score = 0.0

        for term in query_tokens:
            term_frequency = token_counts.get(term, 0)
            if term_frequency == 0:
                continue

            df = document_frequency.get(term, 0)

            # Standard BM25 inverse document frequency.
            idf = math.log(
                1 + ((total_docs - df + 0.5) / (df + 0.5))
            )

            denominator = (
                term_frequency
                + BM25_K1
                * (
                    1
                    - BM25_B
                    + BM25_B * (document_length / average_doc_length)
                )
            )

            score += idf * (
                (term_frequency * (BM25_K1 + 1)) / max(denominator, 0.0001)
            )

        scores.append(round(score, 6))

    return scores


def _rrf_score(rank: int) -> float:
    """Return a Reciprocal Rank Fusion contribution for a 1-based rank."""
    return 1 / (RRF_K + rank)


def _get_dense_candidates(
    collection,
    query_embedding: list[float],
    candidate_count: int,
    where: dict,
) -> list[dict]:
    """
    Retrieve semantic/vector candidates from ChromaDB.
    """
    search_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": candidate_count,
        "include": ["documents", "metadatas", "distances"],
    }

    if where:
        search_kwargs["where"] = where

    results = collection.query(**search_kwargs)

    if not results.get("documents") or not results["documents"][0]:
        return []

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    candidates = []

    for index, text in enumerate(documents):
        similarity = _safe_similarity(distances[index])

        # Keep the same semantic-quality protection your existing retriever had.
        if similarity < MIN_SIMILARITY:
            continue

        candidates.append({
            "text": text,
            "metadata": metadatas[index] or {},
            "similarity": similarity,
            "dense_rank": index + 1,
        })

    return candidates


def _get_lexical_candidates(
    collection,
    query: str,
    where: dict,
    candidate_count: int,
) -> list[dict]:
    """
    Fetch filtered chunks and rank them using lexical BM25-style matching.

    Note:
    This is appropriate for the current local ChromaDB MVP. For very large
    enterprise collections, this should later move to PostgreSQL full-text
    search, Elasticsearch/OpenSearch, or a dedicated BM25 index.
    """
    get_kwargs = {
        "include": ["documents", "metadatas"],
    }

    if where:
        get_kwargs["where"] = where

    raw = collection.get(**get_kwargs)

    documents = raw.get("documents", []) if raw else []
    metadatas = raw.get("metadatas", []) if raw else []

    if not documents:
        return []

    scores = _bm25_scores(query, documents)

    ranked = sorted(
        [
            {
                "text": text,
                "metadata": metadatas[index] or {},
                "bm25_score": scores[index],
            }
            for index, text in enumerate(documents)
            # Ignore chunks with no keyword overlap.
            if scores[index] > 0
        ],
        key=lambda item: item["bm25_score"],
        reverse=True,
    )

    for rank, item in enumerate(ranked, start=1):
        item["lexical_rank"] = rank

    return ranked[:candidate_count]


def _chunk_identity(chunk: dict) -> str:
    """
    Generate a stable identity for merging vector and lexical candidates.

    chunk_index + document_id is preferred because the same text may appear
    in multiple chunks/documents. Fall back to text if older metadata lacks IDs.
    """
    metadata = chunk.get("metadata") or {}
    document_id = metadata.get("document_id", "")
    chunk_index = metadata.get("chunk_index", "")

    if document_id or chunk_index != "":
        return f"{document_id}::{chunk_index}"

    return chunk.get("text", "")


def _fuse_candidates(
    dense_candidates: list[dict],
    lexical_candidates: list[dict],
    top_k: int,
) -> list[dict]:
    """
    Merge dense and lexical rankings using Reciprocal Rank Fusion (RRF).

    The final `similarity` remains the dense semantic similarity when it
    exists, so existing citation UI continues to work correctly.
    """
    merged = {}

    for candidate in dense_candidates:
        key = _chunk_identity(candidate)

        merged[key] = {
            "text": candidate["text"],
            "metadata": candidate["metadata"],
            "similarity": candidate["similarity"],
            "dense_rank": candidate["dense_rank"],
            "lexical_rank": None,
            "bm25_score": 0.0,
            "hybrid_score": _rrf_score(candidate["dense_rank"]),
        }

    for candidate in lexical_candidates:
        key = _chunk_identity(candidate)

        if key not in merged:
            merged[key] = {
                "text": candidate["text"],
                "metadata": candidate["metadata"],
                # A lexical-only result has no true vector similarity.
                # Use 0.0 rather than inventing a semantic score.
                "similarity": 0.0,
                "dense_rank": None,
                "lexical_rank": candidate["lexical_rank"],
                "bm25_score": candidate["bm25_score"],
                "hybrid_score": _rrf_score(candidate["lexical_rank"]),
            }
        else:
            merged[key]["lexical_rank"] = candidate["lexical_rank"]
            merged[key]["bm25_score"] = candidate["bm25_score"]
            merged[key]["hybrid_score"] += _rrf_score(candidate["lexical_rank"])

    ranked = sorted(
        merged.values(),
        key=lambda item: (
            item["hybrid_score"],
            item["similarity"],
            item["bm25_score"],
        ),
        reverse=True,
    )

    # Return only the fields the rest of your Vexadoc app expects.
    return [
        {
            "text": item["text"],
            "metadata": item["metadata"],
            "similarity": item["similarity"],
        }
        for item in ranked[:top_k]
    ]


def retrieve(
    query: str,
    top_k: int = None,
    source_type: str = None,
    owner_id: str = None,
    document_id: str = None,
) -> list[dict]:
    """
    Search ChromaDB using hybrid semantic + keyword retrieval.

    Args:
        query:       The user's question in plain English.
        top_k:       Number of final results to return.
        source_type: Filter by "admin" or "user" (optional).
        owner_id:    Filter by uploader ID (optional).
        document_id: Filter by a selected active document (optional).

    Returns:
        List of chunks containing:
        - text
        - metadata
        - similarity (semantic similarity when available)
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty.")

    top_k = top_k or int(os.getenv("RETRIEVAL_TOP_K", "5"))
    top_k = max(1, top_k)

    candidate_count = max(top_k * CANDIDATE_MULTIPLIER, MIN_CANDIDATES)
    where = _build_where_filter(
        source_type=source_type,
        owner_id=owner_id,
        document_id=document_id,
    )

    try:
        collection = get_collection()

        # Dense / semantic candidates.
        query_embedding = embed_text(query)
        dense_candidates = _get_dense_candidates(
            collection=collection,
            query_embedding=query_embedding,
            candidate_count=candidate_count,
            where=where,
        )

        # Lexical / BM25 candidates.
        lexical_candidates = _get_lexical_candidates(
            collection=collection,
            query=query,
            where=where,
            candidate_count=candidate_count,
        )

        # If both methods find nothing, no relevant chunks exist.
        if not dense_candidates and not lexical_candidates:
            return []

        return _fuse_candidates(
            dense_candidates=dense_candidates,
            lexical_candidates=lexical_candidates,
            top_k=top_k,
        )

    except Exception as e:
        raise RuntimeError("Hybrid ChromaDB search failed.") from e
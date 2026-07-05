"""
Vexadoc — Citations
Extracts source references from retrieved chunks.
"""

from typing import List


def build_citations(chunks: List[dict]) -> List[dict]:
    """
    Build a clean list of citations from retrieved chunks.
    Sorted by similarity — most relevant source listed first.

    Args:
        chunks: List of chunk dicts from retrieval

    Returns:
        List of citation dicts sorted by similarity
    """
    citations = []
    seen = set()

    for i, chunk in enumerate(chunks):
        meta = chunk.get("metadata", {})
        file_name = meta.get("file_name", "Unknown")
        page_number = meta.get("page_number", "?")
        similarity = chunk.get("similarity", 0)

        key = f"{file_name}_page_{page_number}"
        if key not in seen:
            seen.add(key)
            citations.append({
                "source_number": i + 1,
                "file_name":     file_name,
                "page_number":   page_number,
                "similarity":    similarity,
                "document_id":   meta.get("document_id", ""),
                "chunk_index":   meta.get("chunk_index", 0),
            })

    # ── Sort by similarity descending ─────────────────────────
    citations.sort(key=lambda c: c["similarity"], reverse=True)

    # ── Reassign source numbers after sorting ──────────────────
    for i, citation in enumerate(citations):
        citation["source_number"] = i + 1

    return citations


def format_citations(citations: List[dict]) -> str:
    """
    Format citations as a readable string.
    Most relevant source is listed first.

    Returns:
        [Source 1] sample.pdf — Page 3 (similarity: 0.261)
        [Source 2] report.pdf — Page 7 (similarity: 0.183)
    """
    if not citations:
        return "No sources found."

    lines = []
    for c in citations:
        lines.append(
            f"[Source {c['source_number']}] "
            f"{c['file_name']} — Page {c['page_number']} "
            f"(similarity: {c['similarity']:.3f})"
        )
    return "\n".join(lines)
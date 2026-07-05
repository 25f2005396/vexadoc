"""
Vexadoc — Metadata Extractor
Captures information about each document for filtering,
search, and citation purposes.
"""

import os
from datetime import datetime, UTC


def extract_metadata(file_path: str, parsed_doc: dict) -> dict:
    """
    Build a metadata dict for a document.
    This gets stored alongside every chunk in the database.

    Args:
        file_path: Path to the original file
        parsed_doc: Output from parser.parse_file()

    Returns:
        Metadata dict
    """
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    file_ext = os.path.splitext(file_name)[1].lower().replace(".", "")

    return {
        "file_name": file_name,
        "file_path": file_path,
        "file_type": file_ext,
        "file_size_kb": round(file_size / 1024, 2),
        "total_pages": parsed_doc.get("total_pages", 1),
        "uploaded_at": datetime.now(UTC).isoformat(),
    }
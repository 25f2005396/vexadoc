"""
Vexadoc — Document Parser
Reads PDF and DOCX files and returns plain text.
"""

import fitz  # PyMuPDF


def parse_pdf(file_path: str) -> dict:
    """
    Parse a PDF file.
    Returns text content and basic metadata.
    """
    with fitz.open(file_path) as doc:
        pages = []

        for page_num, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                pages.append({
                    "page_number": page_num + 1,
                    "text": text
                })

        return {
            "pages": pages,
            "total_pages": len(doc),
            "file_path": file_path,
            "file_type": "pdf"
        }


def parse_docx(file_path: str) -> dict:
    """
    Parse a DOCX file.
    Returns text content and basic metadata.
    """
    from docx import Document

    doc = Document(file_path)
    full_text = []

    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())

    return {
        "pages": [
            {
                "page_number": 1,
                "text": "\n".join(full_text)
            }
        ],
        "total_pages": 1,
        "file_path": file_path,
        "file_type": "docx"
    }


def parse_file(file_path: str) -> dict:
    """
    Auto-detect file type and parse accordingly.
    Supports: PDF, DOCX
    """
    if file_path.lower().endswith(".pdf"):
        return parse_pdf(file_path)
    elif file_path.lower().endswith(".docx"):
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")
"""
Vexadoc — Text Chunker
Splits long text into overlapping chunks ready for embedding.
"""


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """
    Split text into overlapping chunks by word count.
    """
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def chunk_document(parsed_doc: dict, chunk_size: int = 500, overlap: int = 50) -> list:
    """
    Chunk an entire parsed document (output from parser.py).
    Preserves page number in each chunk for citation later.
    """
    all_chunks = []
    chunk_index = 0

    for page in parsed_doc["pages"]:
        page_chunks = chunk_text(page["text"], chunk_size, overlap)

        for chunk in page_chunks:
            all_chunks.append({
                "chunk_index": chunk_index,
                "page_number": page["page_number"],
                "text": chunk
            })
            chunk_index += 1

    return all_chunks
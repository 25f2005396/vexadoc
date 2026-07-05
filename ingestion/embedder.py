"""
Vexadoc — Embedder
Converts text chunks into vector embeddings using
Sentence Transformers.
Features:
- Loads model only once
- Batch embedding
- Error handling
- Input validation
- Progress bar
- Configurable model name
"""

import os
from sentence_transformers import SentenceTransformer

# --------------------------------------------------
# Configuration
# --------------------------------------------------
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

try:
    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    print("Embedding model loaded successfully.")
except Exception as e:
    raise RuntimeError(
        f"Failed to load embedding model '{MODEL_NAME}'."
    ) from e

# --------------------------------------------------
# Single Text Embedding
# --------------------------------------------------
def embed_text(text: str) -> list:
    if not isinstance(text, str):
        raise TypeError("Input text must be a string.")
    if not text.strip():
        raise ValueError("Input text cannot be empty.")
    try:
        embedding = model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.tolist()
    except Exception as e:
        raise RuntimeError("Failed to generate embedding.") from e

# --------------------------------------------------
# Batch Chunk Embedding
# --------------------------------------------------
def embed_chunks(chunks: list) -> list:
    if not isinstance(chunks, list):
        raise TypeError("Chunks must be a list.")
    if len(chunks) == 0:
        return []

    texts = []
    for i, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            raise TypeError(f"Chunk {i} must be a dictionary.")
        if "text" not in chunk:
            raise KeyError(f"Chunk {i} missing 'text' field.")
        texts.append(chunk["text"])

    try:
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=True
        )
        for chunk, embedding in zip(chunks, embeddings):
            chunk["embedding"] = embedding.tolist()
        return chunks
    except Exception as e:
        raise RuntimeError(
            "Failed to generate chunk embeddings."
        ) from e
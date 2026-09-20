"""
Vexadoc — Embedder
Converts text chunks into vector embeddings using Sentence Transformers.

Features:
- Lazy loading (PyTorch/SentenceTransformers imported only on first query)
- Explicit CPU device placement
- Batch embedding
- Input validation & error handling
"""

import os

_model = None


def _get_model():
    """
    Lazy loader for the SentenceTransformer model.
    Deferred import prevents loading PyTorch into RAM during app startup.
    """
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        try:
            print(f"Loading embedding model ({model_name}) on CPU...")
            _model = SentenceTransformer(model_name, device="cpu")
            print("Embedding model loaded successfully.")
        except Exception as e:
            raise RuntimeError(
                f"Failed to load embedding model '{model_name}'."
            ) from e
    return _model


def embed_text(text: str) -> list:
    if not isinstance(text, str):
        raise TypeError("Input text must be a string.")
    if not text.strip():
        raise ValueError("Input text cannot be empty.")

    try:
        model = _get_model()
        embedding = model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.tolist()
    except Exception as e:
        raise RuntimeError("Failed to generate embedding.") from e


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
        model = _get_model()
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        for chunk, embedding in zip(chunks, embeddings):
            chunk["embedding"] = embedding.tolist()
        return chunks
    except Exception as e:
        raise RuntimeError(
            "Failed to generate chunk embeddings."
        ) from e

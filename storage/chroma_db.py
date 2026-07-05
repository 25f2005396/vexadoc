"""
Vexadoc — ChromaDB Client
Handles connection and collection management.
ChromaDB stores vectors locally — no Docker needed.
Data persists in: data/chroma_db/
"""

import os
import chromadb
from chromadb.config import Settings

# ── Configuration ─────────────────────────────────────────────
CHROMA_PATH = os.getenv("CHROMA_PATH", "data/chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "vexadoc")


def get_client():
    """
    Create and return a persistent ChromaDB client.
    Data is saved to disk at CHROMA_PATH.
    """
    client = chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False)
    )
    return client


def get_collection(client=None):
    """
    Get or create the main Vexadoc collection.
    Creates it automatically if it doesn't exist yet.
    """
    if client is None:
        client = get_client()

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def get_collection_stats() -> dict:
    """
    Return basic stats about the collection.
    Useful for admin dashboard later.
    """
    return {
        "collection_name": COLLECTION_NAME,
        "total_chunks": collection.count(),
        "chroma_path": CHROMA_PATH,
    }


# ── Singleton — reused across the entire app ──────────────────
client = get_client()
collection = get_collection(client)
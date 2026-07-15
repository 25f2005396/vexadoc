"""
Vexadoc — Prompt Builder
Assembles retrieved chunks into a clean prompt for the LLM.
"""


def build_prompt(query: str, chunks: list) -> str:
    """
    Build a RAG prompt from the user query and retrieved chunks.
    Strictly document-grounded — LLM only answers from context.

    Args:
        query:  The user's question
        chunks: List of chunk dicts from retrieval

    Returns:
        Formatted prompt string ready to send to the LLM
    """
    if not chunks:
        return f"""You are Vexadoc, an enterprise document assistant.

The user asked: {query}

No relevant documents were found in the knowledge base.
Politely tell the user no relevant information was found and suggest
they check if the relevant documents have been uploaded.
"""

    context_parts = []
    for i, chunk in enumerate(chunks):
        meta = chunk.get("metadata", {})
        file_name = meta.get("file_name", "Unknown")
        page_number = meta.get("page_number", "?")
        similarity = chunk.get("similarity", 0)

        context_parts.append(
            f"[Source {i+1}] {file_name} — Page {page_number} "
            f"(similarity: {similarity:.3f})\n{chunk.get('text', '')}"
        )

    context = "\n\n".join(context_parts)

    return f"""You are Vexadoc, an intelligent enterprise document assistant.
Your job is to answer questions strictly based on the provided document context.

Rules:
- Answer ONLY using the provided context.
- Do NOT use outside knowledge.
- If the answer is not completely supported by the context, say:
  "I couldn't find that information in the uploaded documents."
- Cite every factual statement using [Source N].
- Be concise and professional.

Context:
{context}

Question: {query}

Answer:"""


def build_general_knowledge_prompt(query: str) -> str:
    """
    Build a prompt for answering from general AI knowledge
    when no relevant document context is available.
    Used when use_general_ai is True and no chunks are retrieved.

    Args:
        query: The user's question

    Returns:
        Formatted prompt string for general knowledge answering
    """
    return f"""You are Vexadoc AI, a helpful and knowledgeable assistant.

No relevant information was found in the user's uploaded documents.

Answer the user's question using your own general knowledge.

Requirements:
- Clearly mention that this answer is based on general AI knowledge.
- Do not claim the information came from the uploaded documents.
- Be accurate, concise, and helpful.
- If you are unsure, say so instead of making up information.

Question:
{query}

Answer:
"""
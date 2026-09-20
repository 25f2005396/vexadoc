"""
Vexadoc — Prompt Builder
Modes: documents, ai, hybrid, document summary (documents + hybrid)
Supports multi-turn conversation history.
"""

from typing import List, Optional, Union, Any


def _format_history(history: Optional[List[Any]], max_messages: int = 10) -> str:
    """
    Format previous conversation turns into a clean context block.
    Supports both Pydantic models (ChatMessage) and raw dicts.
    """
    if not history:
        return ""

    # Keep the most recent turns to stay within context limits
    recent = history[-max_messages:]
    formatted = []

    for msg in recent:
        if hasattr(msg, "role") and hasattr(msg, "content"):
            role = msg.role
            content = msg.content
        elif isinstance(msg, dict):
            role = msg.get("role", "user")
            content = msg.get("content", "")
        else:
            continue

        role_name = "User" if role == "user" else "Assistant"
        # Truncate overly long single messages in history if needed
        clean_content = content.strip()
        if clean_content:
            formatted.append(f"{role_name}: {clean_content}")

    if not formatted:
        return ""

    return "\n\nConversation History (for context):\n" + "\n".join(formatted) + "\n"


def build_prompt(query: str, chunks: list, history: Optional[List[Any]] = None) -> str:
    """
    Documents Only mode.
    LLM answers from document context + conversation history, can infer when not explicitly stated.
    """
    history_str = _format_history(history)

    if not chunks:
        return f"""You are Vexadoc, an enterprise document assistant.
{history_str}
Current Question: {query}

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
Your job is to answer questions based on the provided document context and prior conversation context.

Rules:
- Prioritize information directly stated in the context.
- If the exact answer is not stated but can be reasonably inferred
  from the context, provide that inference and clearly say
  "Based on the document, it can be inferred that..."
- If the answer truly cannot be found or inferred, say:
  "I couldn't find that information in the uploaded documents."
- Use the conversation history to understand follow-up questions and pronouns (e.g. "it", "they", "step 2").
- Cite every factual statement using [Source N].
- Be concise and helpful.

Document Context:
{context}
{history_str}
Current Question: {query}

Answer:"""


def build_ai_prompt(query: str, history: Optional[List[Any]] = None) -> str:
    """
    AI Knowledge mode.
    Direct LLM — no document context, behaves like ChatGPT with memory.
    """
    history_str = _format_history(history)

    return f"""You are Vexadoc AI, a helpful and knowledgeable assistant.

The user has selected AI Knowledge mode.
{history_str}
Answer using your general knowledge and previous conversation context.

Requirements:
- Be accurate and concise.
- If you are unsure, say so.
- Do not mention uploaded documents.
- Format the answer clearly.

Current Question:
{query}

Answer:
"""


def build_hybrid_prompt(query: str, chunks: list, history: Optional[List[Any]] = None) -> str:
    """
    Hybrid mode.
    Uses documents as primary source, supplements with AI knowledge and conversational context.
    """
    if not chunks:
        return build_ai_prompt(query, history=history)

    history_str = _format_history(history)

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

    return f"""You are Vexadoc AI, an intelligent assistant with access to
both uploaded documents and general knowledge.

Instructions:
- Use the uploaded documents as your PRIMARY source.
- Refer to the conversation history when answering follow-up queries.
- After answering from the document, always add a section called
  "💡 Suggestions & Insights" where you provide:
  * Improvements or additions the user could consider
  * Related topics they might want to explore
  * Any gaps or areas that could be expanded
  * Practical next steps based on the document content
- You MAY supplement with general AI knowledge if it adds useful context.
- Do NOT contradict the documents with general knowledge.
- Clearly label document information as:
  "According to the uploaded document:"
- Clearly label suggestions as:
  "💡 Suggestions & Insights:"
- Cite document sources using [Source N].
- Be helpful, professional, and constructive.

Document Context:
{context}
{history_str}
Current Question: {query}

Answer:"""


def _format_chunks_for_summary(chunks: list) -> str:
    """
    Join ordered chunks into a single labeled block of document text
    for summarization, reusing the same [Source N] / file_name / page_number
    labeling style as the QA prompts so citations stay consistent.
    """
    parts = []
    for i, chunk in enumerate(chunks):
        meta = chunk.get("metadata", {})
        file_name = meta.get("file_name", "Unknown")
        page_number = meta.get("page_number", "?")

        parts.append(
            f"[Source {i+1}] {file_name} — Page {page_number}\n{chunk.get('text', '')}"
        )
    return "\n\n".join(parts)


def _estimate_page_count(chunks: list) -> int:
    """
    Best-effort estimate of document length in pages.
    """
    pages = set()
    for chunk in chunks:
        page_number = (chunk.get("metadata") or {}).get("page_number")
        if isinstance(page_number, int):
            pages.add(page_number)
    return len(pages) if pages else len(chunks)


def build_document_summary_prompt(chunks: list) -> str:
    """
    Documents Only mode — dedicated summary prompt.
    """
    if not chunks:
        return """You are Vexadoc, an enterprise document assistant.

No document content was found to summarize.
Politely tell the user no uploaded document is available to
summarize and suggest they upload a PDF or DOCX document first.
"""

    context = _format_chunks_for_summary(chunks)
    page_count = _estimate_page_count(chunks)

    return f"""You are Vexadoc, an intelligent enterprise document assistant.
You have been given the full extracted content of a single uploaded
document, broken into ordered, labeled source chunks (approximately
{page_count} page(s) of content). Your job is to summarize this
document clearly and comprehensively for someone who has not read it.

Using ONLY the information in the document context below, produce a
structured summary with EXACTLY these section headings, in this order:

1. **Document Type** — Identify the type of document and its title if
   identifiable. If neither is clear, say so briefly.
2. **Purpose** — What is this document for? Why was it written?
3. **Main Topics** — The major topics or themes covered.
4. **Important Sections** — Any notable sections, headings, or
   structural parts worth calling out.
5. **Key Points** — The most important facts, findings, figures, or
   statements, as a bullet list. Cite each using [Source N].
6. **Overall Summary** — A narrative summary that ties everything
   together.

Adjust depth to document length:
- If the document is short (roughly 1-3 pages), go into more detail in
  each section — don't compress information unnecessarily.
- If the document is long, keep each section tight and treat "Overall
  Summary" as a concise executive summary rather than a full recap.
- If the document is extremely short or primarily consists of
  structured fields, summarize only the meaningful information.

Adapt to the document's actual type (Form, Resume/CV, Research Paper, Legal Document, Notes, General Report).
Only add an Actionable Insights / Recommendations section if genuine.

Rules:
- Do not invent information that is not present in the document context.
- Ground every factual statement in the source chunks and cite it using [Source N].
- Be thorough but concise.

Document Context:
{context}

Now produce the structured summary described above."""


def build_hybrid_document_summary_prompt(chunks: list) -> str:
    """
    Hybrid mode — dedicated summary prompt.
    """
    if not chunks:
        return """You are Vexadoc AI, an intelligent assistant.

No document content was found to summarize.
Politely tell the user no uploaded document is available to
summarize and suggest they upload a PDF or DOCX document first.
"""

    context = _format_chunks_for_summary(chunks)
    page_count = _estimate_page_count(chunks)

    return f"""You are Vexadoc AI, an intelligent assistant with access to
both uploaded documents and general knowledge. You have been given the
full extracted content of a single uploaded document, broken into
ordered, labeled source chunks (approximately {page_count} page(s) of
content).

Structure your ENTIRE response into exactly two top-level sections, in
this order, using these exact headings:

📄 Document Summary
...
💡 Additional Context
...

--- 📄 Document Summary ---
Using ONLY the information in the document context below, produce a
structured summary with EXACTLY these section headings, in this order:

1. **Document Type** — type of document and title if identifiable.
2. **Purpose** — what the document is for.
3. **Main Topics** — the major topics or themes covered.
4. **Important Sections** — notable sections/headings worth calling out.
5. **Key Points** — bullet list of the most important facts, findings,
   or statements. Cite each using [Source N].
6. **Overall Summary** — a narrative summary tying everything together.

Adjust depth to document length and document type.
Every statement in this section must be grounded in the document
context and cited with [Source N].

--- 💡 Additional Context ---
Here you may add general/background knowledge that helps the reader
understand the document better — industry context, related concepts,
gaps worth noting, or practical next steps. Only include this section
if it genuinely adds value. Do not repeat the summary.

Document Context:
{context}

Now produce the two-section output described above, using the exact
headings "📄 Document Summary" and "💡 Additional Context"."""
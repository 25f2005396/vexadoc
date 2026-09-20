/**
 * Vexadoc — API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TIMEOUT_MS = 60000; // 60 seconds for LLM responses

// ── Types ──────────────────────────────────────────────────────

export type AnswerMode = "documents" | "ai" | "hybrid";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Citation {
  source_number: number;
  file_name: string;
  page_number: number | null;
  similarity: number;
  document_id: string | null;
  chunk_index: number | null;
}

export interface QueryResponse {
  query: string;
  answer: string;
  citations: Citation[];
  chunks_used: number;
  provider: string;
  answer_source: "documents" | "ai" | "hybrid" | "not_found";
}

export interface Document {
  document_id: string;
  file_name: string;
  file_type: string;
  source_type: string;
  uploaded_at: string;
}

export interface IngestResponse {
  document_id: string;
  file_name: string;
  chunks_saved: number;
  status: string;
}

export interface StreamQueryMeta {
  citations: Citation[];
  answer_source: QueryResponse["answer_source"];
}

export interface QueryDocumentsStreamParams {
  query: string;
  history?: ChatMessage[];
  topK?: number;
  mode?: AnswerMode;
  documentId?: string | null;
  signal?: AbortSignal | null;
  onToken: (token: string) => void;
  onDone?: (meta: StreamQueryMeta) => void;
}

// ── Helper ─────────────────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const err = await response.json();
        message = err.detail || message;
      } catch {}
      throw new Error(message);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export const STREAM_METADATA_MARKER = "\u241E__VEXADOC_STREAM_META__\u241E";

// ── API Functions ──────────────────────────────────────────────

export async function queryDocuments(
  query: string,
  history: ChatMessage[] = [],
  top_k: number = 5,
  mode: AnswerMode = "documents",
  document_id: string | null = null
): Promise<QueryResponse> {
  const response = await apiFetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      history,
      top_k,
      source_type: "admin",
      mode,
      document_id,
    }),
  });
  return response.json();
}

export async function queryDocumentsStream({
  query,
  history = [],
  topK = 5,
  mode = "documents",
  documentId = null,
  signal = null,
  onToken,
  onDone,
}: QueryDocumentsStreamParams): Promise<void> {
  const controller = new AbortController();

  // If external stop signal fires, abort our internal controller too
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort());
    }
  }

  // Idle timeout: reset on every chunk received
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  };
  resetIdleTimer();

  let pending = "";
  let metadataRaw: string | null = null;

  const processDecodedText = (text: string) => {
    if (!text) return;

    if (metadataRaw !== null) {
      metadataRaw += text;
      return;
    }

    pending += text;

    const markerIndex = pending.indexOf(STREAM_METADATA_MARKER);
    if (markerIndex !== -1) {
      const content = pending.slice(0, markerIndex);
      if (content) onToken(content);
      metadataRaw = pending.slice(markerIndex + STREAM_METADATA_MARKER.length);
      pending = "";
      return;
    }

    const safeLength = Math.max(
      0,
      pending.length - STREAM_METADATA_MARKER.length
    );

    if (safeLength > 0) {
      onToken(pending.slice(0, safeLength));
      pending = pending.slice(safeLength);
    }
  };

  try {
    const response = await fetch(`${API_BASE}/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        history,
        top_k: topK,
        source_type: "admin",
        mode,
        document_id: documentId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const err = await response.json();
        message = err.detail || message;
      } catch {}
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error("Streaming is not supported in this browser/environment.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      resetIdleTimer();
      processDecodedText(decoder.decode(value, { stream: true }));
    }

    processDecodedText(decoder.decode());

    if (metadataRaw === null && pending) {
      onToken(pending);
      pending = "";
    }

    if (onDone) {
      let citations: Citation[] = [];
      let answer_source: QueryResponse["answer_source"] = "documents";

      if (metadataRaw) {
        try {
          const parsed = JSON.parse(metadataRaw);
          if (Array.isArray(parsed.citations)) citations = parsed.citations;
          if (parsed.answer_source) answer_source = parsed.answer_source;
        } catch {}
      }

      onDone({ citations, answer_source });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    throw err;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

export async function uploadDocument(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

export async function listDocuments(): Promise<Document[]> {
  const response = await apiFetch(`${API_BASE}/documents`);
  return response.json();
}

export async function deleteDocument(document_id: string): Promise<void> {
  await apiFetch(`${API_BASE}/documents/${document_id}`, {
    method: "DELETE",
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await apiFetch(`${API_BASE}/health`);
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
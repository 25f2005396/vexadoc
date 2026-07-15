/**
 * Vexadoc — API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TIMEOUT_MS = 60000; // 60 seconds for LLM responses

// ── Types ──────────────────────────────────────────────────────

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
  answer_source: "documents" | "general_ai" | "not_found";
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

// ── API Functions ──────────────────────────────────────────────

export async function queryDocuments(
  query: string,
  top_k: number = 5,
  use_general_ai: boolean = false
): Promise<QueryResponse> {
  const response = await apiFetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      top_k,
      source_type: "admin",
      use_general_ai,
    }),
  });
  return response.json();
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
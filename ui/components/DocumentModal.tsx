/**
 * Vexadoc — Document Manager Modal
 * View, select, and delete indexed documents from ChromaDB.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Trash2, FileText, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { listDocuments, deleteDocument, Document } from "@/lib/api";
import toast from "react-hot-toast";

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocumentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onClearActiveDocument: () => void;
  onDocumentDeleted: (documentId: string) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function DocumentModal({
  isOpen,
  onClose,
  activeDocumentId,
  onSelectDocument,
  onClearActiveDocument,
  onDocumentDeleted,
}: DocumentModalProps) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await listDocuments();
      setDocs(data);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}" from the database?`)) {
      return;
    }

    setDeletingId(doc.document_id);
    try {
      await deleteDocument(doc.document_id);
      setDocs((prev) => prev.filter((d) => d.document_id !== doc.document_id));
      onDocumentDeleted(doc.document_id);
      toast.success(`Deleted "${doc.file_name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Document Manager</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage all uploaded documents indexed in ChromaDB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDocs}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[250px]">
          {loading && docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Loading documents...</span>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No documents found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Upload a PDF or DOCX file to begin indexing knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {docs.map((doc) => {
                const isActive = doc.document_id === activeDocumentId;
                const isDeleting = doc.document_id === deletingId;

                return (
                  <div
                    key={doc.document_id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50/60 border-blue-200"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className={`p-2.5 rounded-lg shrink-0 ${
                        isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {doc.file_name}
                          </p>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Uploaded on {formatDate(doc.uploaded_at)} • {doc.file_type.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <button
                          onClick={onClearActiveDocument}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Clear Active
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectDocument(doc)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Focus Doc
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete document from database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{docs.length} document{docs.length === 1 ? "" : "s"} indexed</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
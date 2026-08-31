/**
 * Vexadoc — Knowledge Toggle
 * Three independent answer modes:
 * - Documents: RAG pipeline, answers from uploaded files + citations
 * - AI:        Direct LLM, like ChatGPT, no retrieval
 * - Hybrid:    Documents first, supplements with AI knowledge
 * Future: add 🌐 Web Search as fourth mode.
 */

"use client";

import { AnswerMode } from "@/lib/api";

interface KnowledgeToggleProps {
  mode: AnswerMode;
  onChange: (mode: AnswerMode) => void;
}

export default function KnowledgeToggle({
  mode,
  onChange,
}: KnowledgeToggleProps) {
  const buttons: { value: AnswerMode; label: string }[] = [
    { value: "documents", label: "📄 Documents" },
    { value: "ai",        label: "🧠 AI" },
    { value: "hybrid",    label: "📚 Hybrid" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium hidden sm:block">
        Answer Mode:
      </span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        {buttons.map((btn, idx) => (
          <button
            key={btn.value}
            type="button"
            onClick={() => onChange(btn.value)}
            className={`px-3 py-1.5 transition-colors ${
              idx > 0 ? "border-l border-gray-200" : ""
            } ${
              mode === btn.value
                ? "bg-blue-600 text-white font-medium"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
/**
 * Vexadoc — Knowledge Toggle
 * Two-mode selector for knowledge source.
 * Future: add 🌐 Web Search as third mode.
 */

"use client";

interface KnowledgeToggleProps {
  useGeneralAI: boolean;
  onChange: (value: boolean) => void;
}

export default function KnowledgeToggle({
  useGeneralAI,
  onChange,
}: KnowledgeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium hidden sm:block">
        Knowledge Source:
      </span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 transition-colors ${
            !useGeneralAI
              ? "bg-blue-600 text-white font-medium"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          📄 Documents Only
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
            useGeneralAI
              ? "bg-blue-600 text-white font-medium"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          🌍 Documents + AI
        </button>
      </div>
    </div>
  );
}
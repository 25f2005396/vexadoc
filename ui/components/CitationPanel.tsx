/**
 * Vexadoc — Citation Panel
 * Displays the sources used to generate the answer.
 */

"use client";

import { Citation } from "@/lib/api";

interface CitationPanelProps {
  citations: Citation[];
}

export default function CitationPanel({ citations }: CitationPanelProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Sources
      </p>
      <div className="flex flex-col gap-1.5">
        {citations.map((c) => (
          <div
            key={`${c.file_name}-${c.page_number}`}
            className="flex items-center gap-2 text-xs text-gray-600
                       bg-gray-50 rounded-lg px-3 py-2"
          >
            <span className="font-semibold text-blue-600">
              [{c.source_number}]
            </span>
            <span className="font-medium">{c.file_name}</span>
            {c.page_number != null && (
              <span className="text-gray-400">— Page {c.page_number}</span>
            )}
            <span className="ml-auto text-gray-400">
              Similarity: {(c.similarity * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
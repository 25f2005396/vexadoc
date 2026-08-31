/**
 * Vexadoc — Chat Window
 * Displays the conversation history.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import CitationPanel from "./CitationPanel";
import { Citation } from "@/lib/api";
import { Copy, Check } from "lucide-react";

// ── Answer source config ───────────────────────────────────────
const answerSourceConfig = {
  documents: {
    label: "📄 From Documents",
    className: "bg-green-100 text-green-700",
  },
  ai: {
    label: "🧠 AI Knowledge",
    className: "bg-purple-100 text-purple-700",
  },
  hybrid: {
    label: "📚 Hybrid",
    className: "bg-blue-100 text-blue-700",
  },
  not_found: {
    label: "❌ No Match Found",
    className: "bg-gray-100 text-gray-500",
  },
} as const;

// ── Copy button ────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy response"
      className="flex items-center gap-1 text-xs text-gray-400
                 hover:text-gray-600 transition-colors duration-200"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-500">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// ── Types ──────────────────────────────────────────────────────
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  answer_source?: "documents" | "ai" | "hybrid" | "not_found";
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm
                                px-4 py-3 max-w-xl text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl
                                rounded-tl-sm px-4 py-3 max-w-2xl shadow-sm w-full">

                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-blue-600">
                        🤖 Vexadoc AI
                      </span>
                      {msg.answer_source && answerSourceConfig[msg.answer_source] && (
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${answerSourceConfig[msg.answer_source].className}`}>
                          {answerSourceConfig[msg.answer_source].label}
                        </span>
                      )}
                    </div>

                    {/* Copy button — only show when content exists */}
                    {msg.content && (
                      <CopyButton text={msg.content} />
                    )}
                  </div>

                  {/* Answer */}
                  {msg.content ? (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    /* Loading indicator — shown while streaming starts */
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-gray-400">
                        Vexadoc is generating a response...
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                             style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                             style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                             style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <CitationPanel citations={msg.citations} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
/**
 * Vexadoc — Chat Window
 * Displays the conversation history.
 */

"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import CitationPanel from "./CitationPanel";
import { Citation } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  provider?: string;
  answer_source?: "documents" | "general_ai" | "not_found";
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

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center
                      text-center px-6 text-gray-400">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          Ask anything about your documents
        </h2>
        <p className="text-sm max-w-sm">
          Upload a PDF or DOCX file, then ask questions.
          Vexadoc will find the answer and show you the source.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm
                                px-4 py-3 max-w-xl text-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl
                                rounded-tl-sm px-4 py-3 max-w-2xl shadow-sm">

                  {/* Header with source badge */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-blue-600">
                      🤖 Vexadoc AI
                    </span>

                    {msg.answer_source === "documents" && (
                      <span className="text-xs bg-green-100 text-green-700
                                       px-2 py-0.5 rounded-full">
                        📄 From Documents
                      </span>
                    )}

                    {msg.answer_source === "general_ai" && (
                      <span className="text-xs bg-purple-100 text-purple-700
                                       px-2 py-0.5 rounded-full">
                        🧠 General AI
                      </span>
                    )}

                    {msg.answer_source === "not_found" && (
                      <span className="text-xs bg-gray-100 text-gray-500
                                       px-2 py-0.5 rounded-full">
                        No Match Found
                      </span>
                    )}
                  </div>

                  {/* Answer with Markdown */}
                  <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Citations */}
                  {msg.citations && (
                    <CitationPanel citations={msg.citations} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl
                            rounded-tl-sm px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">
                Vexadoc is thinking...
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
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
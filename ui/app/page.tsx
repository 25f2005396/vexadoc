/**
 * Vexadoc — Main Chat Page
 */

"use client";

import { useState, useEffect, useRef } from "react";
import ChatWindow, { Message } from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import UploadButton from "@/components/UploadButton";
import KnowledgeToggle from "@/components/KnowledgeToggle";
import { queryDocuments, checkHealth } from "@/lib/api";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Welcome to Vexadoc! Upload a document and ask me anything about it.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [useGeneralAI, setUseGeneralAI] = useState(false);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Health check on page load ──────────────────────────────
  useEffect(() => {
    checkHealth().then(setIsOnline);
  }, []);

  // ── Notification with timer management ────────────────────
  const showNotification = (msg: string) => {
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }
    setNotification(msg);
    notificationTimer.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // ── Send message ───────────────────────────────────────────
  const handleSend = async (query: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await queryDocuments(query, 5, useGeneralAI);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        provider: response.provider,
        answer_source: response.answer_source,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: err instanceof Error
          ? `Error: ${err.message}`
          : "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (fileName: string) => {
    showNotification(`"${fileName}" uploaded and indexed successfully`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vexadoc</h1>
            <p className="text-xs text-gray-500">
              Ask anything. Know everything.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Backend status */}
            {isOnline !== null && (
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`} />
                <span className={isOnline ? "text-green-600" : "text-red-600"}>
                  {isOnline ? "Backend Online" : "Backend Offline"}
                </span>
              </span>
            )}

            {/* Knowledge toggle */}
            <KnowledgeToggle
              useGeneralAI={useGeneralAI}
              onChange={setUseGeneralAI}
            />

            {/* Upload */}
            <UploadButton onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-2">
          <p className="text-sm text-green-700 text-center">{notification}</p>
        </div>
      )}

      {/* Chat */}
      <ChatWindow messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />

    </div>
  );
}
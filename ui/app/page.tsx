/**
 * Vexadoc — Main Chat Page
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow, { Message } from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import UploadButton from "@/components/UploadButton";
import KnowledgeToggle from "@/components/KnowledgeToggle";
import { queryDocumentsStream, checkHealth, AnswerMode } from "@/lib/api";
import {
  Conversation,
  createConversation,
  deriveTitle,
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
} from "@/lib/conversations";
import toast from "react-hot-toast";

export default function Home() {
  // ── Conversations (persisted to localStorage) ──────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [mode, setMode] = useState<AnswerMode>("documents");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeDocumentName, setActiveDocumentName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Derived: the currently active conversation and its messages.
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  // ── Restore conversations from localStorage on load ────────
  useEffect(() => {
    const loaded = loadConversations();

    if (loaded.length === 0) {
      const fresh = createConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
      saveActiveConversationId(fresh.id);
    } else {
      setConversations(loaded);
      const savedActiveId = loadActiveConversationId();
      const stillExists =
        savedActiveId && loaded.some((c) => c.id === savedActiveId);
      const nextActiveId = stillExists ? (savedActiveId as string) : loaded[0].id;
      setActiveConversationId(nextActiveId);
      saveActiveConversationId(nextActiveId);
    }

    setHydrated(true);
  }, []);

  // ── Health check on page load ──────────────────────────────
  useEffect(() => {
    checkHealth().then(setIsOnline);
  }, []);

  // ── Auto-save conversations whenever they change ───────────
  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  // ── Persist which conversation is active ───────────────────
  useEffect(() => {
    if (!hydrated || !activeConversationId) return;
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId, hydrated]);

  // ── Stop generation ────────────────────────────────────────
  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  // ── Send message (streaming) ───────────────────────────────
  const handleSend = async (query: string) => {
    if (!activeConversationId) return;
    const convId = activeConversationId;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirstUserMessage = !c.messages.some((m) => m.role === "user");
        return {
          ...c,
          title: isFirstUserMessage ? deriveTitle(query) : c.title,
          messages: [...c.messages, userMessage, assistantMessage],
          updatedAt: Date.now(),
        };
      })
    );
    setIsLoading(true);

    let streamedContent = "";

    const updateAssistantMessage = (updates: Partial<Message>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, ...updates } : m
                ),
                updatedAt: Date.now(),
              }
        )
      );
    };

    try {
      await queryDocumentsStream({
        query,
        topK: 5,
        mode,
        documentId: activeDocumentId,
        signal: abortRef.current.signal,

        onToken: (token: string) => {
          streamedContent += token;
          updateAssistantMessage({ content: streamedContent });
        },

        onDone: (meta: { citations?: Message["citations"]; answer_source?: Message["answer_source"] }) => {
          updateAssistantMessage({
            citations: meta.citations,
            answer_source: meta.answer_source,
          });
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      updateAssistantMessage({
        content:
          streamedContent ||
          (err instanceof Error
            ? `Error: ${err.message}`
            : "Something went wrong. Please try again."),
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  // ── Upload success ─────────────────────────────────────────
  const handleUploadSuccess = (fileName: string, documentId: string) => {
    setActiveDocumentId(documentId);
    setActiveDocumentName(fileName);
    toast.success(`"${fileName}" is now the active document.`);
  };

  // ── New chat ───────────────────────────────────────────────
  const handleNewChat = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);

    const fresh = createConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveConversationId(fresh.id);
  };

  // ── Switch conversation ────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
  };

  // ── Pin / unpin a conversation ─────────────────────────────
  const handlePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  // ── Delete a conversation ──────────────────────────────────
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);

      if (id === activeConversationId) {
        if (next.length > 0) {
          setActiveConversationId(next[0].id);
        } else {
          const fresh = createConversation();
          setActiveConversationId(fresh.id);
          return [fresh];
        }
      }

      return next;
    });

    if (id === activeConversationId && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  // ── Share a conversation ───────────────────────────────────
  const handleShareConversation = (id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    toast.error(
      conversation
        ? `Sharing isn't set up yet — "${conversation.title}" wasn't shared.`
        : "Sharing isn't set up yet."
    );
  };

  // ── Rename a conversation ──────────────────────────────────
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: newTitle,
              updatedAt: Date.now(),
            }
          : c
      )
    );
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB]">

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onPinConversation={handlePinConversation}
        onDeleteConversation={handleDeleteConversation}
        onShareConversation={handleShareConversation}
        onRenameConversation={handleRenameConversation}
      />

      {/* Right side */}
      <div className="flex-1 min-w-0 flex flex-col h-full">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-5 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Vexadoc
              </h1>
              <p className="text-xs text-gray-400 mt-1.5">
                Ask anything. Know everything.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              {/* Active document indicator */}
              {activeDocumentName && (
                <span className="flex items-center gap-1.5 h-9 text-xs
                                 text-gray-600 bg-gray-50 border border-gray-200
                                 px-3.5 rounded-full transition-all duration-200 ease-in-out">
                  📄 {activeDocumentName}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocumentId(null);
                      setActiveDocumentName(null);
                      toast.success("Active document cleared.");
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1
                               transition-colors duration-200 ease-in-out"
                    aria-label="Clear active document"
                  >
                    ✕
                  </button>
                </span>
              )}

              {/* Answer mode toggle */}
              <KnowledgeToggle
                mode={mode}
                onChange={setMode}
              />

              {/* Upload */}
              <div className="sm:ml-auto">
                <UploadButton onUploadSuccess={handleUploadSuccess} />
              </div>

            </div>
          </div>
        </header>

        {/* Main workspace */}
        <main className="flex-1 min-h-0 px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex-1 min-h-0 bg-white border border-gray-200
                            rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {messages.length === 0 ? (

                <div className="flex-1 flex flex-col items-center justify-center
                                text-center px-6 py-12">

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200
                                  flex items-center justify-center mb-6 text-3xl">
                    📄
                  </div>

                  {/* Heading */}
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Welcome to Vexadoc
                  </h2>

                  {/* Subtitle */}
                  <p className="text-sm text-gray-400 max-w-xs mb-8">
                    Upload a document or start chatting with AI.
                  </p>

                  {/* Feature bullets */}
                  <div className="flex flex-col gap-3 text-left w-full max-w-xs">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-4 py-3">
                      <span className="text-base">📎</span>
                      <span className="text-sm text-gray-600">
                        Upload PDF or DOCX files
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-4 py-3">
                      <span className="text-base">💬</span>
                      <span className="text-sm text-gray-600">
                        Ask questions in plain English
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-4 py-3">
                      <span className="text-base">📌</span>
                      <span className="text-sm text-gray-600">
                        Get cited answers with sources
                      </span>
                    </div>
                  </div>

                </div>

              ) : (
                <ChatWindow messages={messages} isLoading={isLoading} />
              )}
            </div>
          </div>
        </main>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />

      </div>
    </div>
  );
}
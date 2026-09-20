/**
 * Vexadoc — Main Chat Page
 * Supports dark mode, mobile responsiveness, and keyboard shortcuts.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Menu, X, FolderOpen, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatWindow, { Message } from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import UploadButton from "@/components/UploadButton";
import KnowledgeToggle from "@/components/KnowledgeToggle";
import DocumentModal from "@/components/DocumentModal";
import { queryDocumentsStream, checkHealth, AnswerMode, ChatMessage, Document } from "@/lib/api";
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

  // ── State ──────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [mode, setMode] = useState<AnswerMode>("documents");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeDocumentName, setActiveDocumentName] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Derived: the currently active conversation and its messages.
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  // ── Initialize Theme on mount ──────────────────────────────
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("vexadoc-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (savedTheme !== "light" && prefersDark);
      setIsDarkMode(shouldBeDark);
      document.documentElement.classList.toggle("dark", shouldBeDark);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("vexadoc-theme", nextDark ? "dark" : "light");
  };

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
  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // ── New chat ───────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);

    const fresh = createConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveConversationId(fresh.id);
    setIsMobileSidebarOpen(false);
  }, []);

  // ── Global Keyboard Shortcuts ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K -> New Chat
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewChat();
        toast("New chat started (Ctrl+K)", { icon: "✨" });
      }

      // Ctrl+Shift+D / Cmd+Shift+D -> Toggle Document Manager
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDocModalOpen((prev) => !prev);
      }

      // Escape -> Close Modals / Stop Generation
      if (e.key === "Escape") {
        if (isDocModalOpen) {
          setIsDocModalOpen(false);
        } else if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
        } else if (isLoading) {
          handleStop();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewChat, handleStop, isDocModalOpen, isMobileSidebarOpen, isLoading]);

  // ── Send message (streaming) ───────────────────────────────
  const handleSend = async (query: string) => {
    if (!activeConversationId) return;
    const convId = activeConversationId;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

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
        history,
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

  // ── Document selection from manager modal ─────────────────
  const handleSelectDocument = (doc: Document) => {
    setActiveDocumentId(doc.document_id);
    setActiveDocumentName(doc.file_name);
    setIsDocModalOpen(false);
    toast.success(`Focused on "${doc.file_name}"`);
  };

  // ── Document deletion callback ─────────────────────────────
  const handleDocumentDeleted = (deletedId: string) => {
    if (activeDocumentId === deletedId) {
      setActiveDocumentId(null);
      setActiveDocumentName(null);
    }
  };

  // ── Switch conversation ────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setIsMobileSidebarOpen(false);
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
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">

      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex h-full">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onPinConversation={handlePinConversation}
          onDeleteConversation={handleDeleteConversation}
          onShareConversation={handleShareConversation}
          onRenameConversation={handleRenameConversation}
          onOpenDocuments={() => setIsDocModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Sliding Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-3.5 right-3.5 z-20">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onNewChat={handleNewChat}
              onSelectConversation={handleSelectConversation}
              onPinConversation={handlePinConversation}
              onDeleteConversation={handleDeleteConversation}
              onShareConversation={handleShareConversation}
              onRenameConversation={handleRenameConversation}
              onOpenDocuments={() => {
                setIsDocModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Right side workspace */}
      <div className="flex-1 min-w-0 flex flex-col h-full">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">

            {/* Top row: Title + Hamburger (mobile) + Theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                    Vexadoc
                  </h1>
                  <p className="text-xs text-gray-400">
                    Ask anything. Know everything.
                  </p>
                </div>
              </div>

              {/* Theme & Doc Manager Shortcut icons */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Document Manager (Ctrl+Shift+D)"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Controls Row: Mode toggle + Active Doc + Upload */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">

              {/* Active document indicator */}
              {activeDocumentName && (
                <span className="flex items-center gap-1.5 h-9 text-xs
                                 text-gray-600 bg-gray-50 border border-gray-200
                                 px-3 rounded-full truncate max-w-[200px] sm:max-w-xs transition-all duration-200">
                  <span className="truncate">📄 {activeDocumentName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocumentId(null);
                      setActiveDocumentName(null);
                      toast.success("Active document cleared.");
                    }}
                    className="text-gray-400 hover:text-gray-600 shrink-0 ml-1"
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

              {/* Upload Button */}
              <div className="sm:ml-auto">
                <UploadButton onUploadSuccess={handleUploadSuccess} />
              </div>

            </div>
          </div>
        </header>

        {/* Main chat workspace */}
        <main className="flex-1 min-h-0 px-3 py-4 sm:px-6 sm:py-6 overflow-hidden">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex-1 min-h-0 bg-white border border-gray-200
                            rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {messages.length === 0 ? (

                <div className="flex-1 flex flex-col items-center justify-center
                                text-center px-4 py-8 sm:py-12 overflow-y-auto">

                  {/* Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-200
                                  flex items-center justify-center mb-4 sm:mb-6 text-2xl sm:text-3xl">
                    📄
                  </div>

                  {/* Heading */}
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1.5">
                    Welcome to Vexadoc
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-gray-400 max-w-xs mb-6 sm:mb-8">
                    Upload a document or start chatting with AI.
                  </p>

                  {/* Feature bullets */}
                  <div className="flex flex-col gap-2.5 text-left w-full max-w-xs">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-3.5 py-2.5">
                      <span className="text-base">📎</span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        Upload PDF or DOCX files
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-3.5 py-2.5">
                      <span className="text-base">💬</span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        Ask questions in plain English
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100
                                    rounded-xl px-3.5 py-2.5">
                      <span className="text-base">📌</span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        Get cited answers with sources
                      </span>
                    </div>
                  </div>

                  {/* Keyboard shortcut tips on desktop */}
                  <div className="hidden sm:flex items-center gap-4 mt-8 text-[11px] text-gray-400">
                    <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">Ctrl+K</kbd> New Chat</span>
                    <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">Ctrl+Shift+D</kbd> Docs</span>
                    <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">Esc</kbd> Stop</span>
                  </div>

                </div>

              ) : (
                <ChatWindow messages={messages} isLoading={isLoading} />
              )}
            </div>
          </div>
        </main>

        {/* Input area */}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />

      </div>

      {/* Document Manager Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        activeDocumentId={activeDocumentId}
        onSelectDocument={handleSelectDocument}
        onClearActiveDocument={() => {
          setActiveDocumentId(null);
          setActiveDocumentName(null);
          toast.success("Active document cleared.");
        }}
        onDocumentDeleted={handleDocumentDeleted}
      />
    </div>
  );
}
/**
 * Vexadoc — Sidebar
 * Left navigation panel: conversation history (pinned/recent) + search.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Pin,
  Clock,
  MoreHorizontal,
  Pencil,
  Check,
  X,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { Conversation } from "@/lib/conversations";

function formatTimestamp(ms: number): string {
  const diff = Date.now() - ms;
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return "Yesterday";
  return `${Math.floor(diff / DAY)}d ago`;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isMenuOpen: boolean;
  onSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onAction: (action: "pin" | "share" | "delete" | "rename", conversation: Conversation, newTitle?: string) => void;
}

function ConversationItem({
  conversation,
  isActive,
  isMenuOpen,
  onSelect,
  onToggleMenu,
  onAction,
}: ConversationItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onAction("rename", conversation, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setRenameValue(conversation.title);
      setIsRenaming(false);
    }
  };

  return (
    <div
      className={`group relative w-full flex items-center gap-1 rounded-lg
                 border-l-2 py-2 pr-1.5 transition-all duration-200 ease-in-out
                 ${isActive
                   ? "bg-blue-100/70 border-blue-600"
                   : "border-transparent hover:bg-gray-100"
                 }`}
    >
      {isRenaming ? (
        <div className="flex-1 flex items-center gap-1 pl-2.5">
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            className="flex-1 text-sm bg-white border border-blue-400 rounded
                       px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button type="button" onClick={handleRenameSubmit}
            className="p-0.5 text-green-600 hover:text-green-700">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => { setRenameValue(conversation.title); setIsRenaming(false); }}
            className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(conversation.id)}
          aria-current={isActive ? "true" : undefined}
          title={conversation.title}
          className="flex-1 min-w-0 flex flex-col items-start gap-0.5 pl-2.5 text-left"
        >
          <span className={`text-sm font-medium truncate w-full ${
            isActive ? "text-blue-700" : "text-gray-700"
          }`}>
            {conversation.title}
          </span>
          <span className={`text-xs ${isActive ? "text-blue-500/70" : "text-gray-400"}`}>
            {formatTimestamp(conversation.updatedAt)}
          </span>
        </button>
      )}

      {!isRenaming && (
        <div className="relative shrink-0" data-conversation-menu>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleMenu(conversation.id); }}
            aria-label="Conversation actions"
            aria-expanded={isMenuOpen}
            className={`p-1 rounded-md transition-all duration-200 ease-in-out
                       hover:bg-gray-200
                       ${isMenuOpen ? "opacity-100 bg-gray-200" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border
                           border-gray-200 rounded-lg shadow-md py-1 z-10">
              <button type="button"
                onClick={() => { setIsRenaming(true); setRenameValue(conversation.title); onToggleMenu(conversation.id); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm
                           text-gray-700 hover:bg-gray-100 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button type="button"
                onClick={() => onAction("pin", conversation)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm
                           text-gray-700 hover:bg-gray-100 transition-colors">
                <>
                  <Pin className="w-3.5 h-3.5" />
                  {conversation.pinned ? "Unpin" : "Pin"}
                </>
              </button>
              <button type="button"
                onClick={() => onAction("share", conversation)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm
                           text-gray-700 hover:bg-gray-100 transition-colors">
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </>
              </button>
              <button type="button"
                onClick={() => onAction("delete", conversation)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm
                           text-red-600 hover:bg-red-50 transition-colors">
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onPinConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onShareConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onPinConversation,
  onDeleteConversation,
  onShareConversation,
  onRenameConversation,
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-conversation-menu]")) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const handleToggleMenu = (id: string) => {
    setOpenMenuId((current) => (current === id ? null : id));
  };

  const handleAction = (action: "pin" | "share" | "delete" | "rename", conversation: Conversation, newTitle?: string) => {
    if (action === "pin") onPinConversation(conversation.id);
    if (action === "share") onShareConversation(conversation.id);
    if (action === "delete") onDeleteConversation(conversation.id);
    if (action === "rename" && newTitle) onRenameConversation(conversation.id, newTitle);
    setOpenMenuId(null);
  };

  const query = searchValue.trim().toLowerCase();
  const filtered = query
    ? conversations.filter((c) => c.title.toLowerCase().includes(query))
    : conversations;

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const recent = filtered.filter((c) => !c.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="w-72 shrink-0 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold tracking-tight text-gray-900 mb-4">VexaDoc</h1>
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2.5
                     rounded-xl bg-blue-600 text-white text-sm font-medium
                     h-10 hover:bg-blue-700 hover:scale-[1.02]
                     transition-all duration-200 ease-in-out"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full h-9 rounded-full border border-gray-200 bg-gray-50
                       pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:bg-white focus:border-blue-400
                       focus:ring-4 focus:ring-blue-500/20
                       transition-all duration-200 ease-in-out"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
        {pinned.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
              <Pin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pinned</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {pinned.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  isMenuOpen={openMenuId === conversation.id}
                  onSelect={onSelectConversation}
                  onToggleMenu={handleToggleMenu}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {recent.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  isMenuOpen={openMenuId === conversation.id}
                  onSelect={onSelectConversation}
                  onToggleMenu={handleToggleMenu}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>
        )}

        {pinned.length === 0 && recent.length === 0 && (
          <div className="text-center mt-6 px-4">
            <p className="text-sm font-medium text-gray-500">
              No matching conversations
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Try a different keyword or create a new chat.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
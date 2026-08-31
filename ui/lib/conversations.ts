/**
 * Conversation persistence — localStorage only.
 *
 * A "Conversation" wraps the existing chat Message[] shape with the
 * metadata needed to list, restore, and title multiple chats.
 */

import { Message } from "@/components/ChatWindow";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

const CONVERSATIONS_KEY = "vexadoc:conversations";
export const ACTIVE_CONVERSATION_KEY = "vexadoc:activeConversationId";

/** Derive a short, human-readable title from the first user message. */
export function deriveTitle(firstUserContent: string): string {
  const trimmed = firstUserContent.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New chat";
  const MAX_LEN = 48;
  return trimmed.length > MAX_LEN
    ? `${trimmed.slice(0, MAX_LEN).trimEnd()}…`
    : trimmed;
}

/** Create a brand-new, empty conversation. */
export function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
}

/**
 * Load all saved conversations from localStorage.
 * Returns [] if nothing is saved, storage is unavailable, or the
 * saved data is malformed (so a bad/old payload never crashes the app).
 */
export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (c): c is Conversation =>
          !!c &&
          typeof c.id === "string" &&
          typeof c.title === "string" &&
          Array.isArray(c.messages) &&
          typeof c.createdAt === "number" &&
          typeof c.updatedAt === "number"
      )
      .map((c) => ({ ...c, pinned: !!c.pinned }));
  } catch {
    return [];
  }
}

/** Persist all conversations to localStorage. Fails silently (best-effort). */
export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // Storage full, disabled, or unavailable (e.g. private browsing).
    // Persistence is best-effort — don't break the app over it.
  }
}

/** Load the last-active conversation id, if any was saved. */
export function loadActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

/** Persist the currently active conversation id. */
export function saveActiveConversationId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  } catch {
    // best-effort, same as above
  }
}
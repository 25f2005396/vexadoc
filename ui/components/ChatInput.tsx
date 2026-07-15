/**
 * Vexadoc — Chat Input
 * The question input bar at the bottom of the chat.
 */

"use client";

import { useState, useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents..."
          rows={1}
          maxLength={4000}
          disabled={isLoading}
          aria-label="Question input"
          className="flex-1 resize-none rounded-xl border border-gray-300
           bg-white text-gray-900 placeholder:text-gray-400
           px-4 py-3 text-sm
           focus:outline-none focus:ring-2 focus:ring-blue-500
           disabled:opacity-50 disabled:cursor-not-allowed
           overflow-hidden min-h-[44px] max-h-[200px]"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          aria-label="Send question"
          className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors self-end"
        >
          {isLoading ? "Thinking..." : "Ask"}
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
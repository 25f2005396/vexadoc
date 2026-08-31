/**

 * Vexadoc — Chat Input

 * The question input bar at the bottom of the chat.

 */

"use client";

import { useState, useRef } from "react";

import { ArrowUp, Square } from "lucide-react";

interface ChatInputProps {

  onSend: (message: string) => void;

  onStop: () => void;

  isLoading: boolean;

}

export default function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {

  const [input, setInput] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {

    setInput(e.target.value);

    e.target.style.height = "auto";

    e.target.style.height = `${e.target.scrollHeight}px`;

  };

  const handleSend = () => {

    if (!input.trim() || isLoading) return;

    onSend(input.trim());

    setInput("");

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

    <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-6">

      <div className="max-w-4xl mx-auto">

        <div

          className="flex items-end gap-1.5 rounded-full bg-white

                     border border-gray-200 shadow-sm px-2 py-2

                     transition-all duration-200 ease-in-out

                     focus-within:border-blue-400 focus-within:shadow-md

                     focus-within:ring-4 focus-within:ring-blue-500/20"

        >

          <textarea

            ref={textareaRef}

            value={input}

            onChange={handleChange}

            onKeyDown={handleKeyDown}

            placeholder={

              isLoading

                ? "Generating answer..."

                : "Ask VexaDoc anything..."

            }

            rows={1}

            maxLength={4000}

            disabled={isLoading}

            aria-label="Question input"

            className="flex-1 resize-none bg-transparent border-none

                       text-gray-900 placeholder:text-gray-400 text-sm

                       leading-6 px-4 py-2.5

                       focus:outline-none focus:ring-0

                       disabled:opacity-50 disabled:cursor-not-allowed

                       overflow-hidden min-h-[24px] max-h-[200px]"

          />

          {isLoading ? (

            <button

              type="button"

              onClick={onStop}

              aria-label="Stop generating"

              className="shrink-0 flex items-center justify-center

                         w-10 h-10 sm:w-11 sm:h-11 rounded-full

                         bg-orange-500 text-white shadow-sm

                         hover:bg-orange-600 hover:scale-105

                         transition-all duration-200 ease-in-out"

            >

              <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />

            </button>

          ) : (

            <button

              type="button"

              onClick={handleSend}

              disabled={!input.trim()}

              aria-label="Send question"

              className="shrink-0 flex items-center justify-center

                         w-10 h-10 sm:w-11 sm:h-11 rounded-full

                         bg-blue-600 text-white shadow-sm

                         hover:bg-blue-700 hover:scale-105

                         disabled:opacity-40 disabled:cursor-not-allowed

                         disabled:hover:scale-100 disabled:hover:bg-blue-600

                         transition-all duration-200 ease-in-out"

            >

              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />

            </button>

          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-2">

          VexaDoc AI can make mistakes. Please verify important information.
          
        </p>

      </div>

    </div>

  );

}
"use client";

import React, { useState, useRef, useEffect } from "react";
import type { FinalReport } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_SUGGESTIONS = [
  "Can I afford a $450K house?",
  "What if I save for 6 more months?",
  "Show me the 15-year loan option",
  "What if rates drop to 5.5%?",
  "Compare a $350k vs $400k home",
  "Should I rent or buy?",
];

const FOLLOW_UP_PROMPTS = [
  [
    "What if I increase my down payment?",
    "How much can I save with a better credit score?",
    "Show me FHA vs Conventional comparison",
  ],
  [
    "What if my income increases 10%?",
    "How does a 15-year compare to 30-year?",
    "What are my closing costs?",
  ],
  [
    "What if I pay off my debts first?",
    "How much home can I afford at 5% rate?",
    "What's my break-even for rent vs buy?",
  ],
  [
    "What if I wait a year to buy?",
    "Can I afford a $500K home with HOA?",
    "What's the minimum I need saved?",
  ],
];

/** Render inline formatting: **bold**, $amounts, percentages */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(
    /(\*\*[^*]+\*\*|\$[\d,]+(?:\.\d+)?(?:\s*(?:\/mo|per month|per year))?|\d+(?:\.\d+)?%)/g
  );
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\$[\d,]/.test(part)) {
      return (
        <span key={i} className="font-semibold text-blue-700">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?%$/.test(part)) {
      return (
        <span key={i} className="font-semibold text-indigo-700">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Parse markdown-like text into structured elements */
function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let key = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1 pl-1 my-1.5">
          {currentList.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">
                &#8226;
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      continue;
    }

    // Heading: ## or ### or **bold line**
    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList();
      const cleaned = trimmed.replace(/^#{1,3}\s+/, "");
      elements.push(
        <p
          key={key++}
          className="text-sm font-semibold text-gray-900 mt-2 mb-0.5"
        >
          {renderInline(cleaned)}
        </p>
      );
      continue;
    }

    // Bullet: - or * or numbered
    if (/^\s*[-*]\s/.test(trimmed) || /^\s*\d+[.)]\s/.test(trimmed)) {
      const cleaned = trimmed
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, "");
      currentList.push(cleaned);
      continue;
    }

    flushList();
    elements.push(
      <p key={key++} className="text-sm leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return <>{elements}</>;
}

export default function ChatInterface({ report }: { report: FinalReport }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Block all wheel events from reaching the page
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
      // Only prevent default at boundaries to avoid trapping the scroll
      if (atTop || atBottom) {
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Pick follow-up prompts based on how many exchanges so far (cycle through sets)
  const exchangeCount = Math.floor(messages.length / 2);
  const followUpIndex = exchangeCount % FOLLOW_UP_PROMPTS.length;
  const currentFollowUps = FOLLOW_UP_PROMPTS[followUpIndex];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          report,
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-900">
          Ask Follow-Up Questions
        </h3>
        <p className="text-xs text-gray-500">
          Ask &quot;what if&quot; questions about your analysis.
        </p>
      </div>

      {/* Scrollable content area - isolated scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
      >
        {/* Initial suggestions (show when no messages) */}
        {messages.length === 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {INITIAL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-50 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-blue-600 text-white">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] rounded-2xl px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700">
                    {renderFormattedText(msg.content)}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up prompts after messages (always visible when not loading) */}
            {!isLoading && messages.length > 0 && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <p className="text-xs text-gray-400 mb-2">Ask next</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentFollowUps.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - pinned at bottom */}
      <form
        onSubmit={handleSubmit}
        className="px-3 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask a follow-up question..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

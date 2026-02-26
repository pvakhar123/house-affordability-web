"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { FinalReport } from "@/lib/types";
import type { SessionMemory } from "@/lib/chat-context";
interface Source {
  title: string;
  source: string;
  relevance: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  traceId?: string;
  sources?: Source[];
}

type Rating = "up" | "down" | null;

function ThumbButton({
  type,
  active,
  onClick,
}: {
  type: "up" | "down";
  active: boolean;
  onClick: () => void;
}) {
  const isUp = type === "up";
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-colors ${
        active
          ? isUp
            ? "text-green-600 bg-green-50"
            : "text-red-500 bg-red-50"
          : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
      }`}
      title={isUp ? "Helpful" : "Not helpful"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={isUp ? "" : "rotate-180"}
      >
        <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
    </button>
  );
}

/** Format a number as $XXXk */
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

interface CalculatorAction {
  icon: string;
  label: string;
  description: string;
  prompt: string;
}

function fmtMo(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildCalculatorActions(report: FinalReport, location: string): CalculatorAction[] {
  const aff = report.affordability;
  const rates = report.marketSnapshot?.mortgageRates;
  const maxPrice = aff?.recommendedHomePrice ?? 400000;
  const downPayment = aff?.downPaymentAmount ?? 60000;
  const loanAmount = aff?.loanAmount ?? maxPrice - downPayment;
  const rate30 = rates?.thirtyYearFixed ?? 6.5;
  const rate15 = rates?.fifteenYearFixed ?? rate30 - 0.7;
  const dtiBack = aff?.dtiAnalysis?.backEndRatio ?? 30;
  const monthlyTotal = aff?.monthlyPayment?.totalMonthly ?? 2000;
  const prop = report.propertyAnalysis;
  const rentVsBuy = report.rentVsBuy;

  const actions: CalculatorAction[] = [];

  // Stress Test — tailored by DTI
  if (dtiBack > 36) {
    actions.push({
      icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
      label: "Stress Test",
      description: `What if income drops 20% on ${fmtPrice(loanAmount)} loan?`,
      prompt: `Run a stress test on my ${fmtPrice(loanAmount)} loan at ${rate30.toFixed(1)}%. What happens if my income drops by 20%?`,
    });
  } else {
    actions.push({
      icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
      label: "Stress Test",
      description: `What if rates rise 2% on your ${fmtPrice(loanAmount)} loan?`,
      prompt: `Run a stress test: what happens if mortgage rates rise 2% on my ${fmtPrice(loanAmount)} loan at ${rate30.toFixed(1)}%?`,
    });
  }

  // Loan Comparison
  actions.push({
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    label: "Loan Comparison",
    description: `15yr at ${rate15.toFixed(1)}% vs 30yr at ${rate30.toFixed(1)}%`,
    prompt: `Compare a 15-year mortgage at ${rate15.toFixed(1)}% vs a 30-year at ${rate30.toFixed(1)}% for a ${fmtPrice(maxPrice)} home with ${fmtPrice(downPayment)} down. Show me the monthly payment difference and total interest savings.`,
  });

  // Rent vs Buy
  const rentAmount = rentVsBuy?.currentRent ?? Math.round(monthlyTotal * 0.7);
  actions.push({
    icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    label: "Rent vs Buy",
    description: `${fmtMo(rentAmount)}/mo rent vs buying at ${fmtPrice(maxPrice)}`,
    prompt: `Compare renting at ${fmtMo(rentAmount)} per month vs buying a ${fmtPrice(maxPrice)} home with ${fmtPrice(downPayment)} down at ${rate30.toFixed(1)}% over 7 years. Which is better financially?`,
  });

  // More Down Payment
  const higherDown = Math.round(downPayment * 1.33);
  actions.push({
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    label: "More Down Payment",
    description: `What if you put ${fmtPrice(higherDown)} down instead?`,
    prompt: `Recalculate my affordability if I increase my down payment from ${fmtPrice(downPayment)} to ${fmtPrice(higherDown)}. How does it change my max price, monthly payment, and PMI?`,
  });

  // Live Rates
  actions.push({
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    label: "Live Rates",
    description: "Today's rates and impact on your budget",
    prompt: "What are today's mortgage rates and how do they compare to when my analysis was run? How would current rates change my buying power?",
  });

  // Property Deep Dive (conditional)
  if (prop) {
    const addr = prop.property?.address || "the property";
    const price = prop.property?.listingPrice || maxPrice;
    actions.push({
      icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
      label: "Property Deep Dive",
      description: `Analyze ${typeof addr === "string" && addr.length > 25 ? addr.slice(0, 22) + "..." : addr}`,
      prompt: `Give me a detailed breakdown of whether I can afford ${addr} at ${fmtPrice(price)}. Include the monthly payment, how it compares to my max budget, and any risks.`,
    });
  }

  // Find Homes (conditional on location)
  if (location !== "your area") {
    actions.push({
      icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
      label: "Find Homes",
      description: `Homes under ${fmtPrice(maxPrice)} in ${location}`,
      prompt: `Find me homes for sale under ${fmtPrice(maxPrice)} in ${location}. Show me at least 3 listings with details.`,
    });
  }

  // Mortgage Knowledge (tailored to eligible loan options)
  const loanOptions = report.recommendations?.loanOptions;
  const hasFHA = loanOptions?.some((o) => o.type === "fha" && o.eligible);
  const hasVA = loanOptions?.some((o) => o.type === "va" && o.eligible);
  if (hasFHA) {
    actions.push({
      icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
      label: "FHA Loans",
      description: "You may qualify — learn the details",
      prompt: "Explain FHA loans in detail. What are the requirements, down payment minimums, mortgage insurance costs, and loan limits? Do I qualify based on my profile?",
    });
  } else if (hasVA) {
    actions.push({
      icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
      label: "VA Loans",
      description: "You may qualify — learn the details",
      prompt: "Explain VA loans in detail. What are the eligibility requirements, funding fees, and benefits compared to conventional loans? How does it affect my buying power?",
    });
  } else {
    actions.push({
      icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
      label: "PMI Explained",
      description: "When can you drop mortgage insurance?",
      prompt: "What is PMI, how much does it cost me monthly, and when can I remove it? What strategies can I use to avoid PMI sooner?",
    });
  }

  return actions;
}

/** Context-aware follow-up prompts that avoid repeating already-discussed topics */
function buildSmartFollowUps(
  report: FinalReport,
  location: string,
  messageTexts: string[],
): string[] {
  const aff = report.affordability;
  const rates = report.marketSnapshot?.mortgageRates;
  const maxPrice = aff?.recommendedHomePrice ?? 400000;
  const rate30 = rates?.thirtyYearFixed ?? 6.5;
  const loanAmount = aff?.loanAmount ?? maxPrice - (aff?.downPaymentAmount ?? 60000);

  const joined = messageTexts.join(" ").toLowerCase();
  const pool: string[] = [];

  if (!joined.includes("stress test"))
    pool.push(`Stress test my ${fmtPrice(loanAmount)} loan if rates rise 1.5%`);
  if (!joined.includes("15-year") && !joined.includes("15 year") && !joined.includes("compare"))
    pool.push(`Compare 15-year vs 30-year for my ${fmtPrice(maxPrice)} budget`);
  if (!joined.includes("rent"))
    pool.push("Should I rent or buy? Run a 7-year comparison");
  if (!joined.includes("find") && !joined.includes("search") && !joined.includes("homes for sale") && location !== "your area")
    pool.push(`Find homes under ${fmtPrice(maxPrice)} in ${location}`);
  if (!joined.includes("rate"))
    pool.push("What are today's mortgage rates?");
  if (!joined.includes("down payment"))
    pool.push("What if I increase my down payment by 33%?");
  if (!joined.includes("fha") && !joined.includes("va") && !joined.includes("conventional"))
    pool.push("What loan programs am I eligible for?");
  if (!joined.includes("pmi") && !joined.includes("mortgage insurance"))
    pool.push("When can I drop PMI?");
  if (location !== "your area" && !joined.includes("school") && !joined.includes("neighborhood"))
    pool.push(`What are schools and neighborhoods like in ${location}?`);
  if (!joined.includes("drop"))
    pool.push(`What if rates drop to ${Math.max(rate30 - 1, 4).toFixed(1)}%?`);

  return pool.slice(0, 3);
}

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

export default function ChatInterface({ report, userLocation, initialPrompt, reportId }: { report: FinalReport; userLocation?: string; initialPrompt?: string; reportId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(!reportId); // skip if no reportId
  const initialPromptSent = useRef(false);
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [sessionMemory, setSessionMemory] = useState<SessionMemory | null>(null);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [thinkingTools, setThinkingTools] = useState<string[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── CHAT HISTORY PERSISTENCE ──────────────────────────────
  // Load saved chat history on mount (only when reportId is provided)
  useEffect(() => {
    if (!reportId) return;
    fetch(`/api/saved-reports/${reportId}/chat`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages?.length) {
          setMessages(data.messages);
          if (data.conversationSummary) setConversationSummary(data.conversationSummary);
          if (data.sessionMemory) setSessionMemory(data.sessionMemory);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [reportId]);

  // Debounced save after each exchange completes
  const saveChatHistory = useCallback(
    (msgs: Message[], summary: string | null, memory: SessionMemory | null) => {
      if (!reportId || msgs.length === 0) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/saved-reports/${reportId}/chat`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs, conversationSummary: summary, sessionMemory: memory }),
        }).catch(() => {});
      }, 1000);
    },
    [reportId],
  );

  // Extract user context from the report
  const location = userLocation || "your area";

  const calculatorActions = useMemo(
    () => buildCalculatorActions(report, location),
    [report, location]
  );

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

  // Build smart follow-ups based on what's been discussed
  const messageTexts = messages.map((m) => m.content);
  const currentFollowUps = useMemo(
    () => buildSmartFollowUps(report, location, messageTexts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, location, messages.length]
  );

  const rateChatMessage = useCallback((messageIndex: number, rating: "up" | "down") => {
    setRatings((prev) => {
      const current = prev[messageIndex];
      const next = current === rating ? null : rating;
      const traceId = messages[messageIndex]?.traceId;
      const entry = { type: "chat", rating: next ?? "retracted", messageIndex, traceId, timestamp: new Date().toISOString() };
      // Fire-and-forget POST + cache client-side for admin dashboard
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => {});
      return { ...prev, [messageIndex]: next };
    });
  }, [messages]);

  // ── STREAMING MESSAGE SENDER ───────────────────────────────
  // Instead of waiting for the full JSON response, we read an SSE stream.
  //
  // How it works:
  //   1. POST to /api/chat → server returns Content-Type: text/event-stream
  //   2. We read chunks with fetch().body.getReader()
  //   3. Each SSE line is: data: {"text":"word"}\n\n
  //   4. We parse each chunk and append to the assistant message progressively
  //   5. Stream ends with: data: [DONE]\n\n
  //
  // The user sees text appear word-by-word instead of waiting 3-5 seconds.

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
          conversationSummary,
          sessionMemory,
        }),
      });

      // If the server returned a JSON error (not SSE), handle it
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      // Read the SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // Keep incomplete part in buffer

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6); // Remove "data: " prefix

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            // Handle thinking indicator (tool use in progress)
            if (parsed.thinking) {
              setThinkingTools(parsed.tools || null);
              continue;
            }

            // Handle context meta events (summary + memory + traceId + sources from server)
            if (parsed.meta) {
              if (parsed.meta.conversationSummary) {
                setConversationSummary(parsed.meta.conversationSummary);
              }
              if (parsed.meta.sessionMemory) {
                setSessionMemory(parsed.meta.sessionMemory);
              }
              if (parsed.meta.traceId || parsed.meta.sources) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    return [
                      ...updated.slice(0, -1),
                      {
                        ...last,
                        ...(parsed.meta.traceId ? { traceId: parsed.meta.traceId } : {}),
                        ...(parsed.meta.sources ? { sources: parsed.meta.sources } : {}),
                      },
                    ];
                  }
                  return updated;
                });
              }
              continue;
            }

            if (parsed.text) {
              setThinkingTools(null);
              if (!assistantAdded) {
                // First chunk — add the assistant message
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: parsed.text },
                ]);
                assistantAdded = true;
              } else {
                // Subsequent chunks — append to the existing assistant message
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    return [
                      ...updated.slice(0, -1),
                      { ...last, content: last.content + parsed.text },
                    ];
                  }
                  return updated;
                });
              }
            }
          } catch (e) {
            // Ignore JSON parse errors from incomplete chunks
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // If no text was streamed at all, show a fallback
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I wasn't able to generate a response. Please try again.",
          },
        ]);
      }
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
      setThinkingTools(null);
      inputRef.current?.focus();
      // Persist chat after each exchange
      setMessages((latest) => {
        saveChatHistory(latest, conversationSummary, sessionMemory);
        return latest;
      });
    }
  };

  // Auto-send initial prompt from external trigger (e.g. dashboard recommendation)
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current && !isLoading && historyLoaded && messages.length === 0) {
      initialPromptSent.current = true;
      sendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, historyLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Show loading dots only when waiting for the first chunk (no assistant message yet)
  const lastMessage = messages[messages.length - 1];
  const showLoadingDots =
    isLoading && (!lastMessage || lastMessage.role !== "assistant");

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col h-full" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0" style={{ background: "linear-gradient(to right, rgba(0,113,227,0.06), rgba(88,86,214,0.06))" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Ask Follow-Up Questions
          </h3>
          {reportId && messages.length > 0 && historyLoaded && (
            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
              Chat saved
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Ask &quot;what if&quot; questions about your analysis.
        </p>
      </div>

      {/* Scrollable content area - isolated scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
      >
        {/* Calculator actions (show when no messages) */}
        {messages.length === 0 && (
          <div className="px-4 py-4">
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
              Quick Calculators
            </p>
            <div className="grid grid-cols-2 gap-2">
              {calculatorActions.slice(0, 6).map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  disabled={isLoading}
                  className="text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                    </svg>
                    <span className="text-xs font-semibold text-gray-900 group-hover:text-blue-700">{action.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{action.description}</p>
                </button>
              ))}
            </div>
            {calculatorActions.length > 6 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {calculatorActions.slice(6).map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
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
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-white" style={{ background: "#0071e3" }}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <div className="rounded-2xl px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700">
                      {renderFormattedText(msg.content)}
                    </div>
                    {/* RAG source citations */}
                    {msg.sources && msg.sources.length > 0 && !(isLoading && i === messages.length - 1) && (
                      <div className="mt-1.5 ml-1 flex items-center gap-1.5 flex-wrap">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                        {msg.sources.map((s, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium" title={s.title}>
                            {s.source}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Thumbs up/down — only for completed responses (not while streaming) */}
                    {!(isLoading && i === messages.length - 1) && (
                      <div className="flex gap-1 mt-1 ml-2">
                        <ThumbButton type="up" active={ratings[i] === "up"} onClick={() => rateChatMessage(i, "up")} />
                        <ThumbButton type="down" active={ratings[i] === "down"} onClick={() => rateChatMessage(i, "down")} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots — only shown before first text chunk arrives */}
            {showLoadingDots && !thinkingTools && (
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

            {/* Tool execution indicator — shown while Claude processes tool results */}
            {thinkingTools && (
              <div className="flex justify-start">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-indigo-600 font-medium">
                    {thinkingTools.includes("lookup_mortgage_info") ? "Searching knowledge base" :
                     thinkingTools.includes("get_current_rates") ? "Fetching live rates" :
                     thinkingTools.includes("search_properties") ? "Searching properties" :
                     thinkingTools.includes("get_area_info") ? "Looking up area info" :
                     "Running calculations"}...
                  </span>
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
          className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:border-blue-500 disabled:opacity-50"
          style={{ "--tw-ring-color": "#0071e3" } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 text-white text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ background: "#0071e3" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

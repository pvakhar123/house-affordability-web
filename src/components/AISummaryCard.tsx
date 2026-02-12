"use client";

import { useState } from "react";

interface Props {
  summary: string;
}

/** Detect if a line looks like a bullet point */
function isBullet(line: string): boolean {
  return /^\s*[-*•]\s/.test(line) || /^\s*\d+[.)]\s/.test(line);
}

/** Detect if a line looks like a section heading */
function isHeading(line: string): boolean {
  return (
    /^#{1,3}\s/.test(line) ||
    (/^[A-Z][\w\s&,/-]{2,50}:?\s*$/.test(line.trim()) && line.trim().length < 60) ||
    /^\*\*[^*]+\*\*\s*:?\s*$/.test(line.trim())
  );
}

/** Strip markdown heading markers and bold wrappers */
function cleanHeading(line: string): string {
  return line.replace(/^#{1,3}\s+/, "").replace(/^\*\*(.+)\*\*/, "$1").replace(/:$/, "").trim();
}

/** Strip bullet marker from a line */
function cleanBullet(line: string): string {
  return line.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim();
}

/** Highlight dollar amounts and percentages in text */
function renderRichText(text: string): React.ReactNode[] {
  // Match **bold**, $amounts, and percentages
  const parts = text.split(/(\*\*[^*]+\*\*|\$[\d,]+(?:\.\d+)?(?:\s*(?:\/mo|per month|per year))?|\d+(?:\.\d+)?%)/g);

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
        <span key={i} className="ai-highlight-number">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?%$/.test(part)) {
      return (
        <span key={i} className="ai-highlight-number">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ParsedBlock {
  type: "paragraph" | "heading" | "bullets";
  content: string;
  items?: string[];
}

function parseBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];
  let currentBullets: string[] = [];
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", content: currentParagraph.join(" ") });
      currentParagraph = [];
    }
  }

  function flushBullets() {
    if (currentBullets.length > 0) {
      blocks.push({ type: "bullets", content: "", items: [...currentBullets] });
      currentBullets = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (isHeading(trimmed)) {
      flushParagraph();
      flushBullets();
      blocks.push({ type: "heading", content: cleanHeading(trimmed) });
      continue;
    }

    if (isBullet(trimmed)) {
      flushParagraph();
      currentBullets.push(cleanBullet(trimmed));
      continue;
    }

    // Regular text line
    flushBullets();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushBullets();

  return blocks;
}

export default function AISummaryCard({ summary }: Props) {
  const [expanded, setExpanded] = useState(false);
  const blocks = parseBlocks(summary);

  // Show first 3 blocks as preview, rest behind expand
  const previewCount = 3;
  const hasMore = blocks.length > previewCount;
  const visibleBlocks = expanded ? blocks : blocks.slice(0, previewCount);

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-[1px]">
        <div className="h-full w-full rounded-2xl bg-white" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="ai-summary-shimmer px-6 sm:px-8 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              {/* Subtle pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">AI Analysis</h3>
              <p className="text-xs text-gray-400 font-medium">Personalized insights from your data</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 sm:mx-8 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

        {/* Body */}
        <div className="px-6 sm:px-8 py-6 space-y-4">
          {visibleBlocks.map((block, i) => {
            const delayClass = i < 5 ? `ai-fade-in ai-fade-in-delay-${Math.min(i, 4)}` : "ai-fade-in";

            if (block.type === "heading") {
              return (
                <div key={i} className={`flex items-center gap-2 pt-2 ${delayClass}`}>
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    {block.content}
                  </h4>
                </div>
              );
            }

            if (block.type === "bullets") {
              return (
                <ul key={i} className={`space-y-2.5 ${delayClass}`}>
                  {block.items?.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 group">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors" />
                      <span className="text-sm leading-relaxed text-gray-600 group-hover:text-gray-800 transition-colors">
                        {renderRichText(item)}
                      </span>
                    </li>
                  ))}
                </ul>
              );
            }

            // Paragraph — first one gets special "lead" styling
            if (i === 0) {
              return (
                <p key={i} className={`text-[15px] leading-relaxed text-gray-700 font-medium ${delayClass}`}>
                  {renderRichText(block.content)}
                </p>
              );
            }

            return (
              <p key={i} className={`text-sm leading-relaxed text-gray-600 ${delayClass}`}>
                {renderRichText(block.content)}
              </p>
            );
          })}

          {/* Expand / Collapse */}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="group flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors pt-1"
            >
              {expanded ? "Show less" : `Read more`}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Fade overlay when collapsed */}
        {hasMore && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-2xl" />
        )}
      </div>
    </div>
  );
}

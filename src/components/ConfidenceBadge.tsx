"use client";

import type { DataConfidenceLevel } from "@/lib/types";

const styles: Record<DataConfidenceLevel, { bg: string; text: string; dot: string; label: string }> = {
  high: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Live data" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500", label: "Cached data" },
  low: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Estimated" },
};

export default function ConfidenceBadge({ level }: { level: DataConfidenceLevel }) {
  const s = styles[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

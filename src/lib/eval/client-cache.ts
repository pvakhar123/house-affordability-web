/**
 * Client-side localStorage cache for eval/judge/feedback data.
 *
 * On Vercel, /tmp is ephemeral per function invocation, so JSONL files
 * don't persist across separate GET requests. This cache bridges the gap:
 * writes save to both API + localStorage, reads merge API + localStorage.
 */

const KEYS = {
  evalRuns: "eval:runs",
  evalResults: "eval:results",
  judgeScores: "eval:judgeScores",
  feedback: "eval:feedback",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeGet(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeSet(key: string, data: any[]) {
  try {
    // Keep last 200 entries to avoid localStorage bloat
    localStorage.setItem(key, JSON.stringify(data.slice(-200)));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ── Eval runs + results ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheEvalRun(run: any, results: any[]) {
  const runs = safeGet(KEYS.evalRuns);
  runs.unshift(run);
  safeSet(KEYS.evalRuns, runs);

  const existing = safeGet(KEYS.evalResults);
  safeSet(KEYS.evalResults, [...results, ...existing]);
}

export function getCachedEvalData(): { runs: unknown[]; results: unknown[] } {
  return {
    runs: safeGet(KEYS.evalRuns),
    results: safeGet(KEYS.evalResults),
  };
}

// ── Judge scores ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheJudgeEntries(entries: any[]) {
  const existing = safeGet(KEYS.judgeScores);
  safeSet(KEYS.judgeScores, [...entries, ...existing]);
}

export function getCachedJudgeScores(): unknown[] {
  return safeGet(KEYS.judgeScores);
}

// ── Feedback ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheFeedbackEntry(entry: any) {
  const existing = safeGet(KEYS.feedback);
  existing.unshift(entry);
  safeSet(KEYS.feedback, existing);
}

export function getCachedFeedback(): unknown[] {
  return safeGet(KEYS.feedback);
}

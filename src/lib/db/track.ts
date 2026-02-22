import { isDbAvailable } from "./index";
import { insertUsageEvent, insertErrorLog, insertLlmCost } from "./queries";

// ── withTracking() — wrapper for standard (non-streaming) route handlers ──

type RouteHandler = (request: Request, ...args: unknown[]) => Promise<Response>;

export function withTracking(route: string, handler: RouteHandler): RouteHandler {
  return async (request: Request, ...args: unknown[]) => {
    const start = Date.now();
    let statusCode = 200;

    try {
      const response = await handler(request, ...args);
      statusCode = response.status;
      return response;
    } catch (error) {
      statusCode = 500;
      if (isDbAvailable) {
        insertErrorLog({
          route,
          method: request.method,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }).catch((e) => console.error("[track] Error log failed:", e));
      }
      throw error;
    } finally {
      if (isDbAvailable) {
        insertUsageEvent({
          route,
          method: request.method,
          statusCode,
          durationMs: Date.now() - start,
        }).catch((e) => console.error("[track] Usage log failed:", e));
      }
    }
  };
}

// ── Manual helpers for streaming routes (analyze, chat) ──

export function logApiError(
  route: string,
  method: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): void {
  if (!isDbAvailable) return;
  insertErrorLog({
    route,
    method,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata,
  }).catch((e) => console.error("[track] Error log failed:", e));
}

export function logUsageEvent(
  route: string,
  method: string,
  statusCode: number,
  durationMs: number,
  metadata?: Record<string, unknown>,
): void {
  if (!isDbAvailable) return;
  insertUsageEvent({
    route,
    method,
    statusCode,
    durationMs,
    metadata,
  }).catch((e) => console.error("[track] Usage log failed:", e));
}

// ── LLM cost logging ──

// Pricing per million tokens (USD)
const LLM_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  // Fallback for unknown models
  "default": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

function getPricing(model: string) {
  for (const prefix of Object.keys(LLM_PRICING)) {
    if (prefix !== "default" && model.startsWith(prefix)) return LLM_PRICING[prefix];
  }
  return LLM_PRICING["default"];
}

export function calculateLlmCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
): number {
  const p = getPricing(model);
  return (
    (inputTokens * p.input +
      outputTokens * p.output +
      cacheCreationTokens * p.cacheWrite +
      cacheReadTokens * p.cacheRead) / 1_000_000
  );
}

export function logLlmCost(
  traceName: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
): void {
  if (!isDbAvailable) return;
  const totalCost = calculateLlmCost(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);
  insertLlmCost({
    traceName,
    model,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalCost,
  }).catch((e) => console.error("[track] LLM cost log failed:", e));
}

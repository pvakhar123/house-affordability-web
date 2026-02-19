import { isDbAvailable } from "./index";
import { insertUsageEvent, insertErrorLog } from "./queries";

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

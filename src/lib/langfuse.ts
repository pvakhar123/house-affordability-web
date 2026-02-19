import { Langfuse } from "langfuse";
import type Anthropic from "@anthropic-ai/sdk";

// ─── Singleton Instance ────────────────────────────────────────
let instance: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!instance) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY ?? "";
    const secretKey = process.env.LANGFUSE_SECRET_KEY ?? "";
    const baseUrl = process.env.LANGFUSE_HOST ?? "https://us.cloud.langfuse.com";

    console.log("[langfuse] Initializing:", {
      hasPublicKey: !!publicKey,
      hasSecretKey: !!secretKey,
      baseUrl,
    });

    instance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
      flushAt: 1,          // flush after every event in serverless
      flushInterval: 1000,
    });
  }
  return instance;
}

// ─── Flush (MUST call at end of every API route in serverless) ──
export async function flushLangfuse(): Promise<void> {
  if (instance) {
    try {
      await instance.flushAsync();
      console.log("[langfuse] Flushed successfully");
    } catch (e) {
      console.error("[langfuse] Flush error:", e);
    }
  } else {
    console.warn("[langfuse] No instance to flush");
  }
}

// ─── Trace a non-streaming messages.create() call ───────────────
interface TraceGenerationInput {
  client: Anthropic;
  params: Anthropic.Messages.MessageCreateParamsNonStreaming;
  options?: { timeout?: number };
  trace: {
    name: string;
    traceId?: string;
    sessionId?: string;
    userId?: string;
  };
  metadata?: Record<string, unknown>;
}

export async function traceGeneration(
  input: TraceGenerationInput
): Promise<Anthropic.Messages.Message> {
  const langfuse = getLangfuse();
  const { client, params, options, trace, metadata } = input;

  // When traceId is provided, we're nesting under an existing trace — don't overwrite its name
  const langfuseTrace = trace.traceId
    ? langfuse.trace({ id: trace.traceId })
    : langfuse.trace({ name: trace.name, sessionId: trace.sessionId, userId: trace.userId, metadata });

  const generation = langfuseTrace.generation({
    name: trace.name,
    model: params.model,
    modelParameters: { max_tokens: params.max_tokens },
    input: {
      system: typeof params.system === "string" ? params.system?.slice(0, 500) : "[system]",
      messages: params.messages,
      toolCount: params.tools?.length ?? 0,
    },
    metadata,
  });

  const startTime = Date.now();
  try {
    const response = await client.messages.create(params, options ?? {});

    const usage = response.usage as unknown as Record<string, unknown>;
    generation.end({
      output: response.content,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      metadata: {
        stopReason: response.stop_reason,
        durationMs: Date.now() - startTime,
        cacheCreationTokens: usage.cache_creation_input_tokens,
        cacheReadTokens: usage.cache_read_input_tokens,
      },
    });

    return response;
  } catch (error) {
    generation.end({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : String(error),
      metadata: { durationMs: Date.now() - startTime },
    });
    throw error;
  }
}

// ─── Create trace + generation for streaming (caller controls lifecycle) ──
interface StreamTraceInput {
  name: string;
  model: string;
  maxTokens?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export function createStreamTrace(input: StreamTraceInput) {
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name: input.name,
    sessionId: input.sessionId,
    metadata: input.metadata,
  });

  return {
    traceId: trace.id,
    createGeneration(iterationName: string, genInput?: Record<string, unknown>) {
      const startTime = Date.now();
      const generation = trace.generation({
        name: iterationName,
        model: input.model,
        modelParameters: input.maxTokens ? { max_tokens: input.maxTokens } : undefined,
        input: genInput,
      });

      return {
        end(response: Anthropic.Messages.Message) {
          const usage = response.usage as unknown as Record<string, unknown>;
          generation.end({
            output: response.content,
            usage: {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            },
            metadata: {
              stopReason: response.stop_reason,
              durationMs: Date.now() - startTime,
              hadToolUse: response.content.some((b) => b.type === "tool_use"),
              cacheCreationTokens: usage.cache_creation_input_tokens,
              cacheReadTokens: usage.cache_read_input_tokens,
            },
          });
        },
        error(err: unknown) {
          generation.end({
            level: "ERROR",
            statusMessage: err instanceof Error ? err.message : String(err),
            metadata: { durationMs: Date.now() - startTime },
          });
        },
      };
    },
  };
}

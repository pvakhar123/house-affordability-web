import Anthropic from "@anthropic-ai/sdk";

export type ToolDefinition = Anthropic.Messages.Tool;

export abstract class BaseAgent<TInput, TOutput> {
  protected client: Anthropic;
  protected model: string;

  constructor(client: Anthropic, model: string = "claude-sonnet-4-20250514") {
    this.client = client;
    this.model = model;
  }

  abstract get systemPrompt(): string;
  abstract get tools(): ToolDefinition[];
  abstract parseResult(rawText: string): TOutput;
  protected abstract buildUserMessage(input: TInput): string;
  protected abstract handleToolCall(
    name: string,
    input: Record<string, unknown>
  ): Promise<string>;

  private async callWithRetry(
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    maxRetries = 2
  ): Promise<Anthropic.Messages.Message> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.messages.create(params, {
          timeout: 30000, // 30s per API call
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable =
          msg.includes("overloaded") ||
          msg.includes("529") ||
          msg.includes("rate_limit") ||
          msg.includes("500") ||
          msg.includes("503") ||
          msg.includes("timeout") ||
          msg.includes("ETIMEDOUT") ||
          msg.includes("ECONNRESET");

        if (!isRetryable || attempt === maxRetries) {
          throw err;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(
          `API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error("Unreachable");
  }

  async run(input: TInput): Promise<TOutput> {
    const userMessage = this.buildUserMessage(input);
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: userMessage },
    ];

    // Tool-use loop: keep calling tools until the model stops
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.callWithRetry({
        model: this.model,
        max_tokens: 4096,
        system: this.systemPrompt,
        messages,
        tools: this.tools,
      });

      // Collect all text and tool-use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        const finalText = textBlocks.map((b) => b.text).join("\n");
        return this.parseResult(finalText);
      }

      // Add the assistant's response to messages
      messages.push({ role: "assistant", content: response.content });

      // Process all tool calls and add results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await this.handleToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });

      // If the model signaled end_turn, try to extract final answer
      if (response.stop_reason === "end_turn") {
        const finalText = textBlocks.map((b) => b.text).join("\n");
        if (finalText.trim()) {
          return this.parseResult(finalText);
        }
      }
    }

    throw new Error(
      `Agent exceeded max iterations (${maxIterations}) without producing a result`
    );
  }
}

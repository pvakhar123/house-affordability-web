export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  fredApiKey: process.env.FRED_API_KEY ?? "",
  blsApiKey: process.env.BLS_API_KEY,
  rapidApiKey: process.env.RAPIDAPI_KEY,
  // Haiku for tool-calling agents (fast, rarely overloaded)
  model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
  // Sonnet for synthesis/writing tasks (better prose quality)
  summaryModel: process.env.CLAUDE_SUMMARY_MODEL ?? "claude-sonnet-4-5-20250929",
  // Fallback if primary models are overloaded
  fallbackModel: "claude-haiku-4-5-20251001",

  validate(): void {
    if (!this.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is required.");
    }
    if (!this.fredApiKey) {
      throw new Error("FRED_API_KEY is required.");
    }
  },
};

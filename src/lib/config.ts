export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  fredApiKey: process.env.FRED_API_KEY ?? "",
  blsApiKey: process.env.BLS_API_KEY,
  rapidApiKey: process.env.RAPIDAPI_KEY,
  model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",

  validate(): void {
    if (!this.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is required.");
    }
    if (!this.fredApiKey) {
      throw new Error("FRED_API_KEY is required.");
    }
  },
};

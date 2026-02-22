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
  // LLM-as-judge model (Haiku for cost efficiency)
  judgeModel: process.env.CLAUDE_JUDGE_MODEL ?? "claude-haiku-4-5-20251001",

  validate(): void {
    const missing: string[] = [];
    if (!this.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
    if (!this.fredApiKey) missing.push("FRED_API_KEY");
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  },
};

// Warn about optional-but-recommended secrets at startup (once)
if (typeof process !== "undefined" && process.env) {
  const warnings: string[] = [];
  if (!process.env.POSTGRES_URL) warnings.push("POSTGRES_URL (DB tracking disabled)");
  if (!process.env.AUTH_SECRET) warnings.push("AUTH_SECRET (auth will fail)");
  if (!process.env.AUTH_GOOGLE_ID) warnings.push("AUTH_GOOGLE_ID (Google OAuth disabled)");
  if (!process.env.MAPBOX_ACCESS_TOKEN) warnings.push("MAPBOX_ACCESS_TOKEN (address autocomplete disabled)");
  if (!process.env.LANGFUSE_SECRET_KEY) warnings.push("LANGFUSE_SECRET_KEY (observability disabled)");

  if (warnings.length > 0) {
    console.warn(`[config] Missing optional env vars: ${warnings.join(", ")}`);
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type ToolDefinition } from "./base-agent";
import {
  createMarketTools,
  handleMarketToolCall,
} from "../tools/market-tools";
import { FredApiClient } from "../services/fred-api";
import { BlsApiClient } from "../services/bls-api";
import { HousingApiClient } from "../services/housing-api";
import { CacheService } from "../services/cache";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import type { MarketDataResult } from "../types/index";

interface MarketDataInput {
  location?: string;
}

export class MarketDataAgent extends BaseAgent<
  MarketDataInput,
  MarketDataResult
> {
  private fredClient: FredApiClient;
  private blsClient: BlsApiClient;
  private housingClient: HousingApiClient | null;

  constructor(client: Anthropic) {
    super(client, config.model);
    const cache = new CacheService();
    this.fredClient = new FredApiClient(config.fredApiKey, cache);
    this.blsClient = new BlsApiClient(config.blsApiKey);
    this.housingClient = config.rapidApiKey
      ? new HousingApiClient(config.rapidApiKey, cache)
      : null;
  }

  get systemPrompt(): string {
    return PROMPTS.marketData;
  }

  get tools(): ToolDefinition[] {
    return createMarketTools();
  }

  protected buildUserMessage(input: MarketDataInput): string {
    let msg = `Fetch all current market data using the available tools. Call each tool to gather:
1. Current mortgage rates (30yr, 15yr, fed funds)
2. National median home prices and Case-Shiller index
3. Inflation data (shelter CPI and general)`;

    if (input.location) {
      msg += `\n4. Regional housing data for: ${input.location}`;
    }

    msg += `\n\nAfter gathering all data, return a complete JSON object matching this structure:
{
  "mortgageRates": { "thirtyYearFixed": number, "fifteenYearFixed": number, "federalFundsRate": number, "dataDate": string, "source": string },
  "medianHomePrices": { "national": number, "nationalNew": number, "caseShillerIndex": number, "dataDate": string, "regional": [...] },
  "marketTrends": [{ "metric": string, "currentValue": number, "previousValue": number, "changePercent": number, "direction": "up"|"down"|"flat", "period": string }],
  "inflationData": { "shelterCpiCurrent": number, "shelterCpiYearAgo": number, "shelterInflationRate": number, "generalInflationRate": number },
  "fetchedAt": "<current ISO timestamp>"
}`;
    return msg;
  }

  protected async handleToolCall(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return handleMarketToolCall(
      name,
      input,
      this.fredClient,
      this.blsClient,
      this.housingClient
    );
  }

  parseResult(rawText: string): MarketDataResult {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure fetchedAt exists
      parsed.fetchedAt = parsed.fetchedAt ?? new Date().toISOString();
      parsed.marketTrends = parsed.marketTrends ?? [];
      return parsed as MarketDataResult;
    }
    throw new Error("Failed to parse MarketDataResult from agent response");
  }
}

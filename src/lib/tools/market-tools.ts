import type Anthropic from "@anthropic-ai/sdk";
import { FredApiClient } from "../services/fred-api";
import { BlsApiClient } from "../services/bls-api";
import { HousingApiClient } from "../services/housing-api";

export function createMarketTools(): Anthropic.Messages.Tool[] {
  return [
    {
      name: "fetch_current_mortgage_rates",
      description:
        "Fetch current 30-year fixed, 15-year fixed mortgage rates and federal funds rate from FRED",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "fetch_median_home_prices",
      description:
        "Fetch national median home prices (existing and new construction) and Case-Shiller index from FRED",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "fetch_regional_housing_data",
      description:
        "Fetch regional housing data for a specific zip code or location",
      input_schema: {
        type: "object" as const,
        properties: {
          location: {
            type: "string",
            description: "Zip code or location to look up",
          },
        },
        required: ["location"],
      },
    },
    {
      name: "fetch_inflation_data",
      description:
        "Fetch shelter CPI and general inflation data from Bureau of Labor Statistics",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ];
}

export async function handleMarketToolCall(
  name: string,
  input: Record<string, unknown>,
  fredClient: FredApiClient,
  blsClient: BlsApiClient,
  housingClient: HousingApiClient | null
): Promise<string> {
  switch (name) {
    case "fetch_current_mortgage_rates": {
      const [rate30, rate15, fedFunds] = await Promise.all([
        fredClient.getMortgage30YRate(),
        fredClient.getMortgage15YRate(),
        fredClient.getFedFundsRate(),
      ]);
      return JSON.stringify({
        thirtyYearFixed: rate30.value,
        fifteenYearFixed: rate15.value,
        federalFundsRate: fedFunds.value,
        dataDate: rate30.date,
        source: "FRED (Federal Reserve Economic Data)",
      });
    }

    case "fetch_median_home_prices": {
      const [median, medianNew, caseShiller] = await Promise.all([
        fredClient.getMedianHomePrice(),
        fredClient.getMedianNewHomePrice(),
        fredClient.getCaseShillerIndex(),
      ]);
      return JSON.stringify({
        national: median.value * 1000, // FRED reports in thousands
        nationalNew: medianNew.value * 1000,
        caseShillerIndex: caseShiller.value,
        dataDate: median.date,
      });
    }

    case "fetch_regional_housing_data": {
      const location = input.location as string;
      if (!housingClient) {
        return JSON.stringify({
          error: "Regional data unavailable (no RAPIDAPI_KEY configured)",
          location,
        });
      }
      const data = await housingClient.getRegionalData(location);
      if (!data) {
        return JSON.stringify({
          error: "No regional data found for this location",
          location,
        });
      }
      return JSON.stringify(data);
    }

    case "fetch_inflation_data": {
      const shelter = await blsClient.getShelterInflation();
      const general = await blsClient.getGeneralInflation();
      return JSON.stringify({
        shelterCpiCurrent: shelter.current,
        shelterCpiYearAgo: shelter.yearAgo,
        shelterInflationRate: shelter.rate,
        generalInflationRate: general,
      });
    }

    default:
      throw new Error(`Unknown market tool: ${name}`);
  }
}

#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerCalculateAffordability } from "./tools/calculate-affordability.js";
import { registerAnalyzeProperty } from "./tools/analyze-property.js";
import { registerCompareScenarios } from "./tools/compare-scenarios.js";
import { registerStressTest } from "./tools/stress-test.js";
import { registerRentVsBuy } from "./tools/rent-vs-buy.js";
import { registerLookupMortgageInfo } from "./tools/lookup-mortgage-info.js";

const server = new McpServer({
  name: "home-affordability",
  version: "1.0.0",
});

// Register all tools
registerCalculateAffordability(server);
registerAnalyzeProperty(server);
registerCompareScenarios(server);
registerStressTest(server);
registerRentVsBuy(server);
registerLookupMortgageInfo(server);

// Start stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use stderr for diagnostics (stdout is the MCP protocol channel)
  console.error("Home Affordability MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

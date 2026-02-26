# MCP Implementation Guide — Home Affordability Calculator

This document covers all Model Context Protocol (MCP) work in the project: the standalone stdio server for Claude Desktop, the remote HTTP endpoint for claude.ai, and the live data tools integrated into the chat API.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Standalone Stdio MCP Server](#1-standalone-stdio-mcp-server)
3. [Remote HTTP MCP Endpoint](#2-remote-http-mcp-endpoint)
4. [Live Data Tools in Chat API](#3-live-data-tools-in-chat-api)
5. [Tool Reference](#tool-reference)
6. [Environment Variables](#environment-variables)
7. [Setup & Usage](#setup--usage)

---

## Architecture Overview

The project has three layers of AI tool integration:

```
┌──────────────────────────────────────────────────────────┐
│                    MCP Servers (6 tools)                  │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │  Stdio Server        │   │  Remote HTTP Endpoint    │  │
│  │  mcp-server/         │   │  /api/[transport]        │  │
│  │  Claude Desktop      │   │  claude.ai connector     │  │
│  │  @modelcontextpro... │   │  mcp-handler             │  │
│  └─────────────────────┘   └──────────────────────────┘  │
│                                                          │
│  Tools: calculate_affordability, analyze_property,       │
│         compare_scenarios, stress_test, rent_vs_buy,     │
│         lookup_mortgage_info                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              Chat API (9 tools = 6 MCP + 3 live)         │
│              /api/chat                                   │
│                                                          │
│  MCP tools (inline): recalculate_affordability,          │
│    calculate_payment_for_price, compare_scenarios,       │
│    stress_test, rent_vs_buy, analyze_property,           │
│    lookup_mortgage_info                                  │
│                                                          │
│  Live data tools:                                        │
│    get_current_rates  → FRED API                         │
│    search_properties  → Zillow/RapidAPI                  │
│    get_area_info      → Curated data (50 metros)         │
└──────────────────────────────────────────────────────────┘
```

Both MCP servers expose the **same 6 core tools** with identical logic. The chat API has a superset of 9 tools (the 6 core tools adapted for conversational use + 3 live data tools).

---

## 1. Standalone Stdio MCP Server

**Location:** `mcp-server/`

This is a self-contained Node.js package that runs as a local stdio process. It's designed for Claude Desktop and other MCP clients that support the stdio transport.

### Files

```
mcp-server/
├── package.json              # Separate package with own dependencies
├── tsconfig.json
└── src/
    ├── index.ts              # Entry point — creates McpServer, connects StdioServerTransport
    ├── lib/
    │   ├── financial-math.ts # Copied from main app's calculation utils
    │   └── retriever.ts      # Copied from main app's RAG retriever
    └── tools/
        ├── calculate-affordability.ts
        ├── analyze-property.ts
        ├── compare-scenarios.ts
        ├── stress-test.ts
        ├── rent-vs-buy.ts
        └── lookup-mortgage-info.ts
```

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.12.1",
  "zod": "^3.23.0"
}
```

### How It Works

```typescript
// mcp-server/src/index.ts
const server = new McpServer({ name: "home-affordability", version: "1.0.0" });

registerCalculateAffordability(server);
registerAnalyzeProperty(server);
registerCompareScenarios(server);
registerStressTest(server);
registerRentVsBuy(server);
registerLookupMortgageInfo(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

Each tool file exports a `register*` function that calls `server.tool(name, description, schema, handler)`.

### Build & Run

```bash
cd mcp-server
npm install
npm run build    # Compiles to dist/
npm start        # Runs on stdio
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "home-affordability": {
      "command": "node",
      "args": ["/path/to/house-affordability-web/mcp-server/dist/index.js"]
    }
  }
}
```

---

## 2. Remote HTTP MCP Endpoint

**Location:** `src/app/api/[transport]/route.ts`

This is a Next.js API route that serves the same 6 tools over HTTP, using the streamable-HTTP transport. It's designed for remote MCP clients like claude.ai's custom connector feature.

### How It Works

Uses the `mcp-handler` package, which wraps `@modelcontextprotocol/sdk` for Next.js:

```typescript
import { createMcpHandler } from "mcp-handler";

const handler = createMcpHandler(
  (server) => {
    server.tool("calculate_affordability", "...", { /* zod schema */ }, async (params) => { ... });
    server.tool("analyze_property", "...", { /* zod schema */ }, async (params) => { ... });
    server.tool("compare_scenarios", "...", { /* zod schema */ }, async (params) => { ... });
    server.tool("stress_test", "...", { /* zod schema */ }, async (params) => { ... });
    server.tool("rent_vs_buy", "...", { /* zod schema */ }, async (params) => { ... });
    server.tool("lookup_mortgage_info", "...", { /* zod schema */ }, async (params) => { ... });
  },
  { serverInfo: { name: "home-affordability", version: "1.0.0" } },
  { basePath: "/api", maxDuration: 60 }
);

export { handler as GET, handler as POST, handler as DELETE };
```

Key differences from the stdio server:
- **Imports directly** from the main app (`@/lib/utils/financial-math`, `@/lib/rag/retriever`) — no copied files
- All 6 tools are defined inline in a single file
- Deployed as a serverless function on Vercel

### Dependencies (main app)

```json
{
  "@modelcontextprotocol/sdk": "^1.25.2",
  "mcp-handler": "^1.0.7"
}
```

### Endpoint URL

```
Production: https://aicalculator.homes/api/mcp
Local:      http://localhost:3000/api/mcp
```

The `[transport]` dynamic route segment handles both `mcp` and `sse` transports automatically.

### claude.ai Setup

1. Go to claude.ai Settings > Integrations
2. Click "Add Custom Integration"
3. Enter the endpoint URL: `https://aicalculator.homes/api/mcp`
4. Claude will discover the 6 available tools
5. In any conversation, the tools become available when the integration is enabled

### Testing Locally

```bash
# Initialize connection
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'

# List tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'

# Call a tool
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"calculate_affordability","arguments":{"annual_gross_income":120000,"down_payment_amount":60000}},"id":3}'
```

---

## 3. Live Data Tools in Chat API

**Location:** `src/app/api/chat/route.ts`

The chat API is **not** an MCP server — it's an internal streaming endpoint that uses the Anthropic SDK directly with a tool-use loop. It has 9 tools: the 6 core calculation tools (adapted for conversational context) + 3 live data tools.

### Live Data Tools

#### `get_current_rates`

Fetches live mortgage rates from the Federal Reserve via the FRED API.

```typescript
case "get_current_rates": {
  const fred = new FredApiClient(process.env.FRED_API_KEY!, new CacheService());
  const [thirty, fifteen, arm] = await Promise.all([
    fred.getLatestObservation("MORTGAGE30US"),  // 30-Year Fixed
    fred.getLatestObservation("MORTGAGE15US"),  // 15-Year Fixed
    fred.getLatestObservation("MORTGAGE5US"),   // 5/1 ARM
  ]);
  return JSON.stringify({
    asOf: thirty.date,
    thirtyYearFixed: thirty.value,
    fifteenYearFixed: fifteen.value,
    fiveOneArm: arm.value,
    source: "Federal Reserve Economic Data (FRED)",
  });
}
```

- **Source:** `src/lib/services/fred-api.ts` (reuses existing `FredApiClient`)
- **API Key:** `FRED_API_KEY` (already in env)
- **Cache:** 1-hour TTL via `CacheService`

#### `search_properties`

Searches for homes currently for sale via the Zillow API.

```typescript
case "search_properties": {
  const listings = await searchProperties({
    location: input.location as string,      // e.g., "Austin, TX"
    maxPrice: input.max_price as number,     // optional
    minBeds: input.min_beds as number,       // optional
  });
  return JSON.stringify({
    location: input.location,
    resultCount: listings.length,
    listings,                                // up to 5 results
    source: "Zillow via RapidAPI",
  });
}
```

- **Source:** `src/lib/services/property-search.ts`
- **API:** `zillow-com1.p.rapidapi.com/propertyExtendedSearch`
- **API Key:** `RAPIDAPI_KEY` (free tier: 50 req/month)
- **Returns:** address, price, beds, baths, sqft, homeType, listingUrl

#### `get_area_info`

Returns curated data for the top 50+ US metro areas — no API call needed.

```typescript
case "get_area_info": {
  const result = lookupAreaInfo(input.location as string);
  return JSON.stringify({
    location: result.city,
    state: result.data.state,
    propertyTaxRate: "1.67%",
    estimatedAnnualTaxOn400K: "$6,680",
    medianHomePrice: "$450,000",
    schoolRating: "Above Average",
    costOfLivingIndex: 103,
    costOfLivingNote: "3% above national average",
  });
}
```

- **Source:** `src/lib/data/area-info.ts`
- **Coverage:** 57 US metro areas across South, West, Midwest, Northeast
- **Data sources:** Tax Foundation, NAR, Zillow HVI, GreatSchools, BEA (2024)
- **Lookup:** Exact match → city-only match → partial match

### Chat Architecture

The chat API uses an agentic loop (up to 5 iterations):

```
User message → Claude (with tools) → Tool calls → Results back to Claude → Response
                                    ↑                                        │
                                    └────────── loop if more tool calls ─────┘
```

Key implementation details:
- **Streaming:** SSE format (`data: {"text":"..."}\n\n`)
- **Prompt caching:** `cache_control: { type: "ephemeral" }` on system prompt
- **Async tool handling:** `handleToolCall` is async, tool results processed via `Promise.all`
- **System prompt:** Includes the full report data (affordability, market data, risk, loan options)
- **Observability:** Langfuse tracing on every chat request
- **RAG source citations:** When `lookup_mortgage_info` is called, source documents (title, source, relevance) are extracted from the tool result and included in the `meta` SSE event. The client renders these as citation badges below the assistant message.

### Dynamic Chat Suggestions

The `ChatInterface` component generates personalized suggestion prompts based on the user's report:

```typescript
// Uses actual values from the user's analysis
const location = userLocation || "your area";           // e.g., "Austin, TX"
const maxPrice = report.affordability?.recommendedHomePrice;  // e.g., 350000
const currentRate = report.marketSnapshot?.mortgageRates?.thirtyYearFixed;  // e.g., 6.8

// Generates prompts like:
// "Can I afford a $350K house?"
// "What are property taxes in Austin, TX?"
// "Find me homes under $350K in Austin, TX"
// "What if rates drop to 5.8%?"
```

---

## Tool Reference

### Core MCP Tools (available in both MCP servers and chat)

| Tool | Description | Key Inputs |
|------|-------------|------------|
| `calculate_affordability` | Max affordable home price | income, debts, down payment, rate, term |
| `analyze_property` | Can I afford this specific price? | home price, income, debts, down payment |
| `compare_scenarios` | Side-by-side loan comparison | home price, two scenario objects (rate + term) |
| `stress_test` | What if rates rise / income drops? | loan amount, rate, income, test type |
| `rent_vs_buy` | Renting vs buying over N years | home price, rent, appreciation, years |
| `lookup_mortgage_info` | RAG search of mortgage knowledge base | question text |

### Live Data Tools (chat API only)

| Tool | Description | Data Source | API Key |
|------|-------------|-------------|---------|
| `get_current_rates` | Today's mortgage rates (30yr, 15yr, 5/1 ARM) | FRED API | `FRED_API_KEY` |
| `search_properties` | Homes for sale (up to 5 listings) | Zillow/RapidAPI | `RAPIDAPI_KEY` |
| `get_area_info` | Tax rates, schools, cost of living (50+ metros) | Curated local data | None |

---

## Environment Variables

| Variable | Required By | Status | Notes |
|----------|-------------|--------|-------|
| `ANTHROPIC_API_KEY` | Chat API | Required | Powers the chat's Claude calls |
| `FRED_API_KEY` | Chat API (`get_current_rates`) | Required | Free at api.stlouisfed.org |
| `RAPIDAPI_KEY` | Chat API (`search_properties`) | Optional | Free tier: 50 req/month at rapidapi.com |

The MCP servers (both stdio and remote) do not require any API keys — they only run local calculations and RAG retrieval.

---

## Setup & Usage

### Quick Start — Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY, FRED_API_KEY, RAPIDAPI_KEY (optional)

# 3. Start the dev server
npm run dev

# 4. Remote MCP endpoint is now live at:
#    http://localhost:3000/api/mcp
```

### Build the Stdio Server

```bash
cd mcp-server
npm install
npm run build
# Binary: mcp-server/dist/index.js
```

### Deploy to Production

```bash
git push  # Vercel auto-deploys from main branch

# Remote MCP endpoint:
# https://aicalculator.homes/api/mcp

# Chat API (with all 9 tools):
# https://aicalculator.homes/api/chat
```

### Connect to Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "home-affordability": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### Connect to claude.ai

1. Settings > Integrations > Add Custom Integration
2. URL: `https://aicalculator.homes/api/mcp`
3. Enable the integration in your conversation

---

## Why Not MCP Client in Chat?

The chat API (`/api/chat`) uses direct API calls instead of acting as an MCP client for the live data tools. This is because:

1. **Serverless constraints:** Vercel serverless functions can't spawn child processes, so stdio-based MCP servers are not an option.
2. **No public remote MCP servers:** Most real estate MCP servers (Zillow, FRED) only support stdio transport. There are no widely available remote HTTP MCP servers for this data.
3. **Simpler and faster:** Direct `fetch()` calls to FRED and Zillow APIs are simpler, faster, and more reliable than routing through an MCP protocol layer.
4. **Same result:** The end user experience is identical — Claude uses tools to fetch live data and incorporates it into responses.

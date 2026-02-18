# ChatGPT Custom GPT Setup Guide — Home Affordability Calculator

This guide walks you through creating a ChatGPT Custom GPT that connects to the Home Affordability Calculator's API endpoints.

---

## Overview

The Custom GPT gives ChatGPT users access to 9 mortgage calculation tools via Actions (REST API calls). These are the same tools available through the MCP servers and the in-app chat.

**API Base URL:** `https://aicalculator.homes`
**OpenAPI Spec:** `https://aicalculator.homes/openapi.json`

---

## Step 1: Create the Custom GPT

1. Go to [https://chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)
2. Click **"Create a GPT"**
3. Switch to the **Configure** tab

### Name
```
Home Affordability Calculator
```

### Description
```
Calculate how much house you can afford, analyze properties, compare loan scenarios, and get live mortgage rates — all with real math, not estimates.
```

### Instructions

Paste this as the GPT's system instructions:

```
You are a home affordability advisor with access to real mortgage calculation tools. You help users understand what they can afford, analyze specific properties, and make informed home-buying decisions.

## How to use tools

When users ask about home buying, ALWAYS use the tools to provide specific numbers — never estimate or guess.

### Tool selection guide:
- **calculateAffordability**: User shares income, debts, and savings → calculate their max affordable price
- **analyzeProperty**: User mentions a specific home price → check if they can afford it
- **compareScenarios**: User asks "what if" about loan terms or rates → compare side-by-side
- **stressTest**: User worries about rate hikes or job loss → stress-test their finances
- **rentVsBuy**: User is deciding whether to rent or buy → compare total costs over N years
- **lookupMortgageInfo**: User asks about FHA, VA, PMI, closing costs, etc. → search knowledge base
- **getCurrentRates**: User asks about today's rates → get live data from the Federal Reserve
- **searchProperties**: User wants to see homes for sale → search by city, price, bedrooms
- **getAreaInfo**: User asks about a city → get property taxes, schools, cost of living

## Response guidelines

1. **Always use tools for calculations.** Never do mental math or approximate.
2. **Be specific.** Use exact dollar amounts and percentages from tool results.
3. **Format clearly.** Use headings, bullet points, and bold for key numbers.
4. **Explain the numbers.** Don't just dump raw data — tell the user what it means for them.
5. **Chain tools when helpful.** For example: calculateAffordability → then searchProperties in their price range.
6. **Proactive suggestions.** After answering, suggest a logical next step (e.g., "Want me to stress-test this at a higher rate?").

## Important notes

- Interest rates should be passed as decimals (6.5% = 0.065)
- When a user says "I make $100K", use annual_gross_income: 100000
- When a user says "$50K down", use down_payment_amount: 50000
- Monthly debts include student loans, car payments, credit cards, etc.
- Do not provide legal or binding financial advice
- Recommend users consult a licensed mortgage professional for final decisions
```

---

## Step 2: Add Actions (API Connection)

1. In the Configure tab, scroll to **Actions**
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter: `https://aicalculator.homes/openapi.json`
5. Click **Import**
6. All 9 endpoints will be imported automatically
7. Set **Authentication** to **None** (the API is public)
8. Set **Privacy policy** to: `https://aicalculator.homes/privacy` (or leave blank for personal use)

---

## Step 3: Test the GPT

Try these prompts to verify everything works:

### Basic affordability
> I make $120,000/year with $500/month in student loans. I have $60,000 saved for a down payment. What can I afford?

**Expected:** Uses `calculateAffordability`, returns max price ~$400K+, monthly payment breakdown, DTI analysis.

### Property analysis
> Can I afford a $450,000 house on $100K income with $40K down?

**Expected:** Uses `analyzeProperty`, returns verdict (e.g., "stretch - over budget"), monthly payment, comparison to max affordable.

### Scenario comparison
> Compare a 30-year at 6.5% vs a 15-year at 5.9% on a $400K house with $80K down.

**Expected:** Uses `compareScenarios`, shows monthly payment difference, total interest savings.

### Live rates
> What are today's mortgage rates?

**Expected:** Uses `getCurrentRates`, returns 30-year, 15-year, and 5/1 ARM rates from FRED.

### Property search
> Find me homes under $350K in Austin, TX

**Expected:** Uses `searchProperties`, returns up to 5 Zillow listings.

### Area info
> What are property taxes like in Denver, CO?

**Expected:** Uses `getAreaInfo`, returns tax rate, median price, schools, cost of living.

---

## Available Tools

| Tool | Operation ID | Description |
|------|-------------|-------------|
| Calculate Affordability | `calculateAffordability` | Max affordable home price from income, debts, savings |
| Analyze Property | `analyzeProperty` | Can I afford this specific price? |
| Compare Scenarios | `compareScenarios` | Side-by-side loan comparison (15yr vs 30yr, etc.) |
| Stress Test | `stressTest` | What if rates rise or income drops? |
| Rent vs Buy | `rentVsBuy` | Total cost comparison over N years |
| Lookup Mortgage Info | `lookupMortgageInfo` | RAG search of mortgage knowledge base |
| Current Rates | `getCurrentRates` | Live rates from the Federal Reserve (FRED) |
| Search Properties | `searchProperties` | Homes for sale via Zillow |
| Area Info | `getAreaInfo` | Property taxes, schools, cost of living (50+ metros) |

---

## API Endpoints

All endpoints accept POST requests with JSON body:

```
POST https://aicalculator.homes/api/gpt/calculate-affordability
POST https://aicalculator.homes/api/gpt/analyze-property
POST https://aicalculator.homes/api/gpt/compare-scenarios
POST https://aicalculator.homes/api/gpt/stress-test
POST https://aicalculator.homes/api/gpt/rent-vs-buy
POST https://aicalculator.homes/api/gpt/lookup-mortgage-info
POST https://aicalculator.homes/api/gpt/current-rates
POST https://aicalculator.homes/api/gpt/search-properties
POST https://aicalculator.homes/api/gpt/area-info
```

---

## Troubleshooting

### "Could not connect to server"
- Verify the app is deployed: `curl https://aicalculator.homes/api/gpt/current-rates -X POST`
- Check that CORS headers are present in the response

### "Action failed" on live data tools
- `current-rates`: Requires `FRED_API_KEY` env var on the server
- `search-properties`: Requires `RAPIDAPI_KEY` env var (free tier: 50 req/month)
- `area-info`: No API key needed (local data)

### Tools not showing up
- Re-import the OpenAPI spec from `https://aicalculator.homes/openapi.json`
- Make sure the spec is valid: paste into [editor.swagger.io](https://editor.swagger.io) to check

---

## Local Development

To test the GPT endpoints locally:

```bash
# Start the dev server
npm run dev

# Test an endpoint
curl -X POST http://localhost:3000/api/gpt/calculate-affordability \
  -H "Content-Type: application/json" \
  -d '{"annual_gross_income": 120000, "down_payment_amount": 60000}'

# Test live rates
curl -X POST http://localhost:3000/api/gpt/current-rates \
  -H "Content-Type: application/json" \
  -d '{}'
```

Note: ChatGPT cannot reach `localhost`. For testing the full GPT flow locally, use [ngrok](https://ngrok.com) to tunnel your local server, then update the OpenAPI spec's `servers` URL temporarily.

# CLAUDE.md — HomeIQ Project Guide

## Project

HomeIQ is an AI-powered home affordability analysis platform.
Live at https://aicalculator.homes. Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (also runs type check)
npm run lint         # ESLint
npx vercel --yes     # Deploy staging
npx vercel --prod    # Deploy production → aicalculator.homes
```

## Git & Deploy Workflow

- **Always commit after making changes.** Do not deploy without committing first.
- **Push to both main and staging:** `git push origin main && git push origin main:staging`
- **Deploy both:** staging (`npx vercel --yes`) then production (`npx vercel --prod`)
- Commit messages: concise, start with verb (Add, Fix, Update, Remove)
- Never commit `.env.local` or files with secrets

## Architecture

### AI Agent Pipeline (`src/lib/agents/`)

4 specialized agents orchestrated by `orchestrator.ts` via `pipeline.ts`:
- `market-data.ts` — Live rates from FRED API, market trends
- `affordability.ts` — Income analysis, DTI, max price calculation
- `risk-assessment.ts` — Stress tests, risk scoring
- `recommendations.ts` — Loan programs, closing costs, savings strategies

Each agent has matching tools in `src/lib/tools/`.

### External Services (`src/lib/services/`)

- `fred-api.ts` — Federal Reserve mortgage rates
- `housing-api.ts` — Realtor.com property data via RapidAPI
- `property-search.ts` — Property matching logic
- `geocode.ts` — Mapbox geocoding with 5-min cache
- `bls-api.ts` — Bureau of Labor Statistics
- `cache.ts` — In-memory caching utilities

### API Routes (`src/app/api/`)

Key routes:
- `/api/analyze` — Main analysis endpoint (orchestrates all agents)
- `/api/chat` — Follow-up Q&A with report context
- `/api/commute` — Google Distance Matrix API
- `/api/nearby-places` — Google Places API (7 categories)
- `/api/location-image` — Mapbox satellite + geocoding
- `/api/matching-properties` — Realtor.com listings
- `/api/address-autocomplete` — Mapbox address search
- `/api/stripe/*` — Checkout, portal, webhooks
- `/api/saved-reports/*` — CRUD for saved analyses
- `/api/admin/*` — 11 admin endpoints (users, usage, errors, costs, quality, etc.)
- `/api/eval/*` — Test suite runner and results
- `/api/judge/scores` — LLM-as-judge quality metrics

### Components (`src/components/`)

Main flow: `AffordabilityForm` → `ResultsDashboard` (12+ section cards)

Dashboard sections follow buyer journey order:
1. Analysis (AffordabilityCard, BudgetSimulatorCard)
2. Market (MarketSnapshotCard)
3. Area (GoogleMapView, NeighborhoodInfoCard, CommuteCalculator, NearbyAmenitiesCard)
4. Properties (MatchingPropertiesCard)
5. Rent vs Buy (RentVsBuyCard)
6. Loans (LoanProgramsCard)
7. Closing (ClosingCostCard)
8. Risk (RiskAssessmentCard)
9. Equity (AmortizationChart)
10. AI (AISummaryCard + ChatInterface)

### Database (`src/lib/db/`)

Neon Postgres via Drizzle ORM. Key tables:
- `users` — Auth, tier (free/pro), Stripe IDs
- `savedReports` — JSONB report storage
- `usageEvents` — Every API call tracked
- `llmCosts` — Token usage and cost per model
- `judgeScores` — AI quality scores (accuracy, relevance, helpfulness, safety)
- `evalResults` — Test suite results
- `feedback` — User thumbs up/down
- `errorLogs` — API errors with stack traces
- `tierChangeLog` — Audit trail for tier changes
- `supportTickets` — User support requests

### Key Libraries

- `src/lib/auth.ts` — NextAuth v5, Google OAuth, JWT sessions with tier refresh
- `src/lib/tier.ts` — Free/Pro limits (analyze, chat, saved reports)
- `src/lib/rate-limit.ts` — In-memory sliding window rate limiter
- `src/lib/encryption.ts` — AES-256-GCM for OAuth tokens
- `src/lib/guardrails.ts` — Input validation, injection detection, output fact-checking
- `src/lib/langfuse.ts` — LLM tracing and observability
- `src/lib/posthog.ts` — Product analytics and feature flags
- `src/lib/stripe.ts` — Payment integration
- `src/lib/eval/judge.ts` — LLM-as-judge scoring system
- `src/lib/eval/eval-runner.ts` — Golden test suite runner

## Conventions

- All components are in `src/components/`, one per file, `"use client"` where needed
- API routes use Next.js App Router (`src/app/api/[route]/route.ts`)
- Types live in `src/lib/types/` with barrel export from `index.ts`
- Shared services go in `src/lib/services/`
- Use Zod for input validation at API boundaries
- Rate limit all public-facing API routes
- Log API calls via `withTracking()` wrapper from `src/lib/db/track.ts`
- CSP headers in `next.config.ts` — update when adding new external domains
- Admin routes protected by middleware (`src/middleware.ts`) + `requireAdmin()`

## Environment Variables

Required: `ANTHROPIC_API_KEY`, `FRED_API_KEY`
Auth: `POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
Maps: `MAPBOX_ACCESS_TOKEN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY`
Payments: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
Optional: `LANGFUSE_*`, `NEXT_PUBLIC_POSTHOG_*`, `SENTRY_AUTH_TOKEN`, `RAPIDAPI_KEY`, `BLS_API_KEY`

## Product Strategy

See `docs/AI-PRODUCT-OS.md` for the full PM operating system with 70+ frameworks, product context, and skill commands.

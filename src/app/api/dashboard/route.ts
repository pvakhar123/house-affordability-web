import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, isDbAvailable } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getFullUsageStatus, type Tier } from "@/lib/tier";
import { FredApiClient } from "@/lib/services/fred-api";
import { CacheService } from "@/lib/services/cache";
import { withTracking } from "@/lib/db/track";

export const GET = withTracking("dashboard", async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const tier: Tier = (session.user.tier as Tier) ?? "free";

  // Parallel fetch all dashboard data with failure isolation
  const [usageResult, ratesResult, reportsResult, userResult] = await Promise.allSettled([
    // 1. Usage status
    getFullUsageStatus(userId, tier),

    // 2. Mortgage rates (current + historical)
    (async () => {
      const fred = new FredApiClient(process.env.FRED_API_KEY!, new CacheService());
      const [rate30, rate15, history] = await Promise.allSettled([
        fred.getMortgage30YRate(),
        fred.getMortgage15YRate(),
        fred.getHistoricalMortgageRate(1),
      ]);
      return {
        current30yr: rate30.status === "fulfilled" ? rate30.value.value : null,
        current15yr: rate15.status === "fulfilled" ? rate15.value.value : null,
        history30yr: history.status === "fulfilled"
          ? history.value.map((h) => ({ date: h.date, value: h.value }))
          : [],
      };
    })(),

    // 3. Saved reports
    (async () => {
      if (!isDbAvailable) return [];
      const db = getDb();
      const rows = await db
        .select({
          id: schema.savedReports.id,
          name: schema.savedReports.name,
          savedAt: schema.savedReports.savedAt,
          report: schema.savedReports.report,
          userLocation: schema.savedReports.userLocation,
        })
        .from(schema.savedReports)
        .where(eq(schema.savedReports.userId, userId))
        .orderBy(desc(schema.savedReports.savedAt));

      return rows.map((r) => {
        const report = r.report as Record<string, unknown> | null;
        const affordability = report?.affordability as Record<string, unknown> | undefined;
        const monthlyPayment = affordability?.monthlyPayment as Record<string, unknown> | undefined;
        const marketSnapshot = report?.marketSnapshot as Record<string, unknown> | undefined;
        const mortgageRates = marketSnapshot?.mortgageRates as Record<string, unknown> | undefined;
        return {
          id: r.id,
          name: r.name,
          savedAt: r.savedAt.toISOString(),
          maxPrice: (affordability?.maxHomePrice as number) ?? null,
          monthlyPayment: (monthlyPayment?.totalMonthly as number) ?? null,
          location: r.userLocation ?? null,
          rateAtAnalysis: (mortgageRates?.thirtyYear as number) ?? null,
        };
      });
    })(),

    // 4. User info
    (async () => {
      if (!isDbAvailable) return { name: session.user.name ?? "", memberSince: "" };
      const db = getDb();
      const [user] = await db
        .select({ name: schema.users.name, id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      return {
        name: user?.name ?? session.user.name ?? "",
        memberSince: "", // users table doesn't have createdAt
      };
    })(),
  ]);

  // Extract results with fallbacks
  const usage = usageResult.status === "fulfilled" ? usageResult.value : null;
  const rates = ratesResult.status === "fulfilled" ? ratesResult.value : {
    current30yr: null,
    current15yr: null,
    history30yr: [],
  };
  const reports = reportsResult.status === "fulfilled" ? reportsResult.value : [];
  const user = userResult.status === "fulfilled" ? userResult.value : {
    name: session.user.name ?? "",
    memberSince: "",
  };

  // Derive buying power from latest report + current rate
  const latestReport = reports[0] ?? null;
  const buyingPower = {
    latestMaxPrice: latestReport?.maxPrice ?? null,
    latestMonthlyPayment: latestReport?.monthlyPayment ?? null,
    rateAtAnalysis: latestReport?.rateAtAnalysis ?? null,
    currentRate: rates.current30yr,
    rateDelta: latestReport?.rateAtAnalysis != null && rates.current30yr != null
      ? +(rates.current30yr - latestReport.rateAtAnalysis).toFixed(3)
      : null,
  };

  return NextResponse.json({
    user: { ...user, tier },
    usage,
    rates,
    reports,
    buyingPower,
  });
});

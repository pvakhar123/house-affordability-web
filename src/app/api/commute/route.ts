import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import type { CommuteResult, CommuteLeg } from "@/lib/types";

const RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const MAX_PER_HOUR = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.reset) {
    RATE_LIMIT.set(ip, { count: 1, reset: now + 3600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { originAddress, destinationAddress } = await request.json();
    if (!originAddress || !destinationAddress) {
      return NextResponse.json({ error: "Missing originAddress or destinationAddress" }, { status: 400 });
    }

    if (!config.googleMapsApiKey) {
      return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });
    }

    const apiKey = config.googleMapsApiKey;
    const origins = encodeURIComponent(originAddress);
    const destinations = encodeURIComponent(destinationAddress);

    const [drivingRes, transitRes] = await Promise.all([
      fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${apiKey}`,
        { signal: AbortSignal.timeout(10000) },
      ),
      fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=transit&key=${apiKey}`,
        { signal: AbortSignal.timeout(10000) },
      ),
    ]);

    const [drivingData, transitData] = await Promise.all([drivingRes.json(), transitRes.json()]);

    const driving = parseLeg(drivingData);
    const transit = parseLeg(transitData);

    const result: CommuteResult = { driving, transit };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Commute API error:", err);
    return NextResponse.json({ error: "Failed to calculate commute" }, { status: 500 });
  }
}

function parseLeg(data: Record<string, unknown>): CommuteLeg | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = (data as any)?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") return null;
    return {
      duration: element.duration.text,
      durationMinutes: Math.round(element.duration.value / 60),
      distance: element.distance.text,
    };
  } catch {
    return null;
  }
}

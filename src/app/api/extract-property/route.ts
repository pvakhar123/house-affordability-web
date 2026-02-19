import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";
import type { PropertyInfo } from "@/lib/types";
import { traceGeneration, flushLangfuse } from "@/lib/langfuse";
import { withTracking } from "@/lib/db/track";

const EXTRACTION_PROMPT = `Extract property listing details from the following page content. Return ONLY valid JSON (no markdown, no explanation) with these fields:

{
  "address": "Full street address including city, state",
  "listingPrice": 450000,
  "propertyTaxAnnual": 5400,
  "hoaMonthly": 250,
  "squareFootage": 2100,
  "bedrooms": 3,
  "bathrooms": 2,
  "yearBuilt": 2005,
  "propertyType": "single_family"
}

Rules:
- listingPrice must be a number with no formatting (e.g., 450000 not "$450,000")
- propertyTaxAnnual should be the annual amount (if monthly is shown, multiply by 12)
- hoaMonthly should be the monthly HOA amount
- propertyType must be one of: "single_family", "condo", "townhouse", "multi_family", "other"
- Set any field to null if it cannot be found in the content
- listingPrice is the most important field - try your hardest to find it`;

async function _POST(request: Request) {
  try {
    config.validate();

    const { url } = (await request.json()) as { url: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP/HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Attempt to fetch the page content
    let pageContent: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; HomeAffordabilityBot/1.0)",
          Accept: "text/html",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Could not access that listing (HTTP ${response.status}). Please enter the property details manually.`,
          },
          { status: 200 }
        );
      }

      pageContent = await response.text();
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "The request timed out."
          : "Could not access that listing.";
      return NextResponse.json(
        {
          success: false,
          error: `${message} Please enter the property details manually.`,
        },
        { status: 200 }
      );
    }

    // Truncate content to avoid exceeding context limits
    // Strip script/style tags first to reduce noise
    const cleaned = pageContent
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000);

    if (cleaned.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The page didn't contain enough content to extract from. Please enter the property details manually.",
        },
        { status: 200 }
      );
    }

    // Send to Claude for extraction
    const client = new Anthropic();

    const response = await traceGeneration({
      client,
      params: {
        model: config.model,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\n---PAGE CONTENT---\n${cleaned}`,
          },
        ],
      },
      options: { timeout: 10000 },
      trace: { name: "extract-property" },
      metadata: { url, contentLength: cleaned.length },
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );

    if (!textBlock?.text) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not extract property details. Please enter them manually.",
        },
        { status: 200 }
      );
    }

    // Parse the JSON
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not parse property details. Please enter them manually.",
        },
        { status: 200 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.listingPrice) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not find a listing price on that page. Please enter the property details manually.",
        },
        { status: 200 }
      );
    }

    const property: PropertyInfo = {
      source: "url_extracted",
      sourceUrl: url,
      address: parsed.address || undefined,
      listingPrice: Number(parsed.listingPrice),
      propertyTaxAnnual: parsed.propertyTaxAnnual
        ? Number(parsed.propertyTaxAnnual)
        : undefined,
      hoaMonthly: parsed.hoaMonthly ? Number(parsed.hoaMonthly) : undefined,
      squareFootage: parsed.squareFootage
        ? Number(parsed.squareFootage)
        : undefined,
      bedrooms: parsed.bedrooms ? Number(parsed.bedrooms) : undefined,
      bathrooms: parsed.bathrooms ? Number(parsed.bathrooms) : undefined,
      yearBuilt: parsed.yearBuilt ? Number(parsed.yearBuilt) : undefined,
      propertyType: parsed.propertyType || undefined,
    };

    await flushLangfuse();
    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error("Property extraction error:", error);
    await flushLangfuse();
    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong extracting property details. Please enter them manually.",
      },
      { status: 200 }
    );
  }
}

export const POST = withTracking("/api/extract-property", _POST);

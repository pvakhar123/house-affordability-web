import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";
import type { DocumentExtractionResult } from "@/lib/types";

interface DocumentPayload {
  data: string;
  mediaType: string;
  filename: string;
}

const EXTRACTION_PROMPT = `You are analyzing a financial document image. Your job is to extract financial data that helps with home affordability analysis.

First, identify the document type:
- "pay_stub" - Regular pay stub showing earnings
- "w2" - W-2 tax form
- "bank_statement" - Bank or savings account statement
- "tax_return" - Tax return form (1040, etc.)
- "unknown" - Cannot determine

Then extract any of these financial values you can find:

1. annualGrossIncome - Annual gross income. If this is a pay stub, calculate from per-period gross pay multiplied by pay periods per year (26 for biweekly, 24 for semi-monthly, 12 for monthly). For W-2, use Box 1. Label: "Annual Gross Income"
2. additionalIncome - Any additional/supplemental/bonus income visible. Label: "Additional Income"
3. monthlyDebtPayments - Any visible recurring debt payments (loan payments, etc.). Label: "Monthly Debt Payments"
4. downPaymentSavings - Main account balance that could serve as down payment savings. Label: "Down Payment Savings"
5. additionalSavings - Other savings or checking balances. Label: "Additional Savings"
6. creditScore - Credit score if visible anywhere. Label: "Credit Score"
7. monthlyExpenses - Total monthly expenses if visible (from bank statement summaries). Label: "Monthly Expenses"

For each field you can extract, assign a confidence:
- "high" - The value is clearly and explicitly stated (e.g., W-2 Box 1 wages)
- "medium" - The value is calculated or inferred from other data (e.g., annualizing a pay stub)
- "low" - The value is an estimate or uncertain

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "documentType": "pay_stub",
  "fields": [
    {
      "field": "annualGrossIncome",
      "label": "Annual Gross Income",
      "value": 95000,
      "confidence": "medium",
      "source": "Biweekly gross $3,653.85 x 26 pay periods"
    }
  ],
  "warnings": ["Optional array of any caveats or notes"]
}

Only include fields you can actually extract. Do not guess or make up values. If you can't find any financial data, return an empty fields array.`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export async function POST(request: Request) {
  try {
    config.validate();

    const { documents } = (await request.json()) as {
      documents: DocumentPayload[];
    };

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "No documents provided" },
        { status: 400 }
      );
    }

    if (documents.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 documents per request" },
        { status: 400 }
      );
    }

    // Validate files
    for (const doc of documents) {
      if (!ALLOWED_TYPES.includes(doc.mediaType)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${doc.mediaType}. Supported: PNG, JPG, WebP, PDF`,
          },
          { status: 400 }
        );
      }
      // Rough base64 size check (base64 is ~4/3 of original)
      const estimatedSize = (doc.data.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${doc.filename} exceeds 10MB limit` },
          { status: 400 }
        );
      }
    }

    const client = new Anthropic();

    // Process all documents in parallel
    const results = await Promise.all(
      documents.map(async (doc): Promise<DocumentExtractionResult> => {
        try {
          const isPdf = doc.mediaType === "application/pdf";

          const contentBlock: Anthropic.Messages.ContentBlockParam = isPdf
            ? {
                type: "document" as const,
                source: {
                  type: "base64" as const,
                  media_type: "application/pdf" as const,
                  data: doc.data,
                },
              }
            : {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: doc.mediaType as
                    | "image/png"
                    | "image/jpeg"
                    | "image/webp"
                    | "image/gif",
                  data: doc.data,
                },
              };

          const response = await client.messages.create(
            {
              model: config.model,
              max_tokens: 1024,
              messages: [
                {
                  role: "user",
                  content: [
                    contentBlock,
                    { type: "text", text: EXTRACTION_PROMPT },
                  ],
                },
              ],
            },
            { timeout: 15000 }
          );

          const textBlock = response.content.find(
            (b): b is Anthropic.Messages.TextBlock => b.type === "text"
          );

          if (!textBlock?.text) {
            return {
              success: false,
              documentType: "unknown",
              fields: [],
              warnings: ["No response from document analysis"],
            };
          }

          // Parse the JSON response
          const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return {
              success: false,
              documentType: "unknown",
              fields: [],
              warnings: ["Could not parse document analysis response"],
            };
          }

          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            documentType: parsed.documentType || "unknown",
            fields: (parsed.fields || []).map(
              (f: Record<string, unknown>) => ({
                field: f.field as string,
                label: f.label as string,
                value: Number(f.value),
                confidence: f.confidence as "high" | "medium" | "low",
                source: f.source as string,
              })
            ),
            warnings: parsed.warnings,
          };
        } catch (err) {
          return {
            success: false,
            documentType: "unknown",
            fields: [],
            warnings: [
              `Failed to analyze ${doc.filename}: ${err instanceof Error ? err.message : "Unknown error"}`,
            ],
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Document extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Document extraction failed",
      },
      { status: 500 }
    );
  }
}

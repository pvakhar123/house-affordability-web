import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { FinalReport } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildEmailHTML(report: FinalReport): string {
  const a = report.affordability;
  const m = report.marketSnapshot;
  const r = report.riskAssessment;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h1 style="font-size: 24px; color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;">
        House Affordability Report
      </h1>
      <p style="font-size: 12px; color: #9ca3af;">
        Generated ${new Date(report.generatedAt).toLocaleString()}
      </p>

      <h2 style="font-size: 18px; color: #1e40af; margin-top: 24px;">Affordability</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">Max Home Price</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(a.maxHomePrice)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">Recommended Price</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(a.recommendedHomePrice)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">Down Payment</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(a.downPaymentAmount)} (${a.downPaymentPercent}%)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">Monthly Payment</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669;">${fmt(a.monthlyPayment.totalMonthly)}/mo</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">Front-End DTI</td>
          <td style="padding: 8px 0; text-align: right;">${a.dtiAnalysis.frontEndRatio}% (${a.dtiAnalysis.frontEndStatus})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Back-End DTI</td>
          <td style="padding: 8px 0; text-align: right;">${a.dtiAnalysis.backEndRatio}% (${a.dtiAnalysis.backEndStatus})</td>
        </tr>
      </table>

      <h2 style="font-size: 18px; color: #1e40af; margin-top: 24px;">Market Snapshot</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">30-Year Fixed</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${m.mortgageRates.thirtyYearFixed}%</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #6b7280;">15-Year Fixed</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${m.mortgageRates.fifteenYearFixed}%</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">National Median</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fmt(m.medianHomePrices.national)}</td>
        </tr>
      </table>

      <h2 style="font-size: 18px; color: #1e40af; margin-top: 24px;">Risk Assessment</h2>
      <p style="font-size: 14px;">
        Overall: <strong style="color: ${r.overallRiskLevel === "low" ? "#059669" : r.overallRiskLevel === "moderate" ? "#d97706" : "#dc2626"};">
          ${r.overallRiskLevel.toUpperCase()}
        </strong> (score: ${r.overallScore}/100)
      </p>
      ${r.riskFlags?.length > 0 ? `
        <ul style="font-size: 13px; color: #4b5563; padding-left: 20px;">
          ${r.riskFlags.map((f) => `<li style="margin-bottom: 4px;"><strong>[${f.severity}]</strong> ${f.message}</li>`).join("")}
        </ul>
      ` : ""}

      <h2 style="font-size: 18px; color: #1e40af; margin-top: 24px;">AI Summary</h2>
      <p style="font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${report.summary}</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">
        This report is for informational purposes only and does not constitute financial advice.
        Consult a qualified financial advisor before making home buying decisions.
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const { email, report } = (await request.json()) as {
      email: string;
      report: FinalReport;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email service not configured. Add RESEND_API_KEY to .env.local" },
        { status: 503 }
      );
    }

    const resend = new Resend(resendKey);

    const { error } = await resend.emails.send({
      from: "House Affordability <onboarding@resend.dev>",
      to: email,
      subject: `Your Affordability Report — Max ${Math.round(report.affordability.maxHomePrice).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
      html: buildEmailHTML(report),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}

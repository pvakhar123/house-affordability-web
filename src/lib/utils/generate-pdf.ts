import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinalReport } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function generateReportPDF(report: FinalReport): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string, size: number = 14) {
    checkPage(30);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(text, margin, y);
    y += size + 8;
  }

  function label(text: string) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(text, margin, y);
    y += 13;
  }

  function row(labelText: string, value: string) {
    checkPage(16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(labelText, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(value, margin + contentWidth, y, { align: "right" });
    y += 16;
  }

  function divider() {
    checkPage(12);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, margin + contentWidth, y);
    y += 12;
  }

  // === Title ===
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("House Affordability Report", margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()}`, margin, y);
  y += 24;
  divider();

  // === Affordability ===
  heading("Affordability Analysis");
  const a = report.affordability;
  row("Max Home Price", fmt(a.maxHomePrice));
  row("Recommended Price", fmt(a.recommendedHomePrice));
  row("Down Payment", `${fmt(a.downPaymentAmount)} (${a.downPaymentPercent}%)`);
  row("Loan Amount", fmt(a.loanAmount));
  y += 6;
  label("Monthly Payment Breakdown");
  row("Principal & Interest", fmt(a.monthlyPayment.principal + a.monthlyPayment.interest));
  row("Property Tax", fmt(a.monthlyPayment.propertyTax));
  row("Insurance", fmt(a.monthlyPayment.homeInsurance));
  if (a.monthlyPayment.pmi > 0) {
    row("PMI", fmt(a.monthlyPayment.pmi));
  }
  row("Total Monthly", fmt(a.monthlyPayment.totalMonthly));
  y += 6;
  label("Debt-to-Income Ratios");
  row("Front-End DTI", `${a.dtiAnalysis.frontEndRatio}% (${a.dtiAnalysis.frontEndStatus})`);
  row("Back-End DTI", `${a.dtiAnalysis.backEndRatio}% (${a.dtiAnalysis.backEndStatus})`);
  y += 6;
  divider();

  // === Amortization Table ===
  if (a.amortizationSummary?.length > 0) {
    heading("5-Year Equity Buildup");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Year", "Principal Paid", "Interest Paid", "Balance", "Equity"]],
      body: a.amortizationSummary.map((yr) => [
        yr.year.toString(),
        fmt(yr.principalPaid),
        fmt(yr.interestPaid),
        fmt(yr.remainingBalance),
        `${yr.equityPercent}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    divider();
  }

  // === Market Snapshot ===
  heading("Market Snapshot");
  const m = report.marketSnapshot;
  row("30-Year Fixed Rate", `${m.mortgageRates.thirtyYearFixed}%`);
  row("15-Year Fixed Rate", `${m.mortgageRates.fifteenYearFixed}%`);
  row("Federal Funds Rate", `${m.mortgageRates.federalFundsRate}%`);
  row("National Median Price", fmt(m.medianHomePrices.national));
  row("New Construction Median", fmt(m.medianHomePrices.nationalNew));
  if (m.inflationData) {
    row("Shelter Inflation", `${m.inflationData.shelterInflationRate}%`);
    row("General Inflation", `${m.inflationData.generalInflationRate}%`);
  }
  y += 6;
  divider();

  // === Risk Assessment ===
  checkPage(80);
  heading("Risk Assessment");
  const r = report.riskAssessment;
  row("Overall Risk Level", r.overallRiskLevel.toUpperCase());
  row("Risk Score", `${r.overallScore}/100`);
  y += 6;

  if (r.riskFlags?.length > 0) {
    label("Risk Flags");
    for (const flag of r.riskFlags) {
      checkPage(30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        flag.severity === "critical" ? 220 : flag.severity === "warning" ? 180 : 59,
        flag.severity === "critical" ? 38 : flag.severity === "warning" ? 130 : 130,
        flag.severity === "critical" ? 38 : flag.severity === "warning" ? 0 : 246
      );
      doc.text(`[${flag.severity.toUpperCase()}] ${flag.message}`, margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      const recLines = doc.splitTextToSize(flag.recommendation, contentWidth);
      doc.text(recLines, margin, y);
      y += recLines.length * 11 + 4;
    }
  }

  if (r.stressTests?.length > 0) {
    y += 4;
    label("Stress Tests");
    for (const st of r.stressTests) {
      checkPage(24);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(`${st.scenario} — ${st.severity}`, margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      const descLines = doc.splitTextToSize(st.description, contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 11 + 4;
    }
  }
  divider();

  // === Recommendations ===
  checkPage(60);
  heading("Recommendations");
  const rec = report.recommendations;

  if (rec.loanOptions?.length > 0) {
    label("Loan Options");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Type", "Eligible", "Min Down", "Est. Rate", "Monthly", "PMI"]],
      body: rec.loanOptions.map((l) => [
        l.type.toUpperCase(),
        l.eligible ? "Yes" : "No",
        `${l.minDownPaymentPercent}%`,
        `${l.estimatedRate}%`,
        l.eligible ? fmt(l.monthlyPayment) : "—",
        l.pmiRequired ? "Yes" : "No",
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  if (rec.closingCostEstimate && rec.closingCostEstimate.lowEstimate > 0) {
    checkPage(20);
    row("Estimated Closing Costs", `${fmt(rec.closingCostEstimate.lowEstimate)} – ${fmt(rec.closingCostEstimate.highEstimate)}`);
  }

  if (rec.savingsStrategies?.length > 0) {
    y += 4;
    label("Savings Strategies");
    for (const s of rec.savingsStrategies) {
      checkPage(24);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(`${s.title} (${s.difficulty})`, margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      const lines = doc.splitTextToSize(s.description, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 11 + 4;
    }
  }

  if (rec.generalAdvice?.length > 0) {
    y += 4;
    label("General Advice");
    for (const advice of rec.generalAdvice) {
      checkPage(18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      const lines = doc.splitTextToSize(`• ${advice}`, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 11 + 2;
    }
  }
  divider();

  // === AI Summary ===
  checkPage(60);
  heading("AI Analysis Summary");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const summaryLines = doc.splitTextToSize(report.summary, contentWidth);
  for (let i = 0; i < summaryLines.length; i++) {
    checkPage(12);
    doc.text(summaryLines[i], margin, y);
    y += 12;
  }
  y += 8;
  divider();

  // === Disclaimers ===
  checkPage(40);
  label("Disclaimers");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  for (const d of report.disclaimers) {
    checkPage(12);
    const lines = doc.splitTextToSize(d, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 9 + 2;
  }

  return doc;
}

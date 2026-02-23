import type { AffordabilityResult, RiskReport } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const riskStyle: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  moderate: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  high: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  very_high: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
};

interface Props {
  data: AffordabilityResult;
  risk: RiskReport;
  mortgageRate: number;
}

export default function AffordabilityCard({ data, risk, mortgageRate }: Props) {
  const { monthlyPayment: mp, dtiAnalysis: dti } = data;
  const rs = riskStyle[risk.overallRiskLevel] ?? riskStyle.moderate;

  const dtiColor = (status: string) =>
    status === "safe"
      ? "text-green-700 bg-green-100"
      : status === "moderate"
        ? "text-yellow-700 bg-yellow-100"
        : "text-red-700 bg-red-100";

  const total = mp.totalMonthly;
  const segments = [
    { label: "P&I", amount: mp.principal + mp.interest, color: "bg-blue-500" },
    { label: "Tax", amount: mp.propertyTax, color: "bg-amber-500" },
    { label: "Insurance", amount: mp.homeInsurance, color: "bg-teal-500" },
    ...(mp.pmi > 0 ? [{ label: "PMI", amount: mp.pmi, color: "bg-red-400" }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Accent bar */}
      <div className="h-0.5" style={{ background: "linear-gradient(to right, #0071e3, #5856d6, #af52de)" }} />

      <div className="p-6 sm:p-8">
        {/* Key numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Max Price</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-900">{fmt(data.maxHomePrice)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Max Loan</p>
            <p className="text-xl sm:text-2xl font-bold text-green-900">{fmt(data.loanAmount)}</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Monthly</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">{fmt(mp.totalMonthly)}</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${rs.bg}`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${rs.text}`}>Risk</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${rs.dot}`} />
              <p className={`text-xl sm:text-2xl font-bold ${rs.text}`}>
                {risk.overallRiskLevel.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 justify-center mb-6">
          <span>Down: <strong className="text-gray-900">{fmt(data.downPaymentAmount)}</strong> ({data.downPaymentPercent}%)</span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>30yr Rate: <strong className="text-gray-900">{mortgageRate}%</strong></span>
        </div>

        {/* Payment breakdown bar */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Payment Breakdown</p>
          <div className="flex h-6 rounded-full overflow-hidden">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className={`${seg.color} relative group`}
                style={{ width: `${(seg.amount / total) * 100}%` }}
                title={`${seg.label}: ${fmt(seg.amount)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                {seg.label}: {fmt(seg.amount)}
              </div>
            ))}
          </div>
        </div>

        {/* DTI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Front-End DTI</p>
              <p className="text-sm font-semibold">{dti.frontEndRatio}%</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${dtiColor(dti.frontEndStatus)}`}>
              {dti.frontEndStatus}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Back-End DTI</p>
              <p className="text-sm font-semibold">{dti.backEndRatio}%</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${dtiColor(dti.backEndStatus)}`}>
              {dti.backEndStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

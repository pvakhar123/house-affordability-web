import type { AffordabilityResult } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function AffordabilityCard({ data }: { data: AffordabilityResult }) {
  const { monthlyPayment: mp, dtiAnalysis: dti } = data;

  const dtiColor = (status: string) =>
    status === "safe"
      ? "text-green-700 bg-green-100"
      : status === "moderate"
        ? "text-yellow-700 bg-yellow-100"
        : "text-red-700 bg-red-100";

  // Payment bar segments
  const total = mp.totalMonthly;
  const segments = [
    { label: "P&I", amount: mp.principal + mp.interest, color: "bg-blue-500" },
    { label: "Tax", amount: mp.propertyTax, color: "bg-amber-500" },
    { label: "Insurance", amount: mp.homeInsurance, color: "bg-teal-500" },
    ...(mp.pmi > 0 ? [{ label: "PMI", amount: mp.pmi, color: "bg-red-400" }] : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Max Home Price</p>
          <p className="text-2xl font-bold text-blue-900">{fmt(data.maxHomePrice)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Max Loan Amount</p>
          <p className="text-2xl font-bold text-green-900">{fmt(data.loanAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
        <div>
          <p className="text-gray-500">Down Payment</p>
          <p className="font-semibold">{fmt(data.downPaymentAmount)} ({data.downPaymentPercent}%)</p>
        </div>
        <div>
          <p className="text-gray-500">Loan Amount</p>
          <p className="font-semibold">{fmt(data.loanAmount)}</p>
        </div>
        <div>
          <p className="text-gray-500">Monthly Payment</p>
          <p className="font-semibold text-lg">{fmt(mp.totalMonthly)}/mo</p>
        </div>
      </div>

      {/* Payment breakdown bar */}
      <div className="mb-4">
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
  );
}

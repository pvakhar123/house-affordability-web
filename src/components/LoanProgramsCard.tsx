import type { LoanOption } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function LoanProgramsCard({ data }: { data: LoanOption[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.map((loan) => (
        <div
          key={loan.type}
          className={`p-4 rounded-lg border ${
            loan.eligible
              ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50 opacity-60"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm uppercase">{loan.type}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              loan.eligible
                ? "bg-green-200 text-green-800"
                : "bg-gray-200 text-gray-600"
            }`}>
              {loan.eligible ? "Eligible" : "Not Eligible"}
            </span>
          </div>
          {loan.eligible ? (
            <div className="space-y-1 text-xs text-gray-600">
              {loan.monthlyPayment > 0 && (
                <p>Est. Payment: <span className="font-semibold text-gray-900">{fmt(loan.monthlyPayment)}/mo</span></p>
              )}
              <p>Min Down: {loan.minDownPaymentPercent}%</p>
              <p>PMI: {loan.pmiRequired ? "Required" : "Not required"}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">{loan.eligibilityReason}</p>
          )}
        </div>
      ))}
    </div>
  );
}

import type { AmortizationYear } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function AmortizationTable({ data }: { data: AmortizationYear[] }) {
  if (!data?.length) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Year</th>
              <th className="pb-2 font-medium text-right">Principal Paid</th>
              <th className="pb-2 font-medium text-right">Interest Paid</th>
              <th className="pb-2 font-medium text-right">Balance</th>
              <th className="pb-2 font-medium text-right">Equity</th>
            </tr>
          </thead>
          <tbody>
            {data.map((yr) => (
              <tr key={yr.year} className="border-b border-gray-100">
                <td className="py-2.5 font-medium">{yr.year}</td>
                <td className="py-2.5 text-right text-green-700">{fmt(yr.principalPaid)}</td>
                <td className="py-2.5 text-right text-red-600">{fmt(yr.interestPaid)}</td>
                <td className="py-2.5 text-right">{fmt(yr.remainingBalance)}</td>
                <td className="py-2.5 text-right font-semibold">{yr.equityPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

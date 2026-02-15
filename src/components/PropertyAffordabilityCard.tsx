import type { PropertyAnalysis, AffordabilityResult } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const VERDICT_STYLES: Record<
  string,
  { gradient: string; bg: string; text: string; icon: React.ReactNode; headline: string }
> = {
  comfortable: {
    gradient: "from-green-400 to-emerald-500",
    bg: "bg-green-50",
    text: "text-green-700",
    icon: (
      <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headline: "You can comfortably afford this property",
  },
  tight: {
    gradient: "from-yellow-400 to-amber-500",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: (
      <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    headline: "This property is affordable, but tight",
  },
  stretch: {
    gradient: "from-orange-400 to-red-400",
    bg: "bg-orange-50",
    text: "text-orange-700",
    icon: (
      <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    headline: "This property would stretch your budget",
  },
  over_budget: {
    gradient: "from-red-500 to-red-700",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: (
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headline: "This property is over your budget",
  },
};

interface Props {
  data: PropertyAnalysis;
  affordability: AffordabilityResult;
}

export default function PropertyAffordabilityCard({ data, affordability }: Props) {
  const style = VERDICT_STYLES[data.verdict] || VERDICT_STYLES.tight;
  const stretchPercent = Math.round(data.stretchFactor * 100);

  const priceDiff = data.vsRecommended.priceDifference;
  const paymentDiff = data.vsRecommended.paymentDifference;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Accent bar */}
      <div className={`h-1.5 bg-gradient-to-r ${style.gradient}`} />

      <div className="p-6 sm:p-8">
        {/* Verdict header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{style.headline}</h3>
            {data.property.address && (
              <p className="text-sm text-gray-500 mt-0.5">{data.property.address}</p>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              List Price
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {fmt(data.property.listingPrice)}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
              Monthly
            </p>
            <p className="text-lg sm:text-xl font-bold text-blue-900">
              {fmt(data.totalMonthlyWithHoa)}
            </p>
          </div>
          <div className={`text-center p-3 rounded-xl ${style.bg}`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${style.text}`}>
              Of Your Max
            </p>
            <p className={`text-lg sm:text-xl font-bold ${style.text}`}>{stretchPercent}%</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              DTI
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {data.dtiWithProperty.backEndRatio}%
            </p>
            <p className="text-[10px] text-gray-500">{data.dtiWithProperty.backEndStatus}</p>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-6 justify-center">
          <span>
            P&I: <strong className="text-gray-900">{fmt(data.monthlyPayment.principal + data.monthlyPayment.interest)}</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            Tax: <strong className="text-gray-900">{fmt(data.monthlyPayment.propertyTax)}</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            Insurance: <strong className="text-gray-900">{fmt(data.monthlyPayment.homeInsurance)}</strong>
          </span>
          {data.monthlyPayment.pmi > 0 && (
            <>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span>
                PMI: <strong className="text-gray-900">{fmt(data.monthlyPayment.pmi)}</strong>
              </span>
            </>
          )}
          {data.monthlyPayment.hoa > 0 && (
            <>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span>
                HOA: <strong className="text-gray-900">{fmt(data.monthlyPayment.hoa)}</strong>
              </span>
            </>
          )}
        </div>

        {/* Comparison row */}
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">vs. Your Max ({fmt(affordability.maxHomePrice)})</p>
            <p className={`text-sm font-semibold ${priceDiff > 0 && data.stretchFactor > 1 ? "text-red-600" : "text-green-600"}`}>
              {priceDiff > 0
                ? `${fmt(Math.abs(priceDiff))} above recommended`
                : `${fmt(Math.abs(priceDiff))} under recommended`}
            </p>
          </div>
          <div className="hidden sm:block w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">Monthly Difference</p>
            <p className={`text-sm font-semibold ${paymentDiff > 0 ? "text-red-600" : "text-green-600"}`}>
              {paymentDiff > 0
                ? `${fmt(Math.abs(paymentDiff))}/mo more`
                : `${fmt(Math.abs(paymentDiff))}/mo less`}
            </p>
          </div>
        </div>

        {/* Verdict explanation */}
        <div className={`p-4 rounded-lg ${style.bg} border border-opacity-50`}>
          <p className={`text-sm ${style.text}`}>{data.verdictExplanation}</p>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing – AI Home Research",
  description: "Compare Free and Pro plans for AI Home Research. Get more reports, unlimited chat, and unlimited saved reports with Pro.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic home research",
    features: [
      { text: "1 report per month", included: true },
      { text: "20 chat messages per day", included: true },
      { text: "3 saved reports", included: true },
      { text: "All AI agents & tools", included: true },
      { text: "Real-time market data", included: true },
      { text: "Shareable report links", included: true },
      { text: "Priority support", included: false },
    ],
    cta: "Current Plan",
    ctaDisabled: true,
    highlight: false,
  },
  {
    name: "Pro",
    price: "TBD",
    period: "/month",
    description: "For serious home buyers and professionals",
    features: [
      { text: "20 reports per month", included: true },
      { text: "Unlimited chat messages", included: true },
      { text: "Unlimited saved reports", included: true },
      { text: "All AI agents & tools", included: true },
      { text: "Real-time market data", included: true },
      { text: "Shareable report links", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Coming Soon",
    ctaDisabled: true,
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            App
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-bold text-gray-900">Pricing</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="text-gray-600 mt-2">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl border-2 p-6 space-y-6 ${
                plan.highlight
                  ? "border-blue-500 shadow-lg shadow-blue-100 relative"
                  : "border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                  Recommended
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={feature.included ? "text-gray-700" : "text-gray-400"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.ctaDisabled}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    : "bg-gray-100 text-gray-600 cursor-default"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">
            Have questions?{" "}
            <a href="mailto:pareshv23@gmail.com" className="text-blue-600 hover:text-blue-800 underline">
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

import type { PreApprovalReadinessScore } from "@/lib/types";

const levelConfig = {
  not_ready: { label: "Not Ready", bg: "bg-red-100", text: "text-red-800", border: "border-red-300", ring: "text-red-500" },
  needs_work: { label: "Needs Work", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", ring: "text-orange-500" },
  ready: { label: "Ready", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", ring: "text-yellow-500" },
  highly_prepared: { label: "Highly Prepared", bg: "bg-green-100", text: "text-green-800", border: "border-green-300", ring: "text-green-500" },
};

const priorityBadge = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const componentLabels: Record<string, string> = {
  dtiScore: "Debt-to-Income",
  creditScore: "Credit Score",
  downPaymentScore: "Down Payment",
  debtHealthScore: "Debt Health",
};

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 80 ? "bg-green-500"
      : pct >= 60 ? "bg-yellow-500"
      : pct >= 40 ? "bg-orange-500"
      : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{score}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PreApprovalReadinessCard({ data }: { data: PreApprovalReadinessScore }) {
  const config = levelConfig[data.level];

  return (
    <div>
      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-gray-100"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${data.overallScore * 0.9735} 97.35`}
              strokeLinecap="round"
              className={config.ring}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-semibold text-gray-900">{data.overallScore}</span>
          </div>
        </div>
        <div>
          <div className={`inline-block px-3 py-1 rounded-xl border font-semibold text-sm ${config.bg} ${config.text} ${config.border}`}>
            {config.label}
          </div>
          <p className="text-sm text-gray-500 mt-1">Pre-Approval Readiness Score</p>
        </div>
      </div>

      {/* Component Bars */}
      <div className="space-y-3 mb-6">
        {(Object.entries(data.components) as [string, number][]).map(([key, score]) => (
          <ScoreBar
            key={key}
            label={componentLabels[key] ?? key}
            score={score}
            max={25}
          />
        ))}
      </div>

      {data.actionItems.length === 0 && (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 font-medium">Excellent! Your financial profile is well-positioned for mortgage pre-approval.</p>
        </div>
      )}
    </div>
  );
}

import type { RiskReport } from "@/lib/types";

export default function RiskAssessmentCard({ data }: { data: RiskReport }) {
  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 border-green-300",
    moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
    high: "bg-red-100 text-red-800 border-red-300",
    very_high: "bg-red-200 text-red-900 border-red-400",
  };

  const severityIcon: Record<string, string> = {
    info: "text-blue-500",
    warning: "text-yellow-500",
    critical: "text-red-500",
  };

  return (
    <div>
      {/* Risk Score */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`px-4 py-2 rounded-lg border font-bold text-lg ${riskColors[data.overallRiskLevel]}`}>
          {data.overallRiskLevel.replace("_", " ").toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-gray-500">Risk Score</p>
          <p className="text-2xl font-bold">{data.overallScore}/100</p>
        </div>
      </div>

      {/* Risk Flags */}
      {data.riskFlags?.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Risk Flags</p>
          <div className="space-y-2">
            {data.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                <span className={`font-bold ${severityIcon[flag.severity]}`}>
                  {flag.severity === "critical" ? "!!!" : flag.severity === "warning" ? "!!" : "i"}
                </span>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase">[{flag.category}]</span>
                  <p className="text-gray-800">{flag.message}</p>
                  {flag.recommendation && (
                    <p className="text-gray-500 text-xs mt-1">{flag.recommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Fund */}
      {data.emergencyFundAnalysis && data.emergencyFundAnalysis.monthsCovered > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-700">Emergency Fund</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              data.emergencyFundAnalysis.adequate
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
              {data.emergencyFundAnalysis.adequate ? "Adequate" : "Insufficient"}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {data.emergencyFundAnalysis.monthsCovered} months covered after purchase
          </p>
        </div>
      )}

      {/* Stress Tests */}
      {data.stressTests?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Stress Tests</p>
          <div className="space-y-2">
            {data.stressTests.map((test, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-700">{test.scenario}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  test.severity === "manageable"
                    ? "bg-green-100 text-green-700"
                    : test.severity === "strained"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}>
                  {test.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

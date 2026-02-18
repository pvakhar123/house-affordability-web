import type { NeighborhoodInfo } from "@/lib/data/area-info";

function InfoSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
    </div>
  );
}

export default function NeighborhoodInfoCard({ data }: { data: NeighborhoodInfo }) {
  const colIndex = data.costOfLivingIndex;
  const colLabel =
    colIndex >= 120 ? "Well Above Average" :
    colIndex >= 105 ? "Above Average" :
    colIndex >= 95 ? "Near Average" :
    "Below Average";
  const colColor =
    colIndex >= 120 ? "text-red-600" :
    colIndex >= 105 ? "text-orange-600" :
    colIndex >= 95 ? "text-green-600" :
    "text-green-700";

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Neighborhood overview for <strong className="text-gray-900">{data.location}</strong>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <InfoSection label="Schools" value={data.schools} />
        <InfoSection label="Transit & Commute" value={data.transit} />
        <InfoSection label="Safety" value={data.safety} />
        <InfoSection label="Parks & Recreation" value={data.parks} />
        <InfoSection label="Things to Do" value={data.thingsToDo} />
        <InfoSection label="Walkability" value={data.walkability} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 pt-3 border-t border-gray-100">
        <span>School Rating: <strong className="text-gray-900">{data.schoolRating}</strong></span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span>Cost of Living: <strong className={colColor}>{colIndex} ({colLabel})</strong></span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span>Property Tax: <strong className="text-gray-900">{(data.propertyTaxRate * 100).toFixed(2)}%</strong></span>
      </div>
    </div>
  );
}

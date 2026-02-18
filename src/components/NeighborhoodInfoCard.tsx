import type { NeighborhoodInfo } from "@/lib/data/area-info";

function InfoSection({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl flex gap-3.5">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

/* ── SVG icons (Heroicons-style, 20×20) ── */

function SchoolIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84 51.39 51.39 0 0 0-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

function TransitIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function SafetyIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function ParksIcon() {
  return (
    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6m0 0c-3.5 0-6-2-7-4h14c-1 2-3.5 4-7 4Zm0-6c-2.5 0-4.5-1.5-5.5-3h11c-1 1.5-3 3-5.5 3Zm0-5c-1.5 0-3-1-3.5-2h7c-.5 1-2 2-3.5 2ZM12 4v1" />
    </svg>
  );
}

function ThingsToDoIcon() {
  return (
    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function WalkabilityIcon() {
  return (
    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
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
        <InfoSection label="Schools" value={data.schools} icon={<SchoolIcon />} color="bg-blue-100" />
        <InfoSection label="Transit & Commute" value={data.transit} icon={<TransitIcon />} color="bg-indigo-100" />
        <InfoSection label="Safety" value={data.safety} icon={<SafetyIcon />} color="bg-emerald-100" />
        <InfoSection label="Parks & Recreation" value={data.parks} icon={<ParksIcon />} color="bg-green-100" />
        <InfoSection label="Things to Do" value={data.thingsToDo} icon={<ThingsToDoIcon />} color="bg-amber-100" />
        <InfoSection label="Walkability" value={data.walkability} icon={<WalkabilityIcon />} color="bg-purple-100" />
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

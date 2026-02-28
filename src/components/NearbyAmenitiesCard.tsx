"use client";

import { useState, useEffect } from "react";
import type { NearbyAmenity, GeoCoordinates } from "@/lib/types";

const TABS = [
  { key: "grocery", label: "Grocery", icon: "🛒", color: "bg-green-500" },
  { key: "restaurants", label: "Dining", icon: "🍽️", color: "bg-orange-500" },
  { key: "schools", label: "Schools", icon: "🎓", color: "bg-indigo-500" },
  { key: "parks", label: "Parks", icon: "🌳", color: "bg-emerald-500" },
  { key: "transit", label: "Transit", icon: "🚇", color: "bg-blue-500" },
  { key: "medical", label: "Medical", icon: "🏥", color: "bg-red-500" },
  { key: "fitness", label: "Fitness", icon: "💪", color: "bg-pink-500" },
];

interface Props {
  coordinates: GeoCoordinates;
  onAmenitiesLoaded?: (amenities: NearbyAmenity[]) => void;
}

export default function NearbyAmenitiesCard({ coordinates, onAmenitiesLoaded }: Props) {
  const [activeTab, setActiveTab] = useState("grocery");
  const [amenities, setAmenities] = useState<NearbyAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/nearby-places?lat=${coordinates.lat}&lng=${coordinates.lng}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        setAmenities(data.amenities || []);
        onAmenitiesLoaded?.(data.amenities || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates.lat, coordinates.lng]);

  const filtered = amenities.filter((a) => a.category === activeTab);

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((tab) => {
          const count = amenities.filter((a) => a.category === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-white/20" : "bg-gray-200"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 py-4 text-center">{error}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase() || "places"} found nearby
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((amenity, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-10 h-10 rounded-lg ${TABS.find((t) => t.key === amenity.category)?.color ?? "bg-gray-400"} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                {TABS.find((t) => t.key === amenity.category)?.icon ?? "📍"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{amenity.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {amenity.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-yellow-500">★</span>
                      {amenity.rating.toFixed(1)}
                      {amenity.userRatingsTotal > 0 && (
                        <span className="text-gray-400">({amenity.userRatingsTotal.toLocaleString()})</span>
                      )}
                    </span>
                  )}
                  <span>{amenity.distance}</span>
                </div>
                {amenity.address && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{amenity.address}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

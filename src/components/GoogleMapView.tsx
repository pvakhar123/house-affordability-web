"use client";

import { useState, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import type { MatchingProperty, NearbyAmenity, GeoCoordinates } from "@/lib/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const AMENITY_COLORS: Record<string, string> = {
  grocery: "#34c759",
  restaurants: "#ff9500",
  schools: "#5856d6",
  parks: "#30d158",
  transit: "#007aff",
  medical: "#ff3b30",
  fitness: "#ff2d55",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

interface Props {
  center: GeoCoordinates;
  properties?: MatchingProperty[];
  locationLabel?: string;
  amenities?: NearbyAmenity[];
}

export default function GoogleMapView({ center, properties, locationLabel, amenities }: Props) {
  const [selected, setSelected] = useState<{ type: "property" | "amenity"; index: number } | null>(null);

  const handleMapClick = useCallback(() => setSelected(null), []);

  if (!API_KEY) {
    return (
      <div className="h-[350px] rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400">
        Map unavailable — API key not configured
      </div>
    );
  }

  const propertiesWithCoords = (properties ?? []).filter((p) => p.lat && p.lng);

  return (
    <div className="h-[350px] rounded-xl overflow-hidden border border-gray-200">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="cooperative"
          mapId="DEMO_MAP_ID"
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Primary location marker */}
          <AdvancedMarker position={center} title={locationLabel || "Your location"}>
            <div className="w-8 h-8 rounded-full bg-blue-600 border-3 border-white shadow-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
          </AdvancedMarker>

          {/* Property markers */}
          {propertiesWithCoords.map((p, i) => (
            <AdvancedMarker
              key={`prop-${i}`}
              position={{ lat: p.lat!, lng: p.lng! }}
              title={p.address}
              onClick={() => setSelected({ type: "property", index: i })}
            >
              <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap border border-white">
                {fmt(p.price)}
              </div>
            </AdvancedMarker>
          ))}

          {/* Amenity markers */}
          {(amenities ?? []).map((a, i) => (
            <AdvancedMarker
              key={`amenity-${i}`}
              position={{ lat: a.lat, lng: a.lng }}
              title={a.name}
              onClick={() => setSelected({ type: "amenity", index: i })}
            >
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: AMENITY_COLORS[a.category] ?? "#8e8e93" }}
              />
            </AdvancedMarker>
          ))}

          {/* Property info window */}
          {selected?.type === "property" && propertiesWithCoords[selected.index] && (() => {
            const p = propertiesWithCoords[selected.index];
            return (
              <InfoWindow
                position={{ lat: p.lat!, lng: p.lng! }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="text-xs max-w-[200px]">
                  <p className="font-semibold text-gray-900">{fmt(p.price)}</p>
                  <p className="text-gray-600 mt-0.5">{p.address}</p>
                  <p className="text-gray-500 mt-0.5">
                    {p.bedrooms}bd / {p.bathrooms}ba
                    {p.squareFootage ? ` · ${p.squareFootage.toLocaleString()} sqft` : ""}
                  </p>
                </div>
              </InfoWindow>
            );
          })()}

          {/* Amenity info window */}
          {selected?.type === "amenity" && amenities?.[selected.index] && (() => {
            const a = amenities[selected.index];
            return (
              <InfoWindow
                position={{ lat: a.lat, lng: a.lng }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="text-xs max-w-[200px]">
                  <p className="font-semibold text-gray-900">{a.name}</p>
                  <p className="text-gray-500 mt-0.5">{a.categoryLabel} · {a.distance}</p>
                  {a.rating > 0 && (
                    <p className="text-gray-500 mt-0.5">
                      {"★".repeat(Math.round(a.rating))} {a.rating.toFixed(1)}
                      {a.userRatingsTotal > 0 && ` (${a.userRatingsTotal})`}
                    </p>
                  )}
                </div>
              </InfoWindow>
            );
          })()}
        </Map>
      </APIProvider>
    </div>
  );
}

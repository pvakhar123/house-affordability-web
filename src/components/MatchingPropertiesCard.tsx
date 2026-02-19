"use client";

import { useEffect, useState } from "react";
import type { AffordabilityResult, MarketDataResult, MatchingProperty } from "@/lib/types";

interface Props {
  affordability: AffordabilityResult;
  marketData: MarketDataResult;
  location: string;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const fallbackGradients = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
];

function PropertyCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-40" />
      </div>
    </div>
  );
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" opacity={0.15}>
      <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
    </svg>
  );
}

export default function MatchingPropertiesCard({ affordability, marketData, location }: Props) {
  const [properties, setProperties] = useState<MatchingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProperties() {
      try {
        const res = await fetch("/api/matching-properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            maxPrice: affordability.maxHomePrice,
            recommendedPrice: affordability.recommendedHomePrice,
            downPaymentPercent: affordability.downPaymentPercent,
            interestRate: marketData.mortgageRates.thirtyYearFixed,
          }),
        });

        if (!cancelled) {
          const data = await res.json();
          setProperties(data.properties || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchProperties();
    return () => { cancelled = true; };
  }, [affordability, marketData, location]);

  if (error || (!loading && properties.length === 0)) return null;

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
          <h3 className="text-base font-semibold text-gray-900">Properties in Your Budget</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Real listings near {location} matching your budget</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </>
          ) : (
            properties.map((property, i) => {
              const CardWrapper = property.listingUrl ? "a" : "div";
              const linkProps = property.listingUrl
                ? { href: property.listingUrl, target: "_blank", rel: "noopener noreferrer" }
                : {};

              return (
                <CardWrapper
                  key={property.zpid || i}
                  {...linkProps}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow group block"
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden">
                    {property.imageUrl ? (
                      <img
                        src={property.imageUrl}
                        alt={`${property.address}, ${property.city}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${fallbackGradients[i % fallbackGradients.length]} flex items-center justify-center`}>
                        <HouseIcon className="w-24 h-24 text-white" />
                      </div>
                    )}

                    {/* Price overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-2 px-3">
                      <span className="text-lg font-bold text-white">
                        {fmt(property.price)}
                      </span>
                    </div>

                    {/* Property type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm">
                        {property.propertyType}
                      </span>
                    </div>

                    {/* Days on market */}
                    {property.daysOnMarket != null && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/90 text-gray-700">
                          {property.daysOnMarket}d ago
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-3">
                    {/* Beds / Baths / SqFt */}
                    <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                      {property.bedrooms > 0 && <span>{property.bedrooms} bd</span>}
                      {property.bedrooms > 0 && property.bathrooms > 0 && <span className="text-gray-300">|</span>}
                      {property.bathrooms > 0 && <span>{property.bathrooms} ba</span>}
                      {property.squareFootage > 0 && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{property.squareFootage.toLocaleString()} sqft</span>
                        </>
                      )}
                    </div>

                    {/* Address */}
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {property.address}
                      {property.city && `, ${property.city}`}
                      {property.state && `, ${property.state}`}
                      {property.zipCode && ` ${property.zipCode}`}
                    </p>

                    {/* Monthly estimate + price per sqft */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      {property.estimatedMonthlyPayment && (
                        <span>Est. {fmt(property.estimatedMonthlyPayment)}/mo</span>
                      )}
                      {property.estimatedMonthlyPayment && property.pricePerSqFt && (
                        <span>&middot;</span>
                      )}
                      {property.pricePerSqFt && (
                        <span>{fmt(property.pricePerSqFt)}/sqft</span>
                      )}
                    </div>

                    {/* Highlights */}
                    {property.highlights?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {property.highlights.map((h, j) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              h === "Below budget"
                                ? "bg-green-50 text-green-700"
                                : h === "Stretch buy"
                                  ? "bg-orange-50 text-orange-700"
                                  : h === "New listing"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* View listing link */}
                    {property.listingUrl && (
                      <p className="text-xs text-blue-500 mt-2 group-hover:underline">
                        View listing &rarr;
                      </p>
                    )}
                  </div>
                </CardWrapper>
              );
            })
          )}
        </div>
      </div>

      <div className="px-6 pb-4">
        <p className="text-xs text-gray-400">
          Real listings via Realtor.com. Prices and availability may change. Contact a local agent for details.
        </p>
      </div>
    </div>
  );
}

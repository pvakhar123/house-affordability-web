export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface CommuteLeg {
  duration: string;
  durationMinutes: number;
  distance: string;
}

export interface CommuteResult {
  driving: CommuteLeg | null;
  transit: CommuteLeg | null;
}

export interface NearbyAmenity {
  name: string;
  category: string;
  categoryLabel: string;
  rating: number;
  userRatingsTotal: number;
  address: string;
  distance: string;
  lat: number;
  lng: number;
}

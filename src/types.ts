export type Environment = "indoor" | "outdoor" | "mixed";

export interface ResolvedCity {
  name: string;
  nameZh: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  adcode: string;
  population?: number;
}

export interface Attraction {
  id: string;
  nameZh: string;
  nameEn?: string;
  environment: Environment;
  typecode: string;
  category?: string;
  rating?: number;
  photo?: string | null;
  address?: string;
  location: string;
  lat: number;
  lon: number;
  relevanceRank: number;
}

export interface ForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipProb: number;
  weatherCode: number;
}

export interface DayWeather {
  summary: string;
  tempMaxC: number;
  tempMinC: number;
  precipProb: number;
  weatherCode: number;
}

export interface RankedAttraction {
  id: string;
  name_zh: string;
  environment: Environment;
  category?: string;
  location: string;
  advisories: string[];
  reason: string;
  introduction: string;
  image: string | null;
  lat: number;
  lon: number;
}

export interface ItineraryStop {
  slot: string;
  label: string;
  id: string;
  name_zh: string;
  environment: Environment;
  visitMinutes: number;
  startTime: string;
  endTime: string;
  lat: number;
  lon: number;
}

/** A clustered stop before the day schedule assigns start/end times. */
export type ItineraryStopDraft = Omit<ItineraryStop, "startTime" | "endTime">;

export interface HotelFilters {
  star?: 3 | 4 | 5;
  priceMin?: number;
  priceMax?: number;
}

export interface Hotel {
  id: string;
  name_zh: string;
  star?: number;
  price?: number;
  rating?: number;
  address?: string;
  image: string | null;
  reason: string;
  primary: boolean;
  brand?: string;
  lat: number;
  lon: number;
}

export type RouteMode = "walk" | "drive";

export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  mode: RouteMode;
}

export interface DayRoute {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
}

export interface DayRecommendation {
  date: string;
  weather: DayWeather;
  advice: string;
  attractions: RankedAttraction[];
  itinerary: ItineraryStop[];
  route: DayRoute;
  totalMinutes: number;
}

export interface Recommendation {
  lang: import("./i18n.js").Lang;
  city: { name: string; name_zh: string; admin1: string; lat: number; lon: number };
  hotels: Hotel[];
  hotelFilters: HotelFilters;
  days: DayRecommendation[];
  summary: string;
  notices: string[];
}

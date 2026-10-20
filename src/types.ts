import type { Lang } from "./i18n.js";

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
  location: string;
  advisories: string[];
  reason: string;
  introduction: string;
  image: string | null;
}

export interface ItineraryStop {
  slot: string;
  label: string;
  id: string;
  name_zh: string;
  environment: Environment;
}

export interface DayRecommendation {
  date: string;
  weather: DayWeather;
  advice: string;
  attractions: RankedAttraction[];
  itinerary: ItineraryStop[];
}

export interface Recommendation {
  lang: Lang;
  city: { name: string; name_zh: string; admin1: string; lat: number; lon: number };
  days: DayRecommendation[];
  summary: string;
  notices: string[];
}

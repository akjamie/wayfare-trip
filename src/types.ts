export type Environment = "indoor" | "outdoor" | "mixed";

export interface ResolvedCity {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  population?: number;
}

export interface Attraction {
  id: string;
  nameZh: string;
  environment: Environment;
  typecode: string;
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
}

export interface DayRecommendation {
  date: string;
  weather: DayWeather;
  advice: string;
  attractions: RankedAttraction[];
}

export interface Recommendation {
  city: { name: string; admin1: string; lat: number; lon: number };
  days: DayRecommendation[];
  summary: string;
  notices: string[];
}

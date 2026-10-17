import { getJson, type FetchLike } from "./http.js";
import { AppError } from "./errors.js";
import type { ResolvedCity } from "./types.js";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  admin1?: string;
  population?: number;
}

/**
 * Resolve a city name (Chinese, pinyin, or English) to a single canonical
 * Chinese city. Constrained to country=CN; same-named cities are disambiguated
 * by highest population.
 */
export async function resolveCity(
  name: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<ResolvedCity> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(name)}&count=20&language=en&format=json`;

  let data: { results?: GeoResult[] };
  try {
    data = await getJson(fetchImpl, url, timeoutMs);
  } catch {
    throw AppError.unknownCity();
  }

  const results = (data?.results ?? []).filter(
    (r) => r && r.country_code === "CN",
  );
  if (results.length === 0) throw AppError.unknownCity();

  const top = results
    .slice()
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];

  return {
    name: top.name,
    admin1: top.admin1 ?? "",
    country: top.country_code,
    lat: top.latitude,
    lon: top.longitude,
    population: top.population,
  };
}

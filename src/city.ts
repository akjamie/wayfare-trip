import { getJson, type FetchLike } from "./http.js";
import { AppError, type CityCandidate } from "./errors.js";
import { logUpstreamError } from "./log.js";
import type { Config } from "./config.js";
import type { ResolvedCity } from "./types.js";
import {
  CITY_ALIASES,
  PROVINCE_ALIASES,
  normalizeCityKey,
  type CityAlias,
} from "./data/cities.js";

function fromAlias(a: CityAlias): ResolvedCity {
  return {
    name: a.name,
    nameZh: a.nameZh,
    admin1: a.admin1,
    country: "CN",
    lat: a.lat,
    lon: a.lon,
    adcode: a.adcode,
  };
}

function findCityAlias(key: string): CityAlias | undefined {
  return CITY_ALIASES.find(
    (a) =>
      normalizeCityKey(a.nameZh) === key ||
      normalizeCityKey(a.name) === key ||
      a.pinyin.some((p) => normalizeCityKey(p) === key),
  );
}

/**
 * Resolve a city name (Chinese / pinyin / English) to a single canonical Chinese
 * city. Alias table first (offline), then Amap geocode fallback. Accepts only
 * city-level (level=市) matches; multiple -> ambiguous_city; geocode failure ->
 * attraction_source_unavailable (not unknown_city).
 */
export async function resolveCity(
  name: string,
  cfg: Config,
  fetchImpl: FetchLike,
): Promise<ResolvedCity> {
  const key = normalizeCityKey(name);

  const alias = findCityAlias(key);
  if (alias) return fromAlias(alias);

  const province = PROVINCE_ALIASES.find(
    (p) =>
      normalizeCityKey(p.nameZh) === key ||
      p.pinyin.some((x) => normalizeCityKey(x) === key),
  );
  if (province) {
    const capital = CITY_ALIASES.find((a) => a.nameZh === province.cityNameZh);
    if (capital) return fromAlias(capital);
  }

  const url =
    "https://restapi.amap.com/v3/geocode/geo" +
    `?address=${encodeURIComponent(name)}&key=${encodeURIComponent(cfg.amapKey)}`;

  let data: any;
  try {
    data = await getJson(fetchImpl, url, cfg.timeoutMs);
  } catch (err) {
    logUpstreamError("attraction_source_unavailable", err);
    throw AppError.attractionSourceUnavailable();
  }
  if (data?.status !== "1") {
    logUpstreamError(
      "attraction_source_unavailable",
      `geocode status=${data?.status} infocode=${data?.infocode}`,
    );
    throw AppError.attractionSourceUnavailable();
  }

  const geocodes = Array.isArray(data.geocodes) ? data.geocodes : [];
  const cityLevel = geocodes.filter((g: any) => g && g.adcode && g.level === "市");
  if (cityLevel.length === 0) throw AppError.unknownCity();
  if (cityLevel.length > 1) {
    const candidates: CityCandidate[] = cityLevel.map((g: any) => ({
      name: String(g.city ?? name),
      name_zh: String(g.city ?? name),
      adcode: String(g.adcode),
    }));
    throw AppError.ambiguousCity(candidates);
  }

  const g = cityLevel[0];
  const [lng, lat] = String(g.location ?? "0,0").split(",").map(Number);
  return {
    name: String(g.city ?? name),
    nameZh: String(g.city ?? name),
    admin1: String(g.province ?? ""),
    country: "CN",
    lat: lat || 0,
    lon: lng || 0,
    adcode: String(g.adcode),
  };
}

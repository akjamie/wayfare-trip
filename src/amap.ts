import { getJson, type FetchLike } from "./http.js";
import { AppError } from "./errors.js";
import { logUpstreamError } from "./log.js";
import type { Attraction, Environment } from "./types.js";
import type { Config } from "./config.js";

export interface EnvironmentMap {
  byCode: Record<string, Environment>;
  byPrefix: Array<[string, Environment]>;
}

/**
 * Default Amap typecode -> environment mapping.
 * Scenic (`110xxx`) and museum/culture (`140xxx`) codes. Unmapped -> "mixed".
 */
export const DEFAULT_ENVIRONMENT_MAP: EnvironmentMap = {
  byCode: {
    "110104": "indoor", // aquarium
    "110204": "indoor", // memorial hall
    "110205": "mixed", // temple / daoist
    "110206": "mixed", // church
  },
  byPrefix: [
    ["1401", "indoor"], // museum
    ["1402", "indoor"], // exhibition hall
    ["1403", "indoor"], // convention & exhibition center
    ["1404", "indoor"], // art gallery
    ["1405", "indoor"], // library
    ["1406", "indoor"], // science & technology museum
    ["1407", "indoor"], // planetarium
    ["1408", "indoor"], // cultural palace
    ["1409", "indoor"], // archives
    ["1101", "outdoor"], // park & square
    ["1102", "outdoor"], // scenery
    ["1103", "outdoor"],
    ["1104", "outdoor"],
    ["1105", "outdoor"],
  ],
};

export function environmentForTypecode(
  typecode: string,
  map: EnvironmentMap = DEFAULT_ENVIRONMENT_MAP,
): Environment {
  if (map.byCode[typecode]) return map.byCode[typecode];
  for (const [prefix, env] of map.byPrefix) {
    if (typecode.startsWith(prefix)) return env;
  }
  return "mixed";
}

function toAttraction(poi: any, rank: number): Attraction {
  const loc = String(poi?.location ?? "");
  const [lngStr, latStr] = loc.split(",");
  const typecode = String(poi?.typecode ?? "");
  const photos = Array.isArray(poi?.photos) ? poi.photos : [];
  const photoUrl = photos
    .map((p: any) => String(p?.url ?? ""))
    .find((u: string) => u.startsWith("https://"));
  const ratingRaw = poi?.biz_ext?.rating;
  const rating = ratingRaw !== undefined && ratingRaw !== "" ? Number(ratingRaw) : undefined;
  const typeStr = poi?.type ? String(poi.type) : "";
  const category = typeStr
    ? typeStr.split(";").map((s: string) => s.trim()).filter(Boolean).pop()
    : undefined;
  return {
    id: String(poi?.id ?? ""),
    nameZh: String(poi?.name ?? ""),
    environment: environmentForTypecode(typecode),
    typecode,
    category,
    rating: Number.isFinite(rating) ? rating : undefined,
    photo: photoUrl ?? null,
    address: poi?.address ? String(poi.address) : undefined,
    location: loc,
    lat: Number(latStr) || 0,
    lon: Number(lngStr) || 0,
    relevanceRank: rank,
  };
}

export class AmapClient {
  private readonly cache = new Map<string, { value: Attraction[]; expires: number }>();
  private readonly inflight = new Map<string, Promise<Attraction[]>>();
  private readonly adcodeCache = new Map<string, { value: string; expires: number }>();

  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly key: string,
    private readonly cfg: Config,
  ) {}

  /** City-level adcode from coordinates via Amap reverse geocoding (cached by coords). */
  async adcodeFor(lat: number, lon: number): Promise<string> {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = this.adcodeCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;

    const url =
      "https://restapi.amap.com/v3/geocode/regeo" +
      `?location=${encodeURIComponent(`${lon},${lat}`)}&key=${encodeURIComponent(this.key)}`;
    let data: any;
    try {
      data = await getJson(this.fetchImpl, url, this.cfg.timeoutMs);
    } catch (err) {
      logUpstreamError("attraction_source_unavailable", err);
      throw AppError.attractionSourceUnavailable();
    }
    if (data?.status !== "1") throw AppError.attractionSourceUnavailable();
    const adcode = data?.regeocode?.addressComponent?.adcode;
    if (!adcode) throw AppError.attractionSourceUnavailable();

    const value = String(adcode);
    this.adcodeCache.set(key, { value, expires: Date.now() + this.cfg.cacheTtlMs });
    return value;
  }

  /** Scenic/museum attractions for a city, cached by adcode with a TTL. */
  async attractions(adcode: string): Promise<Attraction[]> {
    const cached = this.cache.get(adcode);
    if (cached && cached.expires > Date.now()) return cached.value;

    const existing = this.inflight.get(adcode);
    if (existing) return existing;

    const promise = this.fetchAttractions(adcode).finally(() =>
      this.inflight.delete(adcode),
    );
    this.inflight.set(adcode, promise);
    return promise;
  }

  private async fetchAttractions(adcode: string): Promise<Attraction[]> {
    const url =
      "https://restapi.amap.com/v3/place/text" +
      `?key=${encodeURIComponent(this.key)}` +
      `&types=${encodeURIComponent(this.cfg.amapTypes)}` +
      `&city=${encodeURIComponent(adcode)}&citylimit=true` +
      `&offset=25&page=1&extensions=all`;

    let data: any;
    try {
      data = await getJson(this.fetchImpl, url, this.cfg.timeoutMs);
    } catch (err) {
      logUpstreamError("attraction_source_unavailable", err);
      throw AppError.attractionSourceUnavailable();
    }
    // status "0" covers quota exhaustion (infocode 10003), invalid key, etc.
    if (data?.status !== "1") {
      logUpstreamError("attraction_source_unavailable", `amap status=${data?.status} infocode=${data?.infocode}`);
      throw AppError.attractionSourceUnavailable();
    }

    const pois = Array.isArray(data.pois) ? data.pois : [];
    const attractions = pois
      .filter((p: any) => p && p.id)
      .map((p: any, i: number) => toAttraction(p, i));

    this.cache.set(adcode, {
      value: attractions,
      expires: Date.now() + this.cfg.cacheTtlMs,
    });
    return attractions;
  }
}

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

export interface HotelPoi {
  id: string;
  nameZh: string;
  typecode: string;
  star?: number;
  price?: number;
  rating?: number;
  address?: string;
  image: string | null;
  relevanceRank: number;
  lat: number;
  lon: number;
}

export interface LegTime {
  distanceKm: number;
  durationMin: number;
}

/** Amap hotel typecode -> star level (minimum-filter basis). */
export function hotelStarFromTypecode(typecode: string): number | undefined {
  switch (typecode) {
    case "100101": // luxury
    case "100102": // five-star
      return 5;
    case "100103":
      return 4;
    case "100104":
      return 3;
    case "100105": // economy chain
      return 2;
    default:
      return undefined;
  }
}

/** Fallback: derive star from the human-readable Amap type string. */
export function hotelStarFromType(typeStr: string): number | undefined {
  if (!typeStr) return undefined;
  if (typeStr.includes("五星") || typeStr.includes("奢华")) return 5;
  if (typeStr.includes("四星")) return 4;
  if (typeStr.includes("三星")) return 3;
  if (typeStr.includes("经济")) return 2;
  return undefined;
}

function toHotelPoi(poi: any, rank: number): HotelPoi {
  const loc = String(poi?.location ?? "");
  const [lngStr, latStr] = loc.split(",");
  const typecode = String(poi?.typecode ?? "");
  const photos = Array.isArray(poi?.photos) ? poi.photos : [];
  const image =
    photos.map((p: any) => String(p?.url ?? "")).find((u: string) => u.startsWith("https://")) ?? null;
  const priceRaw = poi?.biz_ext?.cost;
  const ratingRaw = poi?.biz_ext?.rating;
  const priceNum = priceRaw !== undefined && priceRaw !== "" ? Number(priceRaw) : NaN;
  const rating = ratingRaw !== undefined && ratingRaw !== "" ? Number(ratingRaw) : undefined;
  return {
    id: String(poi?.id ?? ""),
    nameZh: String(poi?.name ?? ""),
    typecode,
    star: hotelStarFromTypecode(typecode) ?? hotelStarFromType(String(poi?.type ?? "")),
    // Amap returns "0" when cost is unknown -> treat non-positive as unknown.
    price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    address: poi?.address ? String(poi.address) : undefined,
    image,
    relevanceRank: rank,
    lat: Number(latStr) || 0,
    lon: Number(lngStr) || 0,
  };
}

export class AmapClient {
  private readonly cache = new Map<string, { value: Attraction[]; expires: number }>();
  private readonly inflight = new Map<string, Promise<Attraction[]>>();
  private readonly adcodeCache = new Map<string, { value: string; expires: number }>();
  private readonly hotelCache = new Map<string, { value: HotelPoi[]; expires: number }>();
  private readonly hotelInflight = new Map<string, Promise<HotelPoi[]>>();
  private readonly directionCache = new Map<string, { value: LegTime; expires: number }>();

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

  /** Hotel POIs for a city, cached per adcode+star. Star maps to hotel typecodes. */
  async hotels(adcode: string, star?: 3 | 4 | 5): Promise<HotelPoi[]> {
    const cacheKey = `${adcode}:${star ?? 0}`;
    const cached = this.hotelCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    const existing = this.hotelInflight.get(cacheKey);
    if (existing) return existing;

    const promise = this.fetchHotels(adcode, star).finally(() =>
      this.hotelInflight.delete(cacheKey),
    );
    this.hotelInflight.set(cacheKey, promise);
    return promise;
  }

  /**
   * Star -> hotel typecodes: the Amap query filters by real hotel class, so a
   * starred request returns actually-starred hotels even when free-tier data
   * rarely tags them post-hoc.
   */
  private hotelTypesForStar(star?: 3 | 4 | 5): string {
    if (star === 5) return "100101|100102";
    if (star === 4) return "100101|100102|100103";
    if (star === 3) return "100101|100102|100103|100104";
    return this.cfg.hotelTypes; // no filter: all real hotels
  }

  private async fetchHotels(adcode: string, star?: 3 | 4 | 5): Promise<HotelPoi[]> {
    // Amap ranks by its own relevance and buries large hotels pages deep for
    // small cities — paginate so the whole result set is visible.
    const MAX_PAGES = 4;
    const PER_PAGE = 25;
    const raw: any[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url =
        "https://restapi.amap.com/v3/place/text" +
        `?key=${encodeURIComponent(this.key)}` +
        `&types=${encodeURIComponent(this.hotelTypesForStar(star))}&city=${encodeURIComponent(adcode)}&citylimit=true` +
        `&offset=${PER_PAGE}&page=${page}&extensions=all`;
      let data: any;
      try {
        data = await getJson(this.fetchImpl, url, this.cfg.timeoutMs);
      } catch (err) {
        if (page === 1) {
          logUpstreamError("attraction_source_unavailable", err);
          throw AppError.attractionSourceUnavailable();
        }
        break; // later pages are best-effort
      }
      if (data?.status !== "1") {
        if (page === 1) {
          logUpstreamError(
            "attraction_source_unavailable",
            `hotel status=${data?.status} infocode=${data?.infocode}`,
          );
          throw AppError.attractionSourceUnavailable();
        }
        break;
      }
      const pois = Array.isArray(data.pois) ? data.pois : [];
      for (const p of pois) {
        if (p && p.id && !seen.has(p.id)) {
          seen.add(p.id);
          raw.push(p);
        }
      }
      if (pois.length < PER_PAGE) break; // last page
    }

    // Drop compound "place-name + lodging" POIs (e.g. typecode 190108|100100).
    const hotels = raw
      .filter((p: any) => p && p.id && !String(p?.typecode ?? "").includes("1901"))
      .map((p: any, i: number) => toHotelPoi(p, i));
    const cacheKey = `${adcode}:${star ?? 0}`;
    this.hotelCache.set(cacheKey, { value: hotels, expires: Date.now() + this.cfg.cacheTtlMs });
    return hotels;
  }

  /** Real road distance/duration from the Amap direction API (cached per leg). */
  async direction(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
    mode: "walk" | "drive",
  ): Promise<LegTime> {
    const key = `${mode}:${from.lat.toFixed(5)},${from.lon.toFixed(5)}->${to.lat.toFixed(5)},${to.lon.toFixed(5)}`;
    const cached = this.directionCache.get(key);
    if (cached && cached.expires > Date.now()) return { ...cached.value };

    const endpoint =
      mode === "walk"
        ? "https://restapi.amap.com/v3/direction/walking"
        : "https://restapi.amap.com/v3/direction/driving";
    const url =
      `${endpoint}?origin=${encodeURIComponent(`${from.lon},${from.lat}`)}` +
      `&destination=${encodeURIComponent(`${to.lon},${to.lat}`)}` +
      `&key=${encodeURIComponent(this.key)}`;
    let data: any;
    try {
      data = await getJson(this.fetchImpl, url, this.cfg.timeoutMs);
    } catch (err) {
      logUpstreamError("attraction_source_unavailable", err);
      throw AppError.attractionSourceUnavailable();
    }
    if (data?.status !== "1") {
      logUpstreamError(
        "attraction_source_unavailable",
        `direction status=${data?.status} infocode=${data?.infocode}`,
      );
      throw AppError.attractionSourceUnavailable();
    }
    const path = data?.route?.paths?.[0];
    const distanceM = Number(path?.distance);
    const durationS = Number(path?.duration);
    if (!Number.isFinite(distanceM) || !Number.isFinite(durationS)) {
      throw AppError.attractionSourceUnavailable();
    }
    const value: LegTime = {
      distanceKm: Math.round((distanceM / 1000) * 10) / 10,
      durationMin: Math.round(durationS / 60),
    };
    this.directionCache.set(key, { value, expires: Date.now() + this.cfg.cacheTtlMs });
    return value;
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

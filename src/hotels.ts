import type { HotelPoi } from "./amap.js";
import type { Hotel, HotelFilters } from "./types.js";
import { haversineKm, type Point } from "./route.js";
import { t, type Lang } from "./i18n.js";

const MAX_HOTELS = 3;

/** Only real hotels (generic 100000 / hostels 100200|100201 are excluded upstream). */
const REAL_HOTEL_TYPECODES = new Set([
  "100100",
  "100101",
  "100102",
  "100103",
  "100104",
  "100105",
]);

export function isRealHotel(typecode: string): boolean {
  return REAL_HOTEL_TYPECODES.has(typecode);
}

export function brandFor(name: string, brands: string[]): string | undefined {
  const n = name.toLowerCase();
  return brands.find((b) => n.toLowerCase().includes(b.toLowerCase()));
}

/**
 * Filter (real hotels, minimum star, price range) and rank:
 *   Amap relevance (relevanceRank asc) → mainstream-brand boost → rating desc
 *   (missing last) → distance to centroid asc → POI id asc.
 * Returns up to 3 hotels; the first is the primary.
 */
export function filterAndRankHotels(
  pois: HotelPoi[],
  filters: HotelFilters,
  centroid: Point,
  lang: Lang,
  brands: string[] = [],
): Hotel[] {
  const filtered = pois.filter((p) => {
    if (!isRealHotel(p.typecode)) return false;
    if (filters.star !== undefined) {
      if (p.star === undefined || p.star < filters.star) return false;
    }
    const hasPriceBound = filters.priceMin !== undefined || filters.priceMax !== undefined;
    if (hasPriceBound) {
      if (p.price === undefined) return false;
      if (filters.priceMin !== undefined && p.price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && p.price > filters.priceMax) return false;
    }
    return true;
  });

  const ranked = filtered
    .map((p) => ({
      p,
      brand: brandFor(p.nameZh, brands),
      distance: haversineKm(centroid, { lat: p.lat, lon: p.lon }),
    }))
    .sort((a, b) => {
      // High-star hotels first (unknown level last).
      const sa = a.p.star;
      const sb = b.p.star;
      if (sa !== undefined && sb === undefined) return -1;
      if (sa === undefined && sb !== undefined) return 1;
      if (sa !== undefined && sb !== undefined && sa !== sb) return sb - sa;
      // Mainstream-brand boost (brand before non-brand).
      if (!!a.brand !== !!b.brand) return a.brand ? -1 : 1;
      // Rating desc, missing last.
      const ra = a.p.rating;
      const rb = b.p.rating;
      if (ra === undefined && rb !== undefined) return 1;
      if (ra !== undefined && rb === undefined) return -1;
      if (ra !== undefined && rb !== undefined && ra !== rb) return rb - ra;
      // Amap relevance asc, then distance asc, then id asc.
      if (a.p.relevanceRank !== b.p.relevanceRank) {
        return a.p.relevanceRank - b.p.relevanceRank;
      }
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0;
    })
    .slice(0, MAX_HOTELS);

  return ranked.map(({ p, brand }, i) => ({
    id: p.id,
    name_zh: p.nameZh,
    star: p.star,
    price: p.price,
    rating: p.rating,
    address: p.address,
    image: p.image,
    reason:
      p.rating !== undefined
        ? t(lang, "hotel.reason.rated", { rating: p.rating })
        : t(lang, "hotel.reason"),
    primary: i === 0,
    brand,
    lat: p.lat,
    lon: p.lon,
  }));
}

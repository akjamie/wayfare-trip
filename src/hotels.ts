import type { HotelPoi } from "./amap.js";
import type { Hotel, HotelFilters } from "./types.js";
import { haversineKm, type Point } from "./route.js";
import { t, type Lang } from "./i18n.js";

const MAX_HOTELS = 3;

/**
 * Filter (minimum star, price range) and rank hotels:
 *   filter match → rating desc (missing last) → distance to centroid asc → POI id asc.
 * Returns up to 3 hotels; the first is the primary.
 */
export function filterAndRankHotels(
  pois: HotelPoi[],
  filters: HotelFilters,
  centroid: Point,
  lang: Lang,
): Hotel[] {
  const filtered = pois.filter((p) => {
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
    .map((p) => ({ p, distance: haversineKm(centroid, { lat: p.lat, lon: p.lon }) }))
    .sort((a, b) => {
      const ra = a.p.rating;
      const rb = b.p.rating;
      if (ra === undefined && rb !== undefined) return 1;
      if (ra !== undefined && rb === undefined) return -1;
      if (ra !== undefined && rb !== undefined && ra !== rb) return rb - ra;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0;
    })
    .slice(0, MAX_HOTELS);

  return ranked.map(({ p }, i) => ({
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
    lat: p.lat,
    lon: p.lon,
  }));
}

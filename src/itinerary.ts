import type { ItineraryStop, RankedAttraction } from "./types.js";
import { t, type Lang } from "./i18n.js";
import { haversineKm, type Point } from "./route.js";

const SLOTS = ["morning", "afternoon", "evening"] as const;
const MAX_STOPS = 3;

function centroid(items: RankedAttraction[]): Point {
  return {
    lat: items.reduce((s, a) => s + a.lat, 0) / items.length,
    lon: items.reduce((s, a) => s + a.lon, 0) / items.length,
  };
}

/**
 * Build a geographically clustered day itinerary (≤3 stops):
 *  - rainy day: only indoor/mixed stops;
 *  - start from the top-ranked seed, then add the nearest remaining stop
 *    (so a day's stops are close together);
 *  - hot day: the midday (afternoon) stop must not be outdoor.
 */
export function buildItinerary(
  ranked: RankedAttraction[],
  opts: { rain: boolean; hot: boolean },
  lang: Lang,
): ItineraryStop[] {
  if (ranked.length === 0) return [];

  const sheltered = opts.rain ? ranked.filter((a) => a.environment !== "outdoor") : ranked;
  const base = sheltered.length > 0 ? sheltered : ranked;

  const chosen: RankedAttraction[] = [base[0]];
  const remaining = base.slice(1);

  while (chosen.length < Math.min(MAX_STOPS, base.length) && remaining.length > 0) {
    const c = centroid(chosen);
    let best = 0;
    let bestDist = haversineKm(c, remaining[0]);
    for (let i = 1; i < remaining.length; i += 1) {
      const d = haversineKm(c, remaining[i]);
      if (
        d < bestDist - 1e-9 ||
        (Math.abs(d - bestDist) <= 1e-9 && remaining[i].id < remaining[best].id)
      ) {
        best = i;
        bestDist = d;
      }
    }
    chosen.push(remaining.splice(best, 1)[0]);
  }

  // Hot day: keep the midday (afternoon, index 1) slot free of outdoor.
  if (opts.hot && chosen.length >= 2 && chosen[1].environment === "outdoor") {
    const swap = chosen.findIndex((a, i) => i > 1 && a.environment !== "outdoor");
    if (swap > 0) {
      const tmp = chosen[1];
      chosen[1] = chosen[swap];
      chosen[swap] = tmp;
    }
  }

  return chosen.map((a, i) => ({
    slot: SLOTS[i],
    label: t(lang, `slot.${SLOTS[i]}`),
    id: a.id,
    name_zh: a.name_zh,
    environment: a.environment,
    lat: a.lat,
    lon: a.lon,
  }));
}

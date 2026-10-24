import type { ItineraryStop, RankedAttraction } from "./types.js";
import { t, type Lang } from "./i18n.js";

const SLOTS = ["morning", "afternoon", "evening"] as const;

/**
 * Build a day itinerary from the day's ranked attractions.
 *  - rainy day: every stop is indoor or mixed;
 *  - hot day: no outdoor attraction in the midday (afternoon) slot;
 *  - 2–4 stops when available; fewer only when fewer attractions exist.
 */
export function buildItinerary(
  ranked: RankedAttraction[],
  opts: { rain: boolean; hot: boolean },
  lang: Lang,
): ItineraryStop[] {
  let pool = ranked;
  if (opts.rain) {
    const indoor = ranked.filter((a) => a.environment !== "outdoor");
    if (indoor.length > 0) pool = indoor;
  }

  const stops: ItineraryStop[] = [];
  const used = new Set<string>();
  const maxStops = Math.min(4, pool.length);

  for (const slot of SLOTS) {
    if (stops.length >= maxStops) break;
    let candidate = pool.find((a) => !used.has(a.id));
    if (!candidate) break;

    if (opts.hot && slot === "afternoon" && candidate.environment === "outdoor") {
      const safe = pool.find((a) => !used.has(a.id) && a.environment !== "outdoor");
      if (safe) candidate = safe;
      else continue; // no outdoor in the midday slot on a hot day
    }

    used.add(candidate.id);
    stops.push({
      slot,
      label: t(lang, `slot.${slot}`),
      id: candidate.id,
      name_zh: candidate.name_zh,
      environment: candidate.environment,
      lat: candidate.lat,
      lon: candidate.lon,
    });
  }

  return stops;
}

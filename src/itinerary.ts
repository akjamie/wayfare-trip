import type { Config } from "./config.js";
import type { ItineraryStop, ItineraryStopDraft, RankedAttraction } from "./types.js";
import { t, type Lang } from "./i18n.js";
import { haversineKm, type Point } from "./route.js";
import { visitMinutesFor } from "./duration.js";

const SLOTS = ["morning", "afternoon", "evening"] as const;
const MAX_STOPS = 3;

function centroid(items: RankedAttraction[]): Point {
  return {
    lat: items.reduce((s, a) => s + a.lat, 0) / items.length,
    lon: items.reduce((s, a) => s + a.lon, 0) / items.length,
  };
}

/**
 * Cluster a day's candidates (≤3) so stops are geographically close:
 *  - start from the top-ranked seed, then add the nearest remaining stop;
 *  - hot day: the midday (afternoon) stop must not be outdoor;
 *  - strict indoor only when recommend() decided there are enough indoor options.
 * Each stop carries its system-recommended `visitMinutes`.
 */
export function buildItinerary(
  ranked: RankedAttraction[],
  opts: { rain: boolean; hot: boolean; strictIndoor?: boolean },
  lang: Lang,
  cfg: Config,
): ItineraryStopDraft[] {
  if (ranked.length === 0) return [];

  const base = opts.strictIndoor
    ? ranked.filter((a) => a.environment !== "outdoor")
    : ranked;
  if (base.length === 0) return [];

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
    visitMinutes: visitMinutesFor(a.category, a.name_zh, cfg),
    lat: a.lat,
    lon: a.lon,
  }));
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Schedule stops inside the day window: travel to each stop + visit time.
 * Stops that would end after the window are dropped. Returns the scheduled
 * stops plus the day `totalMinutes` (visits + travel, including the return leg).
 */
export function scheduleDay(
  stops: ItineraryStopDraft[],
  travelMin: number[],
  cfg: Config,
): { stops: ItineraryStop[]; totalMinutes: number } {
  const out: ItineraryStop[] = [];
  let t = cfg.dayStartMin;

  for (let i = 0; i < stops.length; i += 1) {
    const travel = travelMin[i] ?? 0;
    const start = t + travel;
    const end = start + stops[i].visitMinutes;
    if (end > cfg.dayEndMin) break; // this stop (and the rest) exceed the window
    out.push({ ...stops[i], startTime: hhmm(start), endTime: hhmm(end) });
    t = end;
  }

  const last = out[out.length - 1];
  if (!last) return { stops: [], totalMinutes: 0 };
  const lastEnd = Math.floor(t) ;
  const returnTravel = travelMin[out.length] ?? 0;
  const totalMinutes = lastEnd + returnTravel - cfg.dayStartMin;
  return { stops: out, totalMinutes };
}

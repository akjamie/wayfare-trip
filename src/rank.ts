import type { Config } from "./config.js";
import type { Attraction, RankedAttraction } from "./types.js";
import { formatNoon } from "./advice.js";

/**
 * Rank attractions for a day.
 *  - rainy days: indoor & mixed (tier 0) ahead of outdoor (tier 1);
 *  - hot days: outdoor & mixed attractions get an 11:00-15:00 advisory;
 *  - within a tier: preserve Amap relevance order, tie-break by POI id asc;
 *  - cap at top-N.
 */
export function rankForDay(
  attractions: Attraction[],
  opts: { rain: boolean; hot: boolean },
  cfg: Config,
): RankedAttraction[] {
  const noon = formatNoon(cfg);

  const items = attractions.map((a) => ({
    a,
    tier: opts.rain && a.environment === "outdoor" ? 1 : 0,
    advisories:
      opts.hot && a.environment !== "indoor"
        ? [`Avoid outdoor visits between ${noon} due to high heat.`]
        : [],
  }));

  items.sort((x, y) => {
    if (x.tier !== y.tier) return x.tier - y.tier;
    if (x.a.relevanceRank !== y.a.relevanceRank) {
      return x.a.relevanceRank - y.a.relevanceRank;
    }
    return x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0;
  });

  return items.slice(0, cfg.topN).map(({ a, advisories }) => ({
    id: a.id,
    name_zh: a.nameZh,
    environment: a.environment,
    location: a.location,
    advisories,
  }));
}

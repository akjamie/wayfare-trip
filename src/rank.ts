import type { Config } from "./config.js";
import type { Attraction, RankedAttraction } from "./types.js";
import { formatNoon } from "./advice.js";
import { environmentLabel, t, type Lang } from "./i18n.js";

function reasonFor(
  lang: Lang,
  a: Attraction,
  opts: { rain: boolean; hot: boolean },
): string {
  if (opts.rain) return t(lang, "reason.rain");
  if (opts.hot) {
    return a.environment === "indoor"
      ? t(lang, "reason.hot.indoor")
      : t(lang, "reason.hot.outdoor");
  }
  return t(lang, "reason.good");
}

function introductionFor(lang: Lang, a: Attraction): string {
  const rating =
    a.rating !== undefined
      ? lang === "zh-CN"
        ? `，评分 ${a.rating}`
        : `, rated ${a.rating}`
      : "";
  const address = a.address
    ? lang === "zh-CN"
      ? `，地址：${a.address}`
      : `, at ${a.address}`
    : "";
  return t(lang, "intro.template", {
    category: a.category ?? (lang === "zh-CN" ? "景点" : "Attraction"),
    env: environmentLabel(lang, a.environment),
    rating,
    address,
  });
}

/**
 * Rank attractions for a day.
 *  - rainy days: indoor & mixed (tier 0) ahead of outdoor (tier 1);
 *  - hot days: outdoor & mixed get the midday advisory;
 *  - within a tier: preserve Amap relevance order, tie-break by POI id asc;
 *  - cap at top-N; enrich each with reason / introduction / image.
 */
export function rankForDay(
  attractions: Attraction[],
  opts: { rain: boolean; hot: boolean },
  cfg: Config,
  lang: Lang = "en",
): RankedAttraction[] {
  const noon = formatNoon(cfg);

  const items = attractions.map((a) => ({
    a,
    tier: opts.rain && a.environment === "outdoor" ? 1 : 0,
    advisories:
      opts.hot && a.environment !== "indoor" ? [t(lang, "advice.hot", { noon })] : [],
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
    category: a.category,
    location: a.location,
    advisories,
    reason: reasonFor(lang, a, opts),
    introduction: introductionFor(lang, a),
    image: a.photo && a.photo.startsWith("https://") ? a.photo : null,
    lat: a.lat,
    lon: a.lon,
  }));
}

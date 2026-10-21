import type { Config } from "./config.js";
import { httpFetch, type FetchLike } from "./http.js";
import { resolveCity } from "./city.js";
import { AmapClient } from "./amap.js";
import { fetchForecast } from "./weather.js";
import { dayAdvice, isHotDay, isRainyDay } from "./advice.js";
import { DEFAULT_LANG, t, weatherText, type Lang } from "./i18n.js";
import { rankForDay } from "./rank.js";
import { buildItinerary } from "./itinerary.js";
import { AppError } from "./errors.js";
import type {
  Attraction,
  DayRecommendation,
  ForecastDay,
  Recommendation,
} from "./types.js";

export const NO_ATTRACTION_NOTICE =
  "No attraction data is available for this city yet.";

export function validateCity(input: string | null | undefined): string {
  const city = (input ?? "").trim();
  if (!city) throw AppError.invalidInput("Please provide a city name.");
  if (city.length > 64) {
    throw AppError.invalidInput("The city name must be 64 characters or fewer.");
  }
  return city;
}

export function validateDays(raw: string | null | undefined, cfg: Config): number {
  if (raw === null || raw === undefined || raw.trim() === "") return cfg.forecastDays;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 16) {
    throw AppError.invalidInput("The 'days' parameter must be an integer between 1 and 16.");
  }
  return n;
}

const DISPLAY_LIMIT = 5;

function makeDay(
  day: ForecastDay,
  ranked: ReturnType<typeof rankForDay>,
  rain: boolean,
  hot: boolean,
  cfg: Config,
  lang: Lang,
): DayRecommendation {
  return {
    date: day.date,
    weather: {
      summary: weatherText(lang, day.weatherCode),
      tempMaxC: day.tempMaxC,
      tempMinC: day.tempMinC,
      precipProb: day.precipProb,
      weatherCode: day.weatherCode,
    },
    advice: dayAdvice(day, rain, hot, cfg, lang),
    attractions: ranked,
    itinerary: buildItinerary(ranked, { rain, hot }, lang),
  };
}

function buildSummary(
  city: { name: string; admin1: string },
  days: DayRecommendation[],
  notices: string[],
  lang: Lang,
): string {
  const where = city.admin1 ? `${city.name} (${city.admin1})` : city.name;
  const lines = [
    t(lang, "summary.header", { city: where, days: days.length }),
    ...days.map((d) => `- ${d.date}: ${d.advice}`),
  ];
  if (notices.length) {
    lines.push("", ...notices.map((n) => `- ${n}`));
  }
  return lines.join("\n");
}

export async function recommend(
  rawCity: string,
  cfg: Config,
  fetchImpl: FetchLike = httpFetch,
  days?: number,
  amap?: AmapClient,
  lang: Lang = DEFAULT_LANG,
): Promise<Recommendation> {
  const cityInput = validateCity(rawCity);
  const horizon = days ?? cfg.forecastDays;

  const city = await resolveCity(cityInput, cfg, fetchImpl);

  // Reuse a long-lived client (with its TTL cache) when the caller provides one.
  const client = amap ?? new AmapClient(fetchImpl, cfg.amapKey, cfg);
  const attractions = await client.attractions(city.adcode);

  const forecast = await fetchForecast(
    city.lat,
    city.lon,
    horizon,
    fetchImpl,
    cfg.timeoutMs,
  );

  const notices: string[] = [];
  if (attractions.length === 0) notices.push(t(lang, "notice.no_attraction_data"));

  const dayRecs: DayRecommendation[] = [];
  const used = new Set<string>();
  for (const day of forecast) {
    const rain = isRainyDay(day, cfg);
    const hot = isHotDay(day, cfg);

    // Prefer attractions not shown on earlier days so a multi-day plan does not
    // repeat the same places every day; only reuse once the pool is exhausted.
    let pool = attractions.filter((a) => !used.has(a.id));
    if (pool.length === 0) pool = attractions;

    // Keep rainy-day indoor-first meaningful even late in a trip: if the unseen
    // pool has no indoor/mixed option, bring sheltered POIs back into the pool.
    if (rain) {
      const shelteredFresh = pool.filter((a) => a.environment !== "outdoor");
      if (shelteredFresh.length === 0) {
        const shelteredAll = attractions.filter((a) => a.environment !== "outdoor");
        const extra = shelteredAll.filter((a) => !pool.includes(a));
        if (extra.length > 0) pool = [...pool, ...extra];
      }
    }

    const ranked = rankForDay(pool, { rain, hot }, cfg, lang);
    for (const a of ranked.slice(0, DISPLAY_LIMIT)) used.add(a.id);
    dayRecs.push(makeDay(day, ranked, rain, hot, cfg, lang));
  }
  const summary = buildSummary(city, dayRecs, notices, lang);

  return {
    lang,
    city: {
      name: city.name,
      name_zh: city.nameZh,
      admin1: city.admin1,
      lat: city.lat,
      lon: city.lon,
    },
    days: dayRecs,
    summary,
    notices,
  };
}

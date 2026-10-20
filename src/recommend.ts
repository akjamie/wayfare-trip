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

function buildDay(
  day: ForecastDay,
  attractions: Attraction[],
  cfg: Config,
  lang: Lang,
): DayRecommendation {
  const rain = isRainyDay(day, cfg);
  const hot = isHotDay(day, cfg);
  const ranked = rankForDay(attractions, { rain, hot }, cfg, lang);
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

  const dayRecs = forecast.map((d) => buildDay(d, attractions, cfg, lang));
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

import type { Config } from "./config.js";
import { httpFetch, type FetchLike } from "./http.js";
import { resolveCity } from "./city.js";
import { AmapClient } from "./amap.js";
import { fetchForecast } from "./weather.js";
import { dayAdvice, isHotDay, isRainyDay, weatherText } from "./advice.js";
import { rankForDay } from "./rank.js";
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
): DayRecommendation {
  const rain = isRainyDay(day, cfg);
  const hot = isHotDay(day, cfg);
  return {
    date: day.date,
    weather: {
      summary: weatherText(day.weatherCode),
      tempMaxC: day.tempMaxC,
      tempMinC: day.tempMinC,
      precipProb: day.precipProb,
      weatherCode: day.weatherCode,
    },
    advice: dayAdvice(day, rain, hot, cfg),
    attractions: rankForDay(attractions, { rain, hot }, cfg),
  };
}

function buildSummary(
  city: { name: string; admin1: string },
  days: DayRecommendation[],
  notices: string[],
): string {
  const where = city.admin1 ? `${city.name} (${city.admin1})` : city.name;
  const lines = [
    `Weather-aware attraction recommendations for ${where}, ${days.length} day(s) ahead:`,
    ...days.map((d) => `- ${d.date}: ${d.advice}`),
  ];
  if (notices.length) {
    lines.push("", "Notes:", ...notices.map((n) => `- ${n}`));
  }
  return lines.join("\n");
}

export async function recommend(
  rawCity: string,
  cfg: Config,
  fetchImpl: FetchLike = httpFetch,
  days?: number,
  amap?: AmapClient,
): Promise<Recommendation> {
  const cityInput = validateCity(rawCity);
  const horizon = days ?? cfg.forecastDays;

  const city = await resolveCity(cityInput, fetchImpl, cfg.timeoutMs);

  // Reuse a long-lived client (with its TTL cache) when the caller provides one,
  // so the per-city Amap cache survives across requests.
  const client = amap ?? new AmapClient(fetchImpl, cfg.amapKey, cfg);
  const adcode = await client.adcodeFor(city.lat, city.lon);
  const attractions = await client.attractions(adcode);

  const forecast = await fetchForecast(
    city.lat,
    city.lon,
    horizon,
    fetchImpl,
    cfg.timeoutMs,
  );

  const notices: string[] = [];
  if (attractions.length === 0) notices.push(NO_ATTRACTION_NOTICE);

  const dayRecs = forecast.map((d) => buildDay(d, attractions, cfg));
  const summary = buildSummary(city, dayRecs, notices);

  return {
    city: {
      name: city.name,
      admin1: city.admin1,
      lat: city.lat,
      lon: city.lon,
    },
    days: dayRecs,
    summary,
    notices,
  };
}

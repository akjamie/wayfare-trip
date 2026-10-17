import { getJson, type FetchLike } from "./http.js";
import { AppError } from "./errors.js";
import type { ForecastDay } from "./types.js";

/**
 * Fetch a daily forecast from Open-Meteo (no API key). Uses `timezone=auto`
 * so all returned dates/times are in the city's local timezone.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  days: number,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<ForecastDay[]> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
    `&forecast_days=${days}&timezone=auto`;

  let data: any;
  try {
    data = await getJson(fetchImpl, url, timeoutMs);
  } catch {
    throw AppError.forecastUnavailable();
  }

  const daily = data?.daily;
  if (!daily?.time?.length) throw AppError.forecastUnavailable();

  return daily.time.map((date: string, i: number): ForecastDay => ({
    date,
    tempMaxC: Number(daily.temperature_2m_max?.[i] ?? 0),
    tempMinC: Number(daily.temperature_2m_min?.[i] ?? 0),
    precipProb: Number(daily.precipitation_probability_max?.[i] ?? 0),
    weatherCode: Number(daily.weather_code?.[i] ?? 0),
  }));
}

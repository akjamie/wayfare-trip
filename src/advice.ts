import type { Config } from "./config.js";
import type { ForecastDay } from "./types.js";

// WMO weather codes: https://open-meteo.com/en/docs
const RAIN_RANGES: Array<[number, number]> = [
  [51, 67], // drizzle, rain, freezing rain
  [80, 82], // rain showers
  [95, 99], // thunderstorm
];
const SNOW_RANGES: Array<[number, number]> = [
  [71, 77], // snow fall / grains
  [85, 86], // snow showers
];

export function inAnyRange(code: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([lo, hi]) => code >= lo && code <= hi);
}

/** A day is "rainy" when precipitation probability meets the threshold, or the
 *  WMO code is in the rain set; snow also counts as precipitation. */
export function isRainyDay(day: ForecastDay, cfg: Config): boolean {
  return (
    day.precipProb >= cfg.rainProbThreshold ||
    inAnyRange(day.weatherCode, RAIN_RANGES) ||
    inAnyRange(day.weatherCode, SNOW_RANGES)
  );
}

export function isHotDay(day: ForecastDay, cfg: Config): boolean {
  return day.tempMaxC >= cfg.highTempC;
}

export function formatNoon(cfg: Config): string {
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${pad(cfg.noonStart)}-${pad(cfg.noonEnd)}`;
}

const WEATHER_TEXT: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function weatherText(code: number): string {
  return WEATHER_TEXT[code] ?? "Mixed conditions";
}

/** Build the per-day advice line(s) in English. */
export function dayAdvice(
  day: ForecastDay,
  rain: boolean,
  hot: boolean,
  cfg: Config,
): string {
  const parts: string[] = [];
  const weather = weatherText(day.weatherCode);
  parts.push(`${weather}, ${Math.round(day.tempMinC)}-${Math.round(day.tempMaxC)}°C, ${Math.round(day.precipProb)}% chance of precipitation.`);
  if (rain) {
    parts.push("Rain is expected, so prefer indoor attractions such as museums and galleries.");
  }
  if (hot) {
    parts.push(`It will be hot, so avoid outdoor attractions between ${formatNoon(cfg)}.`);
  }
  if (!rain && !hot) {
    parts.push("Good conditions for visiting outdoor attractions.");
  }
  return parts.join(" ");
}

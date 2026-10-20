import type { Config } from "./config.js";
import type { ForecastDay } from "./types.js";
import { t, weatherText, type Lang } from "./i18n.js";

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

/** Build the per-day advice line(s) in the requested language. */
export function dayAdvice(
  day: ForecastDay,
  rain: boolean,
  hot: boolean,
  cfg: Config,
  lang: Lang,
): string {
  const parts: string[] = [
    t(lang, "advice.weather", {
      weather: weatherText(lang, day.weatherCode),
      min: Math.round(day.tempMinC),
      max: Math.round(day.tempMaxC),
      precip: Math.round(day.precipProb),
    }),
  ];
  if (rain) parts.push(t(lang, "advice.rain"));
  if (hot) parts.push(t(lang, "advice.hot", { noon: formatNoon(cfg) }));
  if (!rain && !hot) parts.push(t(lang, "advice.good"));
  return parts.join(" ");
}

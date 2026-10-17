import { readFileSync } from "node:fs";

export interface Config {
  amapKey: string;
  amapTypes: string;
  rainProbThreshold: number;
  highTempC: number;
  noonStart: number;
  noonEnd: number;
  forecastDays: number;
  topN: number;
  cacheTtlMs: number;
  timeoutMs: number;
}

export const DEFAULT_AMAP_TYPES = "110000|140100|140200|140400|140600";

const DEFAULTS: Config = {
  amapKey: "",
  amapTypes: DEFAULT_AMAP_TYPES,
  rainProbThreshold: 50,
  highTempC: 33,
  noonStart: 11,
  noonEnd: 15,
  forecastDays: 7,
  topN: 10,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  timeoutMs: 3000,
};

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function hour(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const m = /^(\d{1,2})(?::\d{2})?$/.exec(raw.trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : fallback;
}

export function readDotEnv(path = ".env"): Record<string, string> {
  const out: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  fileEnv: Record<string, string> = readDotEnv(),
): Config {
  const get = (key: string): string | undefined => env[key] ?? fileEnv[key];
  return {
    amapKey: get("AMAP_KEY") ?? get("AMAP_API_KEY") ?? DEFAULTS.amapKey,
    amapTypes: get("WAYFARE_AMAP_TYPES") ?? DEFAULTS.amapTypes,
    rainProbThreshold: num(get("WAYFARE_RAIN_PROB"), DEFAULTS.rainProbThreshold),
    highTempC: num(get("WAYFARE_HIGH_TEMP_C"), DEFAULTS.highTempC),
    noonStart: hour(get("WAYFARE_NOON_START"), DEFAULTS.noonStart),
    noonEnd: hour(get("WAYFARE_NOON_END"), DEFAULTS.noonEnd),
    forecastDays: num(get("WAYFARE_FORECAST_DAYS"), DEFAULTS.forecastDays),
    topN: num(get("WAYFARE_TOP_N"), DEFAULTS.topN),
    cacheTtlMs: num(get("WAYFARE_CACHE_TTL_MS"), DEFAULTS.cacheTtlMs),
    timeoutMs: num(get("WAYFARE_TIMEOUT_MS"), DEFAULTS.timeoutMs),
  };
}

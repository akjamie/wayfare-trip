import type { Config } from "./config.js";

export interface DurationRule {
  /** Substrings matched (case-insensitive) against "category name". */
  match: string[];
  minutes: number;
}

export const DEFAULT_VISIT_MINUTES = 90;
export const MIN_VISIT_MINUTES = 30;
export const MAX_VISIT_MINUTES = 480;

/** System-recommended visit durations by category keyword (first match wins). */
export const DEFAULT_DURATION_RULES: DurationRule[] = [
  { match: ["国家", "世界遗产", "世界文化", "森林公园", "地质"], minutes: 180 },
  { match: ["省级", "风景区", "景区", "度假区"], minutes: 120 },
  { match: ["博物馆", "museum", "纪念馆", "展览", "科技馆", "美术馆"], minutes: 90 },
  { match: ["公园", "广场", "garden", "park"], minutes: 90 },
  { match: ["古镇", "古街", "老街", "街区"], minutes: 120 },
  { match: ["寺", "庙", "观", "教堂", "temple", "church", "清真"], minutes: 45 },
  { match: ["塔", "楼", "城墙", "遗址"], minutes: 60 },
];

const clamp = (m: number) => Math.min(MAX_VISIT_MINUTES, Math.max(MIN_VISIT_MINUTES, m));

/**
 * System-recommended visit duration for an attraction.
 * Matches the Amap category then the name; unmapped -> configured default (90).
 */
export function visitMinutesFor(
  category: string | undefined,
  name: string,
  cfg: Config,
  rules: DurationRule[] = DEFAULT_DURATION_RULES,
): number {
  const text = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  for (const rule of rules) {
    if (rule.match.some((m) => text.includes(m.toLowerCase()))) return clamp(rule.minutes);
  }
  return clamp(cfg.defaultVisitMinutes ?? DEFAULT_VISIT_MINUTES);
}

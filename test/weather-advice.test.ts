import { describe, it, expect } from "vitest";
import { isRainyDay, isHotDay } from "../src/advice.js";
import { rankForDay } from "../src/rank.js";
import { loadConfig } from "../src/config.js";
import type { Attraction, Environment } from "../src/types.js";

const cfg = loadConfig({} as Record<string, string>, {});

const att = (id: string, env: Environment, rank = 0): Attraction => ({
  id,
  nameZh: id,
  environment: env,
  typecode: "",
  location: "0,0",
  lat: 0,
  lon: 0,
  relevanceRank: rank,
});

const day = (o: { tmax?: number; precip?: number; code?: number }) => ({
  date: "2026-07-01",
  tempMaxC: o.tmax ?? 20,
  tempMinC: 10,
  precipProb: o.precip ?? 0,
  weatherCode: o.code ?? 0,
});

describe("advice rules", () => {
  it("AC12: on a rainy day, indoor and mixed precede outdoor", () => {
    const list = [
      att("outdoor-1", "outdoor", 0),
      att("indoor-1", "indoor", 1),
      att("mixed-1", "mixed", 2),
    ];
    const ranked = rankForDay(list, { rain: true, hot: false }, cfg);
    const envs = ranked.map((r) => r.environment);
    expect(envs[envs.length - 1]).toBe("outdoor");
    expect(envs.indexOf("outdoor")).toBeGreaterThan(envs.indexOf("indoor"));
    expect(envs.indexOf("outdoor")).toBeGreaterThan(envs.indexOf("mixed"));
  });

  it("AC13: rainy when precipitation probability >= 50% or WMO rain code", () => {
    expect(isRainyDay(day({ precip: 50 }), cfg)).toBe(true);
    expect(isRainyDay(day({ precip: 49, code: 0 }), cfg)).toBe(false);
    expect(isRainyDay(day({ code: 61 }), cfg)).toBe(true);
    expect(isRainyDay(day({ code: 82 }), cfg)).toBe(true);
    expect(isRainyDay(day({ code: 95 }), cfg)).toBe(true);
    expect(isRainyDay(day({ code: 0 }), cfg)).toBe(false);
  });

  it("AC14: snow codes count as precipitation", () => {
    expect(isRainyDay(day({ code: 71 }), cfg)).toBe(true);
    expect(isRainyDay(day({ code: 86 }), cfg)).toBe(true);
  });

  it("AC15: a hot day flags outdoor and mixed but not indoor", () => {
    const list = [att("o", "outdoor"), att("i", "indoor"), att("m", "mixed")];
    const ranked = rankForDay(list, { rain: false, hot: true }, cfg);
    const byEnv = Object.fromEntries(ranked.map((r) => [r.environment, r.advisories.length]));
    expect(byEnv.outdoor).toBeGreaterThan(0);
    expect(byEnv.mixed).toBeGreaterThan(0);
    expect(byEnv.indoor).toBe(0);
  });

  it("AC16: a non-hot day produces no midday advisory", () => {
    const ranked = rankForDay([att("o", "outdoor")], { rain: false, hot: false }, cfg);
    expect(ranked[0].advisories).toHaveLength(0);
  });

  it("AC17: thresholds are overridable and change triggering", () => {
    expect(isHotDay(day({ tmax: 36 }), cfg)).toBe(true);
    expect(isHotDay(day({ tmax: 36 }), { ...cfg, highTempC: 40 })).toBe(false);

    expect(isRainyDay(day({ precip: 60 }), cfg)).toBe(true);
    expect(isRainyDay(day({ precip: 60 }), { ...cfg, rainProbThreshold: 90 })).toBe(false);
  });

  it("AC17b: an overridden noon window changes the advisory text", () => {
    const ranked = rankForDay(
      [att("o", "outdoor")],
      { rain: false, hot: true },
      { ...cfg, noonStart: 12, noonEnd: 14 },
    );
    expect(ranked[0].advisories.join(" ")).toContain("12:00-14:00");
  });
});

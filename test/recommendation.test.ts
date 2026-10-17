import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, weatherBody, WEATHER } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

describe("per-day recommendation", () => {
  it("AC9: one entry per forecast day with date/weather/advice/attractions", async () => {
    const f = makeFetch(happyRoutes(weatherBody(7)));
    const r = await recommend("Beijing", cfg, f);
    expect(r.days).toHaveLength(7);
    for (const d of r.days) {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.weather.summary.length).toBeGreaterThan(0);
      expect(d.advice.length).toBeGreaterThan(0);
      expect(Array.isArray(d.attractions)).toBe(true);
    }
  });

  it("AC9b: horizon is configurable", async () => {
    const f = makeFetch([
      ...happyRoutes(weatherBody(3)).filter((r) => r.match !== WEATHER),
      { match: WEATHER, respond: () => weatherBody(3) },
    ]);
    const r = await recommend("Beijing", cfg, f, 3);
    expect(r.days).toHaveLength(3);
  });

  it("AC10: a rain day and a hot day are handled independently", async () => {
    const w = weatherBody(7, {
      precip: [80, 0, 0, 0, 0, 0, 0],
      tmax: [25, 25, 36, 25, 25, 25, 25],
    });
    const f = makeFetch(happyRoutes(w));
    const r = await recommend("Beijing", cfg, f);

    const day0 = r.days[0];
    const outdoorIdx = day0.attractions.findIndex((a) => a.environment === "outdoor");
    const indoorIdx = day0.attractions.findIndex((a) => a.environment === "indoor");
    expect(outdoorIdx).toBeGreaterThan(indoorIdx);

    for (const a of r.days[2].attractions) {
      if (a.environment === "indoor") expect(a.advisories).toHaveLength(0);
      else expect(a.advisories.length).toBeGreaterThan(0);
    }
  });

  it("AC11: requests the forecast in the city's local timezone", async () => {
    const f = makeFetch(happyRoutes());
    await recommend("Beijing", cfg, f);
    const weatherUrl = f.calls.find((u) => u.includes(WEATHER))!;
    expect(weatherUrl).toContain("timezone=auto");
  });
});

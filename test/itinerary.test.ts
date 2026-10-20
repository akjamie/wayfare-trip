import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, weatherBody } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

describe("itinerary", () => {
  it("AC12: each day has 2–4 time-slotted stops with localized labels", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes(weatherBody(3))), 3);
    for (const d of r.days) {
      expect(d.itinerary.length).toBeGreaterThanOrEqual(2);
      expect(d.itinerary.length).toBeLessThanOrEqual(4);
      for (const s of d.itinerary) {
        expect(["morning", "afternoon", "evening"]).toContain(s.slot);
        expect(s.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("AC13: rainy day stops are indoor/mixed; hot day midday has no outdoor", async () => {
    const w = weatherBody(2, { precip: [90, 0], tmax: [25, 36] });
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes(w)), 2);

    for (const s of r.days[0].itinerary) {
      expect(s.environment).not.toBe("outdoor");
    }
    const midday = r.days[1].itinerary.find((s) => s.slot === "afternoon");
    if (midday) expect(midday.environment).not.toBe("outdoor");
  });

  it("AC14: a day with a single attraction yields a 1-stop itinerary", async () => {
    const onePoi = {
      status: "1",
      count: "1",
      pois: [{ id: "ONLY", name: "唯一景点", typecode: "140100", location: "116.4,39.9" }],
    };
    const routes = happyRoutes(weatherBody(1)).map((r) =>
      r.match === "place/text" ? { ...r, respond: () => onePoi } : r,
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 1);
    expect(r.days[0].itinerary).toHaveLength(1);
  });

  it("AC12/plan: attractions are not repeated across days when the pool allows", async () => {
    const manyPois = {
      status: "1",
      count: "14",
      pois: Array.from({ length: 14 }, (_, i) => ({
        id: `P${i}`,
        name: `景点${i}`,
        typecode: "140100",
        location: "116.4,39.9",
      })),
    };
    const routes = happyRoutes(weatherBody(3)).map((r) =>
      r.match === "place/text" ? { ...r, respond: () => manyPois } : r,
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 3);
    const ids = r.days.flatMap((d) => d.itinerary.map((s) => s.id));
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length); // no repeated stop across the trip
  });
});

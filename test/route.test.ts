import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, AMAP_TEXT, hotelPoisBody, poisBody } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

function routesWithHotel(respond: (url: string) => unknown) {
  return happyRoutes().map((r) => (r.match === AMAP_TEXT ? { ...r, respond } : r));
}

describe("route", () => {
  it("AC11: route starts and ends at the primary hotel, covering the day's stops", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    const hotel = r.hotels[0];
    for (const d of r.days) {
      const legs = d.route.legs;
      expect(legs.length).toBe(d.itinerary.length + 1);
      expect(legs[0].from).toBe(hotel.id);
      expect(legs[legs.length - 1].to).toBe(hotel.id);
    }
  });

  it("AC12: legs carry ids, distance, duration (formula), and mode", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    for (const d of r.days) {
      for (const l of d.route.legs) {
        expect(typeof l.from).toBe("string");
        expect(typeof l.to).toBe("string");
        expect(typeof l.distanceKm).toBe("number");
        expect(typeof l.durationMin).toBe("number");
        expect(["walk", "drive"]).toContain(l.mode);
        if (l.distanceKm <= 2) expect(l.mode).toBe("walk");
        else expect(l.mode).toBe("drive");
        const speed = l.mode === "walk" ? 5 : 30;
        expect(l.durationMin).toBe(Math.round((l.distanceKm / speed) * 60));
      }
    }
  });

  it("AC13: deterministic nearest-neighbor ordering", async () => {
    const r1 = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    const r2 = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    const seq = (r: typeof r1) =>
      r.days.map((d) => d.route.legs.map((l) => `${l.from}>${l.to}`).join("|"));
    expect(seq(r1)).toEqual(seq(r2));
  });

  it("AC14: no hotel → route lists stops without hotel endpoints", async () => {
    const routes = routesWithHotel((url) =>
      url.includes("types=100000") ? { status: "1", count: "0", pois: [] } : poisBody,
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 2);
    for (const d of r.days) {
      expect(d.route.legs.length).toBe(Math.max(0, d.itinerary.length - 1));
      for (const l of d.route.legs) {
        expect(l.from.startsWith("H")).toBe(false);
        expect(l.to.startsWith("H")).toBe(false);
      }
    }
  });

  it("AC17: zero stops → empty route with zero totals", async () => {
    const routes = routesWithHotel((url) =>
      url.includes("types=100000") ? hotelPoisBody : { status: "1", count: "0", pois: [] },
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 2);
    for (const d of r.days) {
      expect(d.itinerary).toHaveLength(0);
      expect(d.route.legs).toEqual([]);
      expect(d.route.totalDistanceKm).toBe(0);
      expect(d.route.totalDurationMin).toBe(0);
    }
  });
});

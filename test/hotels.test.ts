import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { filterAndRankHotels } from "../src/hotels.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, AMAP_TEXT, poisBody } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

function hotelEmptyRoutes() {
  return happyRoutes().map((r) =>
    r.match === AMAP_TEXT
      ? {
          ...r,
          respond: (url: string) =>
            url.includes("types=100100") ? { status: "1", count: "0", pois: [] } : poisBody,
        }
      : r,
  );
}

describe("hotels", () => {
  it("AC8: up to 3 hotels, exactly one primary, deterministic ranking + fields", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    expect(r.hotels).toHaveLength(3);
    expect(r.hotels.filter((h) => h.primary)).toHaveLength(1);
    expect(r.hotels[0].primary).toBe(true);
    // Amap relevance first: fixture order H5 (0) → H4 (1) → H2 (2)
    expect(r.hotels.map((h) => h.id)).toEqual(["H5", "H4", "H2"]);
    for (const h of r.hotels) {
      expect(h.id.length).toBeGreaterThan(0);
      expect(h.name_zh.length).toBeGreaterThan(0);
      expect(h.reason.length).toBeGreaterThan(0);
      expect(h.image === null || h.image.startsWith("https://")).toBe(true);
    }
    expect(r.hotels[0].star).toBe(5);
    expect(r.hotels[0].price).toBe(800);
    expect(r.hotels[0].rating).toBe(4.9);
  });

  it("AC11: only real hotel typecodes (generic/hostel excluded)", async () => {
    const routes = happyRoutes().map((r) =>
      r.match === AMAP_TEXT
        ? {
            ...r,
            respond: (url: string) =>
              url.includes("types=100100")
                ? {
                    status: "1",
                    count: "3",
                    pois: [
                      { id: "GEN", name: "非酒店POI", typecode: "100000", location: "116.4,39.9" },
                      { id: "HOSTEL", name: "青年旅舍", typecode: "100201", location: "116.4,39.9" },
                      { id: "H5", name: "豪华五星酒店", typecode: "100102", location: "116.4,39.92" },
                    ],
                  }
                : poisBody,
          }
        : r,
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 2);
    expect(r.hotels.map((h) => h.id)).toEqual(["H5"]);
  });

  it("AC9: minimum-star filter (star=4 → level >= 4, unknown excluded)", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2, undefined, "en", {
      star: 4,
    });
    expect(r.hotels.map((h) => h.id)).toEqual(["H5", "H4"]);
    for (const h of r.hotels) expect((h.star ?? 0) >= 4).toBe(true);
    expect(r.hotels.some((h) => h.id === "HX")).toBe(false); // unknown level excluded
  });

  it("AC10: price range filter (unknown cost excluded)", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2, undefined, "en", {
      priceMin: 200,
      priceMax: 800,
    });
    for (const h of r.hotels) {
      expect(h.price).toBeDefined();
      expect(h.price! >= 200 && h.price! <= 800).toBe(true);
    }
    expect(r.hotels.map((h) => h.id).sort()).toEqual(["H4", "H5"]);
  });

  it("AC12: brand boost within equal Amap relevance (unit)", async () => {
    const pois = [
      { id: "PLAIN", nameZh: "普通酒店", typecode: "100102", star: 5, rating: 4.5, relevanceRank: 0, lat: 39.9, lon: 116.4 },
      { id: "BRAND", nameZh: "希尔顿酒店", typecode: "100102", star: 5, rating: 4.5, relevanceRank: 0, lat: 39.91, lon: 116.41 },
    ];
    const ranked = filterAndRankHotels(pois as any, {}, { lat: 39.9, lon: 116.4 }, "en", cfg.hotelBrands);
    expect(ranked[0].id).toBe("BRAND"); // brand boost beats the non-brand at equal relevance
    expect(ranked[0].brand).toBeTruthy();
  });

  it("AC15: zero usable hotels → notice + routes without hotel endpoints", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(hotelEmptyRoutes()), 2);
    expect(r.hotels).toEqual([]);
    expect(r.notices.some((n) => /hotel/i.test(n))).toBe(true);
    for (const d of r.days) {
      for (const leg of d.route.legs) {
        expect(leg.from.startsWith("H")).toBe(false);
        expect(leg.to.startsWith("H")).toBe(false);
      }
    }
  });

  it("AC16: hotel-search upstream failure → 503 attraction_source_unavailable", async () => {
    const routes = happyRoutes().map((r) =>
      r.match === AMAP_TEXT
        ? {
            ...r,
            respond: (url: string) =>
              url.includes("types=100100") ? { status: "0", infocode: "10003" } : poisBody,
          }
        : r,
    );
    await expect(recommend("Beijing", cfg, makeFetch(routes), 2)).rejects.toMatchObject({
      code: "attraction_source_unavailable",
      status: 503,
    });
  });
});

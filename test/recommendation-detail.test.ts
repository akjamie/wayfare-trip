import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, weatherBody } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

describe("recommendation detail", () => {
  it("AC10: every ranked attraction carries a non-empty localized reason", async () => {
    const w = weatherBody(2, { precip: [80, 0] }); // day0 rainy, day1 dry
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes(w)), 2);

    for (const d of r.days) {
      for (const a of d.attractions) {
        expect(typeof a.reason).toBe("string");
        expect(a.reason.length).toBeGreaterThan(0);
      }
    }
    // Rainy day reason references the weather-driven fit.
    expect(r.days[0].attractions[0].reason.toLowerCase()).toContain("indoor");
  });

  it("AC11: every attraction has an introduction and an https Amap image or null; http discarded", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(happyRoutes()), 2);
    for (const d of r.days) {
      for (const a of d.attractions) {
        expect(typeof a.introduction).toBe("string");
        expect(a.introduction.length).toBeGreaterThan(0);
        if (a.image !== null) {
          expect(a.image.startsWith("https://")).toBe(true);
        }
      }
    }
    // Museum has an https photo; park has none.
    const ids = r.days[0].attractions.map((a) => a.id);
    const museum = r.days[0].attractions.find((a) => a.id === "B0MUSEUM");
    const park = r.days[0].attractions.find((a) => a.id === "B0PARK");
    if (museum) expect(museum.image).toMatch(/^https:\/\//);
    if (park) expect(park.image).toBeNull();
    expect(ids.length).toBeGreaterThan(0);
  });

  it("AC11: non-https photo URL is discarded (image null)", async () => {
    const httpPoi = {
      status: "1",
      count: "1",
      pois: [
        {
          id: "B0HTTP",
          name: "测试景点",
          typecode: "140100",
          type: "科教文化服务;博物馆;博物馆",
          location: "116.4,39.9",
          photos: [{ url: "http://insecure.example/x.jpg" }],
        },
      ],
    };
    const routes = happyRoutes().map((r) =>
      r.match === "place/text" ? { ...r, respond: () => httpPoi } : r,
    );
    const r = await recommend("Beijing", cfg, makeFetch(routes), 2);
    const a = r.days[0].attractions.find((x) => x.id === "B0HTTP");
    expect(a?.image).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { resolveCity } from "../src/city.js";
import { makeFetch, GEO, beijingGeo } from "./helpers.js";

const T = 1000;

describe("city resolution", () => {
  it("AC1: Chinese, pinyin, and English resolve to the same China city", async () => {
    const f = makeFetch([{ match: GEO, respond: () => beijingGeo }]);
    const a = await resolveCity("北京", f, T);
    const b = await resolveCity("beijing", f, T);
    const c = await resolveCity("Beijing", f, T);
    for (const r of [a, b, c]) {
      expect(r.name).toBe("Beijing");
      expect(r.lat).not.toBe(0);
      expect(r.lon).not.toBe(0);
      expect(r.country).toBe("CN");
    }
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("AC2: same-named cities are disambiguated by highest population", async () => {
    const f = makeFetch([
      {
        match: GEO,
        respond: () => ({
          results: [
            {
              name: "Taizhou",
              latitude: 32.4,
              longitude: 119.9,
              country_code: "CN",
              admin1: "Jiangsu",
              population: 5000000,
            },
            {
              name: "Taizhou",
              latitude: 28.6,
              longitude: 121.4,
              country_code: "CN",
              admin1: "Zhejiang",
              population: 6000000,
            },
          ],
        }),
      },
    ]);
    const r = await resolveCity("Taizhou", f, T);
    expect(r.population).toBe(6000000);
    expect(r.admin1).toBe("Zhejiang");
    expect(r.name).toBe("Taizhou");
  });

  it("AC3: an unresolvable name throws unknown_city", async () => {
    const f = makeFetch([{ match: GEO, respond: () => ({ results: [] }) }]);
    await expect(resolveCity("asdfghjkl", f, T)).rejects.toMatchObject({
      code: "unknown_city",
    });
  });

  it("AC4: a non-China city (Paris) throws unknown_city", async () => {
    const f = makeFetch([
      {
        match: GEO,
        respond: () => ({
          results: [
            {
              name: "Paris",
              latitude: 48.85,
              longitude: 2.35,
              country_code: "FR",
              admin1: "Île-de-France",
              population: 2148000,
            },
          ],
        }),
      },
    ]);
    await expect(resolveCity("Paris", f, T)).rejects.toMatchObject({
      code: "unknown_city",
    });
  });
});

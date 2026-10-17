import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };
const CJK = /[\u4e00-\u9fff]/;

describe("output & website", () => {
  it("AC20: system/UI text is English and a JSON payload + summary are emitted", async () => {
    const f = makeFetch(happyRoutes());
    const r = await recommend("Beijing", cfg, f);

    expect(typeof r.summary).toBe("string");
    expect(r.summary.length).toBeGreaterThan(0);
    expect(CJK.test(r.summary)).toBe(false);
    expect(CJK.test(r.city.name)).toBe(false);

    // city name is the English display name (not the Chinese input)
    expect(r.city.name).toBe("Beijing");

    for (const d of r.days) {
      expect(CJK.test(d.advice)).toBe(false);
      expect(CJK.test(d.weather.summary)).toBe(false);
    }

    // structured payload round-trips as JSON
    expect(() => JSON.parse(JSON.stringify(r))).not.toThrow();
  });

  it("AC21: every attraction carries a non-empty name_zh", async () => {
    const f = makeFetch(happyRoutes());
    const r = await recommend("Beijing", cfg, f);
    let count = 0;
    for (const d of r.days) {
      for (const a of d.attractions) {
        expect(a.name_zh.length).toBeGreaterThan(0);
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});

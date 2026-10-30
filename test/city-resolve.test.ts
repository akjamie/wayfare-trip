import { describe, it, expect } from "vitest";
import { resolveCity } from "../src/city.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, AMAP_GEOCODE } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

describe("city resolution", () => {
  it("AC1: 西安/Xian/Xi'an -> Xi'an (610100); 北京/beijing/Beijing -> Beijing, offline", async () => {
    const offline = makeFetch([], { fail: () => true }); // any fetch would throw

    const a = await resolveCity("西安", cfg, offline);
    const b = await resolveCity("Xian", cfg, offline);
    const c = await resolveCity("Xi'an", cfg, offline);
    for (const r of [a, b, c]) {
      expect(r.name).toBe("Xi'an");
      expect(r.adcode).toBe("610100");
      expect(r.admin1).toBe("Shaanxi");
    }

    const bj = await resolveCity("Beijing", cfg, offline);
    expect(bj.adcode).toBe("110000");

    // Alias hits must not touch the network.
    expect(offline.calls.length).toBe(0);
  });

  it("AC5: province input 广东 resolves to its capital Guangzhou (offline)", async () => {
    const offline = makeFetch([], { fail: () => true });
    const r = await resolveCity("广东", cfg, offline);
    expect(r.name).toBe("Guangzhou");
    expect(r.adcode).toBe("440100");
    expect(offline.calls.length).toBe(0);
  });

  it("AC2: multiple city-level candidates -> ambiguous_city with candidates", async () => {
    const f = makeFetch([
      {
        match: AMAP_GEOCODE,
        respond: () => ({
          status: "1",
          geocodes: [
            { city: "台州市", province: "浙江省", adcode: "331000", level: "市", location: "121.4,28.6" },
            { city: "泰州市", province: "江苏省", adcode: "321200", level: "市", location: "119.9,32.4" },
          ],
        }),
      },
    ]);
    let caught: any;
    try {
      await resolveCity("Taizhou", cfg, f);
    } catch (e) {
      caught = e;
    }
    expect(caught?.code).toBe("ambiguous_city");
    expect(caught?.status).toBe(400);
    expect(caught?.candidates?.length).toBe(2);
    expect(caught?.candidates?.[0]).toHaveProperty("adcode");
    expect(caught?.candidates?.[0]).toHaveProperty("name_zh");
  });

  it("AC3: unresolvable -> unknown_city", async () => {
    const f = makeFetch([{ match: AMAP_GEOCODE, respond: () => ({ status: "1", geocodes: [] }) }]);
    await expect(resolveCity("asdfghjkl", cfg, f)).rejects.toMatchObject({
      code: "unknown_city",
    });
  });

  it("AC4: non-China / non-city-level only -> unknown_city", async () => {
    const f = makeFetch([
      {
        match: AMAP_GEOCODE,
        respond: () => ({
          status: "1",
          geocodes: [
            { city: "Paris", province: "", adcode: "", level: "国家", location: "2.35,48.85" },
          ],
        }),
      },
    ]);
    await expect(resolveCity("Paris", cfg, f)).rejects.toMatchObject({
      code: "unknown_city",
    });
  });

  it("AC4b: county-level matches resolve to the county (e.g. 石泉 → 610922)", async () => {
    const f = makeFetch([
      {
        match: AMAP_GEOCODE,
        respond: () => ({
          status: "1",
          geocodes: [
            {
              city: "安康市",
              province: "陕西省",
              district: "石泉县",
              adcode: "610922",
              level: "区县",
              location: "108.244,33.038",
            },
          ],
        }),
      },
    ]);
    const r = await resolveCity("石泉", cfg, f);
    expect(r.adcode).toBe("610922");
    expect(r.nameZh).toBe("石泉县");
    expect(r.admin1).toBe("安康市");
    expect(r.country).toBe("CN");
  });

  it("AC6: geocode failure -> attraction_source_unavailable; no city-level -> unknown_city", async () => {
    const failing = makeFetch([], { fail: (u) => u.includes(AMAP_GEOCODE) });
    await expect(resolveCity("Somewhereville", cfg, failing)).rejects.toMatchObject({
      code: "attraction_source_unavailable",
      status: 503,
    });

    const ok = makeFetch([{ match: AMAP_GEOCODE, respond: () => ({ status: "1", geocodes: [] }) }]);
    await expect(resolveCity("Somewhereville", cfg, ok)).rejects.toMatchObject({
      code: "unknown_city",
    });
  });
});

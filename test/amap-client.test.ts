import { describe, it, expect } from "vitest";
import { AmapClient, environmentForTypecode } from "../src/amap.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, AMAP_REGEO, AMAP_TEXT, regeoBody, poisBody } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

describe("amap client", () => {
  it("AC7: queries with the resolved adcode, citylimit=true, and widened types", async () => {
    const f = makeFetch([
      { match: AMAP_REGEO, respond: () => regeoBody },
      { match: AMAP_TEXT, respond: () => poisBody },
    ]);
    const client = new AmapClient(f, "testkey", cfg);
    const adcode = await client.adcodeFor(39.9, 116.4);
    expect(adcode).toBe("110000");
    await client.attractions(adcode);

    const textUrl = f.calls.find((u) => u.includes("place/text"))!;
    expect(textUrl).toContain("city=110000");
    expect(textUrl).toContain("citylimit=true");
    expect(textUrl).toContain("110000");
    expect(textUrl).toContain("140100");
  });

  it("AC5: returns attractions with id, name_zh, coordinates, and enum environment", async () => {
    const f = makeFetch([
      { match: AMAP_REGEO, respond: () => regeoBody },
      { match: AMAP_TEXT, respond: () => poisBody },
    ]);
    const client = new AmapClient(f, "testkey", cfg);
    const list = await client.attractions(await client.adcodeFor(39.9, 116.4));
    expect(list.length).toBeGreaterThan(0);
    for (const a of list) {
      expect(a.id).toBeTruthy();
      expect(a.nameZh).toBeTruthy();
      expect(["indoor", "outdoor", "mixed"]).toContain(a.environment);
      expect(a.location).toContain(",");
    }
  });

  it("AC6: maps typecode to environment, defaulting to mixed", () => {
    expect(environmentForTypecode("140100")).toBe("indoor"); // museum
    expect(environmentForTypecode("140200")).toBe("indoor"); // exhibition hall
    expect(environmentForTypecode("140400")).toBe("indoor"); // art gallery
    expect(environmentForTypecode("110100")).toBe("outdoor"); // park & square
    expect(environmentForTypecode("110202")).toBe("outdoor"); // national scenic spot
    expect(environmentForTypecode("999999")).toBe("mixed"); // unmapped
  });

  it("AC8: caches per city within the TTL (single Amap call)", async () => {
    const f = makeFetch([
      { match: AMAP_REGEO, respond: () => regeoBody },
      { match: AMAP_TEXT, respond: () => poisBody },
    ]);
    const client = new AmapClient(f, "testkey", cfg);
    const adcode = await client.adcodeFor(39.9, 116.4);
    await client.attractions(adcode);
    await client.attractions(adcode);
    expect(f.count("place/text")).toBe(1);
  });
});

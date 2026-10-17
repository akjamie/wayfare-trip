import { describe, it, expect } from "vitest";
import { rankForDay } from "../src/rank.js";
import { loadConfig } from "../src/config.js";
import type { Attraction, Environment } from "../src/types.js";

const cfg = loadConfig({} as Record<string, string>, {});

const a = (id: string, rank: number, env: Environment = "outdoor"): Attraction => ({
  id,
  nameZh: id,
  environment: env,
  typecode: "",
  location: "0,0",
  lat: 0,
  lon: 0,
  relevanceRank: rank,
});

describe("ranking", () => {
  it("AC18: deterministic; ties are broken by POI id ascending", () => {
    const list = [a("B", 0), a("A", 0), a("C", 1)];
    const run1 = rankForDay(list, { rain: false, hot: false }, cfg).map((r) => r.id);
    const run2 = rankForDay(list, { rain: false, hot: false }, cfg).map((r) => r.id);
    expect(run1).toEqual(run2);
    // equal relevanceRank(0) -> id asc (A,B), then rank 1 (C)
    expect(run1).toEqual(["A", "B", "C"]);
  });

  it("AC18b: preserves Amap relevance order within a tier", () => {
    const list = [a("Z", 0), a("Y", 1), a("X", 2)];
    const order = rankForDay(list, { rain: false, hot: false }, cfg).map((r) => r.id);
    expect(order).toEqual(["Z", "Y", "X"]);
  });

  it("AC19: caps each day at top-N", () => {
    const list = [a("A", 0), a("B", 1), a("C", 2)];
    expect(rankForDay(list, { rain: false, hot: false }, { ...cfg, topN: 2 })).toHaveLength(2);
    expect(rankForDay(list, { rain: false, hot: false }, cfg)).toHaveLength(3);
  });
});

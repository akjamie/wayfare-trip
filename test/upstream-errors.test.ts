import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { recommend, NO_ATTRACTION_NOTICE } from "../src/recommend.js";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import {
  makeFetch,
  happyRoutes,
  AMAP_GEOCODE,
  AMAP_TEXT,
  WEATHER,
  weatherBody,
  type Route,
} from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

const emptyPoisRoutes: Route[] = [
  { match: AMAP_TEXT, respond: () => ({ status: "1", count: "0", pois: [] }) },
  { match: WEATHER, respond: () => weatherBody(7) },
];

describe("upstream failures (domain)", () => {
  it("AC24: weather API error blocks with forecast_unavailable (503)", async () => {
    const f = makeFetch(happyRoutes(), { fail: (u) => u.includes(WEATHER) });
    await expect(recommend("Beijing", cfg, f)).rejects.toMatchObject({
      code: "forecast_unavailable",
      status: 503,
    });
  });

  it("AC25: Amap error status incl. quota 10003 blocks with attraction_source_unavailable (503)", async () => {
    const f = makeFetch([
      {
        match: AMAP_TEXT,
        respond: () => ({ status: "0", info: "DAILY_QUERY_OVER_LIMIT", infocode: "10003" }),
      },
      { match: WEATHER, respond: () => weatherBody(7) },
    ]);
    await expect(recommend("Beijing", cfg, f)).rejects.toMatchObject({
      code: "attraction_source_unavailable",
      status: 503,
    });
  });

  it("AC25b: Amap network failure blocks with attraction_source_unavailable", async () => {
    const f = makeFetch(happyRoutes(), { fail: (u) => u.includes(AMAP_TEXT) });
    await expect(recommend("Beijing", cfg, f)).rejects.toMatchObject({
      code: "attraction_source_unavailable",
    });
  });

  it("AC26: Amap OK with zero scenic POIs yields no_attraction_data notice and empty lists", async () => {
    const r = await recommend("Beijing", cfg, makeFetch(emptyPoisRoutes));
    expect(r.notices).toContain(NO_ATTRACTION_NOTICE);
    for (const d of r.days) expect(d.attractions).toHaveLength(0);
  });
});

let server: Server | undefined;
async function start(routes: Route[]): Promise<string> {
  server = createApp(cfg, makeFetch(routes));
  await new Promise<void>((res) => server!.listen(0, res));
  const addr = server!.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return `http://127.0.0.1:${port}`;
}
afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = undefined;
});

describe("error taxonomy (http)", () => {
  it("AC27: 400 unknown_city / 503 forecast_unavailable / 200 no_attraction_data", async () => {
    const unknown = await start([
      { match: AMAP_GEOCODE, respond: () => ({ status: "1", geocodes: [] }) },
    ]);
    const r1 = await fetch(`${unknown}/api/recommend?city=Nowhere&days=7`);
    expect(r1.status).toBe(400);
    expect((await r1.json()).error_code).toBe("unknown_city");
    await new Promise<void>((r) => server!.close(() => r()));
    server = undefined;

    const weatherDown = await start(
      happyRoutes().map((r) =>
        r.match === WEATHER
          ? { ...r, respond: () => { throw new Error("down"); } }
          : r,
      ),
    );
    const r2 = await fetch(`${weatherDown}/api/recommend?city=Beijing&days=7`);
    expect(r2.status).toBe(503);
    expect((await r2.json()).error_code).toBe("forecast_unavailable");
    await new Promise<void>((r) => server!.close(() => r()));
    server = undefined;

    const noData = await start(emptyPoisRoutes);
    const r3 = await fetch(`${noData}/api/recommend?city=Beijing&days=7`);
    expect(r3.status).toBe(200);
    const body3: any = await r3.json();
    expect(body3.notices).toContain(NO_ATTRACTION_NOTICE);
  });
});

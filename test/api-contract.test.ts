import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes, type Route, type MockFetch } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

let server: Server | undefined;
let mock: MockFetch | undefined;

async function start(routes: Route[] = happyRoutes()): Promise<string> {
  mock = makeFetch(routes);
  server = createApp(cfg, mock);
  await new Promise<void>((res) => server!.listen(0, res));
  const addr = server!.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = undefined;
  mock = undefined;
});

describe("http contract", () => {
  it("AC22: valid request returns the documented schema", async () => {
    const base = await start();
    const res = await fetch(`${base}/api/recommend?city=Beijing&days=7`);
    expect(res.status).toBe(200);
    const body: any = await res.json();

    expect(body.city).toMatchObject({ name: expect.any(String), admin1: expect.any(String) });
    expect(typeof body.city.lat).toBe("number");
    expect(typeof body.city.lon).toBe("number");
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days).toHaveLength(7);
    expect(Array.isArray(body.notices)).toBe(true);
    expect(typeof body.summary).toBe("string");

    for (const d of body.days) {
      expect(typeof d.date).toBe("string");
      expect(d.weather).toMatchObject({
        summary: expect.any(String),
        tempMaxC: expect.any(Number),
        tempMinC: expect.any(Number),
        precipProb: expect.any(Number),
        weatherCode: expect.any(Number),
      });
      expect(typeof d.advice).toBe("string");
      expect(Array.isArray(d.attractions)).toBe(true);
      for (const a of d.attractions) {
        expect(["indoor", "outdoor", "mixed"]).toContain(a.environment);
        expect(typeof a.name_zh).toBe("string");
        expect(typeof a.id).toBe("string");
        expect(String(a.location)).toContain(",");
        expect(Array.isArray(a.advisories)).toBe(true);
      }
    }
  });

  it("AC23: invalid input returns 400 invalid_input with {error_code, message}", async () => {
    const base = await start();
    const cases = [
      `/api/recommend?city=&days=7`,
      `/api/recommend?city=%20%20&days=7`,
      `/api/recommend?city=${"x".repeat(65)}&days=7`,
      `/api/recommend?city=Beijing&days=0`,
      `/api/recommend?city=Beijing&days=17`,
      `/api/recommend?city=Beijing&days=abc`,
    ];
    for (const path of cases) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error_code).toBe("invalid_input");
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    }
  });

  it("AC8 (production path): repeated requests reuse the per-city Amap cache", async () => {
    const base = await start();
    await fetch(`${base}/api/recommend?city=Beijing&days=7`);
    await fetch(`${base}/api/recommend?city=Beijing&days=7`);
    expect(mock!.count("place/text")).toBe(1);
    expect(mock!.count("geocode/regeo")).toBe(1);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { makeFetch, happyRoutes } from "./helpers.js";

const cfg = { ...loadConfig({} as Record<string, string>, {}), amapKey: "testkey" };

let server: Server | undefined;
async function start(): Promise<string> {
  server = createApp(cfg, makeFetch(happyRoutes()));
  await new Promise<void>((r) => server!.listen(0, r));
  const addr = server!.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return `http://127.0.0.1:${port}`;
}
afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = undefined;
});

describe("website smoke", () => {
  it("AC5: hero/search (+ hotel preferences), language toggle, weather, cards, hotels, itinerary, routes", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain("<!doctype html>");
    for (const id of [
      "hero",
      "lang",
      "weather",
      "cards",
      "itinerary",
      "hotels",
      "routes",
      "star-chips",
      "pricemin",
      "pricemax",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("AC6: responsive viewport + breakpoints; images alt; grouped layout", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain('name="viewport"');
    expect(html).toContain("@media");
    expect(html).toContain('class="day-list"');

    const js = await (await fetch(`${base}/app.js`)).text();
    expect(js).toContain("/api/recommend");
    expect(js).toContain("alt=");
    expect(js).toContain("day-group");
  });

  it("AC7: page displays Amap photo attribution", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain("amap");
  });

  it("AC19: loading, empty, error, and active state hooks are present", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain('id="loading"');
    expect(html).toContain('id="error"');
    expect(html).toContain("skeleton");
    expect(html).toContain("aria-pressed");

    const js = await (await fetch(`${base}/app.js`)).text();
    expect(js).toContain("aria-pressed");
    expect(js).toContain("noHotels");
    expect(js).toContain("unreachable");
  });

  it("only serves files under public/", async () => {
    const base = await start();
    for (const p of ["/package.json", "/.env", "/src/config.ts"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status).toBe(404);
    }
  });
});

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
  it("AC15: page has hero/search, language toggle, weather strip, cards, itinerary", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('id="hero"');
    expect(html).toContain('id="lang"'); // language toggle
    expect(html).toContain('id="weather"'); // weather strip
    expect(html).toContain('id="cards"'); // attraction cards
    expect(html).toContain('id="itinerary"'); // itinerary
  });

  it("AC16: responsive viewport + breakpoints; images carry alt; grouped per-day layout", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain('name="viewport"');
    expect(html).toContain("@media");
    // #cards must be a block list (not a grid), so day headers aren't grid cells.
    expect(html).toContain('class="day-list"');

    const js = await (await fetch(`${base}/app.js`)).text();
    expect(js).toContain("/api/recommend");
    expect(js).toContain("alt=");
    // Each day is wrapped in a .day-group block with a nested .cards grid.
    expect(js).toContain("day-group");
    expect(js).toContain('class="cards"');
  });

  it("AC17: page displays Amap photo attribution", async () => {
    const base = await start();
    const html = (await (await fetch(`${base}/`)).text()).toLowerCase();
    expect(html).toContain("amap");
  });

  it("only serves files under public/", async () => {
    const base = await start();
    for (const p of ["/package.json", "/.env", "/src/config.ts"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status).toBe(404);
    }
  });
});

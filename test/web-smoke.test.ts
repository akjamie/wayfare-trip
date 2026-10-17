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
  it("AC20: serves the page, which references the recommend API and its script", async () => {
    const base = await start();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = (await res.text()).toLowerCase();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("/app.js");
    expect(html).toContain("<form");
  });

  it("serves app.js, which calls the JSON API", async () => {
    const base = await start();
    const res = await fetch(`${base}/app.js`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("/api/recommend");
  });

  it("only serves files under public/ (no traversal / repo files)", async () => {
    const base = await start();
    for (const p of ["/package.json", "/.env", "/src/config.ts"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status).toBe(404);
    }
  });
});

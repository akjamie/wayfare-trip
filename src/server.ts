import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();
if (!cfg.amapKey) {
  console.warn(
    "[wayfare-trip] AMAP_KEY is not set. Attraction lookups will fail; copy .env.example to .env and set AMAP_KEY.",
  );
}

const port = Number(process.env.PORT ?? 3000);
createApp(cfg).listen(port, () => {
  console.log(`[wayfare-trip] listening on http://localhost:${port}`);
});

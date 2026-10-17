import { createServer, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { loadConfig, type Config } from "./config.js";
import { httpFetch, type FetchLike } from "./http.js";
import { recommend, validateDays } from "./recommend.js";
import { AppError } from "./errors.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = normalize(join(HERE, "..", "public"));

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = normalize(join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const body = await readFile(full);
    res.writeHead(200, { "content-type": CONTENT_TYPES[extname(full)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

/** Build the HTTP app. Dependencies are injectable for tests. */
export function createApp(
  cfg: Config = loadConfig(),
  fetchImpl: FetchLike = httpFetch,
): Server {
  return createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname === "/api/recommend") {
          const days = validateDays(url.searchParams.get("days"), cfg);
          const city = url.searchParams.get("city") ?? "";
          sendJson(res, 200, await recommend(city, cfg, fetchImpl, days));
          return;
        }
        await serveStatic(url.pathname, res);
      } catch (err) {
        if (err instanceof AppError) {
          sendJson(res, err.status, { error_code: err.code, message: err.message });
        } else {
          sendJson(res, 500, {
            error_code: "internal_error",
            message: "Something went wrong. Please try again.",
          });
        }
      }
    })();
  });
}

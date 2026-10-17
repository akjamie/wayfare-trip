# Clarifications: city-attractions-weather-recommendations

> Requirement: "用户输入一个中国城市名,系统返回该城市的景点推荐,并结合未来几天的天气给出建议:下雨时优先室内景点,高温时避开中午的户外景点. 整个系统用英文作为默认输出"
> Settled via `batch-grill-me`. Round 1 set the initial scope; **Round 2 revised the
> scope (website + Amap) and resolved the CI spec-review blockers/findings.**

## Requirement
"用户输入一个中国城市名,系统返回该城市的景点推荐,并结合未来几天的天气给出建议:下雨时优先室内景点,高温时避开中午的户外景点. 整个系统用英文作为默认输出"

## Settled decisions

### Round 2 — revised scope (supersedes Round 1 where noted)

- **RQ1 — Delivery shape** → **Website** (browser UI) on a Node/TypeScript backend, with a single JSON API; recommendation logic stays a pure, testable module. **The CLI is dropped.** (Supersedes R1 Q1.)
  Reason: the product output is a website; the API is the internal seam and the core is reused by both UI and tests.

- **RQ2 — Weather source** → **Open-Meteo** (free, no API key; hourly `precipitation_probability`, WMO `weather_code`, `timezone=auto`). (Confirms R1 Q2.)
  Reason: Amap's free weather API is only 3-day day/night (no hourly, no precipitation probability), insufficient for the "avoid midday" logic.

- **RQ3 — Attraction source + English names** → **Amap Web Service API** (`/v3/place/text`, `types=110000` 风景名胜), key required. System/UI/advice/city output is English; **Amap POI proper names are kept as `name_zh` (Chinese) with optional `name_en` when available**, because Amap's English POI search (`langCode=en`) is a paid multilingual service. (Supersedes R1 Q3 bundled-dataset.)

- **RQ4 — Amap environment mapping** → Amap exposes no indoor/outdoor flag; `environment ∈ {indoor,outdoor,mixed}` is derived from `typecode` via a **configurable mapping** (not hardcoded in logic).

- **RQ5 — Amap quota protection** → per-city Amap responses are **cached with a TTL** (default 24h) to respect the ~100 search calls/day personal quota.

### Round 2 — CI spec-review resolutions

- **B1 — Forecast-unavailable semantics** → *Superseded by Round 3*: upstream API errors now **block** with a friendly system-issue message (see Round 3 / NB1).

- **B2 — No-attraction-data semantics** → **Degraded success**: HTTP 200 with a `no_attraction_data` notice and zero fabricated attractions. `no-attraction` is removed from the error taxonomy.

- **B3 — Output shape** → **Per-day recommendations**: `days[]` (one entry per forecast day), each with its weather summary, advice, and ranked attraction list. (Not a single merged ranking.)

- **M1 — Mixed attractions** → For rain, mixed ranks in the **indoor tier**; for heat, mixed **also** carries the "avoid 11:00–15:00" advisory (it has outdoor exposure).

- **M2 — Ordering & top-N** → Within a tier, preserve Amap relevance order; tie-break by POI `id` ascending; cap **top-N = 10 per day** (configurable). Deterministic and reproducible.

- **M3 — Horizon & timezone** → `forecast_days = 7` (configurable); timezone = **city-local** (`timezone=auto`); the 11:00–15:00 window is interpreted in city-local time.

- **M4 — Interface contract** → `GET /api/recommend?city=<name>&days=<n>`. Response JSON schema defined; error body `{error_code, message}`; error→status table; threshold overrides via env (`WAYFARE_RAIN_PROB`, `WAYFARE_HIGH_TEMP_C`, `WAYFARE_NOON_START`, `WAYFARE_NOON_END`) with precedence **env > default**.

- **M5 — Disambiguation** → Constrain to **country=CN**, pick the candidate with the **highest population**; expose the resolved English name and `admin1`.

- **Minors (all applied)** → Enumerate default rain WMO codes (51–67, 80–82, 95–99) and treat snow (71–77, 85–86) as precipitation for indoor-first; document the 33°C rationale (conservative vs China MET's 35°C 高温预警 line); NFRs = p95 < 2s warm + 3s upstream timeout; input validation (empty/whitespace/overlong → 400); test runner = **vitest**; trailing newlines fixed; `explore.md` marked N/A (greenfield).

### Round 3 — Amap surface-area review resolutions

- **NB1 — Upstream API failure handling** → On **any upstream API error** (weather API *or* Amap attraction API), **block** the response and return a **user-friendly system-issue message** with HTTP `503` and a matching `error_code` (`forecast_unavailable` / `attraction_source_unavailable`); no partial/degraded recommendations. `start=0`/`infocode=10003` (quota), invalid/expired key, and timeouts are all treated as API errors. (Supersedes the Round-2 B1 degraded-success decision.)

- **NB2 — POI type coverage** → Widen `types` to `110000|140100|140200|140400|140600` (scenic + museum + exhibition hall + art gallery + science museum) and extend the typecode→environment map (`1401xx`/`1402xx`/`1404xx`/`1406xx` → indoor; `1101xx`/`1102xx` → outdoor/mixed; unmapped → mixed).

- **NB3 — City → Amap query bridge** → Keep **Open-Meteo** for city resolution (approved disambiguation + English/pinyin input), then obtain the city `adcode` via **Amap reverse geocoding** at the resolved coordinates and query `place/text` with `city=<adcode>&citylimit=true`. (Coords are the robust bridge; no name translation.)

- **Minors** → `days` range pinned to **1–16**; overlong `city` (**>64 chars**) → `400`; **drop `name_en`** (keep `name_zh` only — no English-name source); scope AC18 determinism to **cached/mocked input**; mark `explore.md` **N/A**; regenerate the stale PR body.

## Open questions
<!-- must be empty before the spec is written -->
(none)
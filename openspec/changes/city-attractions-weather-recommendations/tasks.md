# Tasks

<!-- Mutable execution state, generated AFTER approval. Not part of approved intent. -->
<!-- Task-level TDD: for each pair, write the failing test first, then implement, then paste runner output. -->

## 1. Scaffold & test harness
- [x] 1.1 [IMPL] Initialize the Node/TypeScript project (package.json, tsconfig, vitest config, `src/`, `test/`) so tests can run. (harness for AC1–AC27)
  - evidence: `npm test` executes and reports the empty suite.
- [x] 1.2 [IMPL] Add `.env` loading (`AMAP_KEY`) and a config module with defaults `WAYFARE_RAIN_PROB=50`, `WAYFARE_HIGH_TEMP_C=33`, `WAYFARE_NOON_START=11:00`, `WAYFARE_NOON_END=15:00`, `WAYFARE_FORECAST_DAYS=7`, `WAYFARE_TOP_N=10`. (supports AC13, AC16, AC17, AC19)
  - evidence: config module unit test returns the defaults and honors env overrides.

## 2. City resolution & disambiguation
- [x] 2.1 [TEST] Write failing tests for city resolution/disambiguation. (AC1)
  - verify: `npx vitest run test/city-resolve.test.ts` fails — 北京/beijing/Beijing must resolve to one location with lat/long and `country=CN`.
- [x] 2.2 [IMPL] Implement the Open-Meteo geocoding resolver (Chinese/pinyin/English). (AC1)
  - evidence: `test/city-resolve.test.ts` AC1 passes.
- [x] 2.3 [TEST] Add tests: multi-match picks the highest-population candidate and returns name + `admin1`. (AC2)
  - verify: `npx vitest run test/city-resolve.test.ts` fails on the disambiguation cases.
- [x] 2.4 [IMPL] Implement population-based disambiguation + `admin1` exposure. (AC2)
  - evidence: AC2 passes.
- [x] 2.5 [TEST] Add tests: unresolvable and non-China names return `unknown_city` with no payload. (AC3, AC4)
  - verify: `npx vitest run test/city-resolve.test.ts` fails on both cases.
- [x] 2.6 [IMPL] Constrain resolution to `country=CN` and emit `unknown_city` errors. (AC3, AC4)
  - evidence: AC3 + AC4 pass.

## 3. Amap client: adcode bridge, environment mapping, cache
- [x] 3.1 [TEST] Write failing tests for the Amap client (mocked HTTP). (AC5)
  - verify: `npx vitest run test/amap-client.test.ts` fails — attractions must carry `id`, `name_zh`, coords, and an `environment` enum.
- [x] 3.2 [IMPL] Implement the Amap client: reverse-geocode the resolved coords → `adcode`, then `place/text?city=<adcode>&citylimit=true&types=110000|140100|140200|140400|140600`. (AC5, AC7)
  - evidence: AC5 passes and the request URL asserted by the test includes `city=<adcode>`, `citylimit=true`, and `types` containing `110000` and `140100`.
- [x] 3.3 [TEST] Add tests for typecode→environment mapping (museum `1401xx`→indoor, park `1101xx`→outdoor, unmapped→mixed). (AC6)
  - verify: `npx vitest run test/amap-client.test.ts` fails on unmapped/default cases.
- [x] 3.4 [IMPL] Implement the configurable typecode→environment mapping with a `mixed` fallback. (AC6)
  - evidence: AC6 passes.
- [x] 3.5 [TEST] Add a cache test: a second request within the TTL issues no second Amap call. (AC8)
  - verify: `npx vitest run test/amap-client.test.ts` fails — mock counts Amap calls.
- [x] 3.6 [IMPL] Implement the per-city TTL cache (concurrency-safe). (AC8)
  - evidence: AC8 passes with call-count == 1.

## 4. Weather fetch & per-day recommendation
- [x] 4.1 [TEST] Write failing tests for per-day assembly. (AC9)
  - verify: `npx vitest run test/recommendation.test.ts` fails — `days[]` must have one entry per forecast day.
- [x] 4.2 [IMPL] Implement the Open-Meteo forecast fetch + per-day entry builder (`date`, `weather`, `advice`, `attractions[]`). (AC9)
  - evidence: AC9 passes.
- [x] 4.3 [TEST] Add tests: rain on day A → indoor-first on A; heat on day B → midday advisory on B, independent. (AC10)
  - verify: `npx vitest run test/recommendation.test.ts` fails on independent-day cases.
- [x] 4.4 [IMPL] Wire per-day ranking/advice into the day builder. (AC10)
  - evidence: AC10 passes.
- [x] 4.5 [TEST] Add a timezone test: the midday window uses city-local time (`timezone=auto`). (AC11)
  - verify: `npx vitest run test/recommendation.test.ts` fails on a non-UTC city.
- [x] 4.6 [IMPL] Apply city-local time to the midday window. (AC11)
  - evidence: AC11 passes.

## 5. Rain & heat advice rules
- [x] 5.1 [TEST] Write failing tests for indoor-first ordering on rainy days. (AC12, AC13, AC14)
  - verify: `npx vitest run test/weather-advice.test.ts` fails — indoor+mixed must precede outdoor when precip ≥ 50% or WMO in 51–67/80–82/95–99, and snow codes 71–77/85–86 count as precipitation.
- [x] 5.2 [IMPL] Implement rain classification (prob threshold + WMO rain/snow sets) and indoor-first tiering. (AC12, AC13, AC14)
  - evidence: AC12, AC13, AC14 pass.
- [x] 5.3 [TEST] Write failing tests for the hot-day midday advisory on outdoor **and** mixed. (AC15, AC16)
  - verify: `npx vitest run test/weather-advice.test.ts` fails — max ≥ 33°C flags outdoor+mixed; max < 33°C flags none.
- [x] 5.4 [IMPL] Implement the hot-day midday advisory. (AC15, AC16)
  - evidence: AC15 + AC16 pass.
- [x] 5.5 [TEST] Add tests: overriding `WAYFARE_HIGH_TEMP_C` / noon window changes where advisories trigger. (AC17)
  - verify: `npx vitest run test/weather-advice.test.ts` fails under override.
- [x] 5.6 [IMPL] Read thresholds/window from config. (AC17)
  - evidence: AC17 passes.

## 6. Deterministic ranking & top-N
- [x] 6.1 [TEST] Write failing tests for tie-break (POI `id` asc) determinism over fixed input. (AC18)
  - verify: `npx vitest run test/ranking.test.ts` fails — repeated runs must be identical.
- [x] 6.2 [IMPL] Implement tier-preserving ranking with `id`-asc tie-break. (AC18)
  - evidence: AC18 passes.
- [x] 6.3 [TEST] Add a top-N cap test (default 10, configurable). (AC19)
  - verify: `npx vitest run test/ranking.test.ts` fails when candidates exceed N.
- [x] 6.4 [IMPL] Implement the configurable top-N cap. (AC19)
  - evidence: AC19 passes.

## 7. Output language & website
- [x] 7.1 [TEST] Write failing tests: all UI/advice/weather/city strings are English; response has JSON + English summary; every attraction has non-empty `name_zh`. (AC20, AC21)
  - verify: `npx vitest run test/web-output.test.ts` fails.
- [x] 7.2 [IMPL] Implement the English output formatter (no `name_en`). (AC20, AC21)
  - evidence: AC20 + AC21 pass.
- [x] 7.3 [IMPL] Add a minimal responsive website page that calls the JSON API. (AC20)
  - evidence: web smoke test loads the page and asserts it calls `GET /api/recommend`.

## 8. HTTP contract & input validation
- [x] 8.1 [TEST] Write failing contract tests for `GET /api/recommend`. (AC22)
  - verify: `npx vitest run test/api-contract.test.ts` fails — 200 shape `{city, days[], summary, notices[]}` with correct types/enum.
- [x] 8.2 [IMPL] Implement the endpoint + JSON schema. (AC22)
  - evidence: AC22 passes.
- [x] 8.3 [TEST] Add validation tests: empty/whitespace/`>64`-char city, or `days` outside 1–16 → `400 invalid_input`. (AC23)
  - verify: `npx vitest run test/api-contract.test.ts` fails on invalid input.
- [x] 8.4 [IMPL] Implement input validation + `{error_code, message}` body. (AC23)
  - evidence: AC23 passes.

## 9. Upstream API failure taxonomy
- [x] 9.1 [TEST] Write failing tests with injected upstream failures. (AC24, AC25)
  - verify: `npx vitest run test/upstream-errors.test.ts` fails — weather error/timeout → `503 forecast_unavailable`; Amap error (incl. `infocode=10003`, bad key, timeout) → `503 attraction_source_unavailable`; both with a user-friendly message and no partial results.
- [x] 9.2 [IMPL] Implement the blocking upstream-error handling + friendly messages. (AC24, AC25)
  - evidence: AC24 + AC25 pass.
- [x] 9.3 [TEST] Add a test: Amap OK with zero scenic POIs → `200` `no_attraction_data` notice, empty lists. (AC26)
  - verify: `npx vitest run test/upstream-errors.test.ts` fails on the empty-result case.
- [x] 9.4 [IMPL] Implement the `no_attraction_data` notice path. (AC26)
  - evidence: AC26 passes.
- [x] 9.5 [TEST] Add a taxonomy test asserting `400`/`503`/`200` codes per case. (AC27)
  - verify: `npx vitest run test/upstream-errors.test.ts` fails if any mapping is wrong.
- [x] 9.6 [IMPL] Finalize the `error_code → HTTP status` mapping. (AC27)
  - evidence: AC27 passes.

## 10. Converge & verify
- [x] 10.1 [IMPL] Run the full suite and confirm every AC is covered. (AC1–AC27)
  - evidence: `npm test` -> PASS — Test Files 8 passed (8), Tests 30 passed (30), Duration 661ms.
  - evidence: `npx tsc --noEmit` -> PASS (no type errors).
- [x] 10.2 [IMPL] Run `asdlc verify city-attractions-weather-recommendations` and fix any failing gate.
  - evidence: verify output with all gates passing.

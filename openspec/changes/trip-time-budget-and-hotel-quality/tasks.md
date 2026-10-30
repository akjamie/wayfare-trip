# Tasks

<!-- Mutable execution state, generated AFTER approval. Not part of approved intent. -->

## 1. Attraction visit duration
- [x] 1.1 [TEST] Failing tests: mapped category → duration; unmapped → default 90; bounds 30–480; configurable mapping. (AC5, AC6)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 1.2 [IMPL] Implement `src/duration.ts` (typecode/category → visitMinutes map + default + config override). (AC5, AC6)
  - evidence: duration tests PASS.

## 2. Time-budgeted daily plan
- [x] 2.1 [TEST] Failing tests: per-stop `startTime`/`endTime` monotonic from window start (09:00); stop `visitMinutes`; travel time between stops included; day `totalMinutes` ≤ window. (AC1, AC7)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 2.2 [IMPL] Implement scheduling in `src/itinerary.ts` (window from config, visit + travel accumulation). (AC1, AC7)
  - evidence: tests PASS.
- [x] 2.3 [TEST] Budget overflow: stops that exceed the window are dropped; ≥1 stop kept when available. (AC4)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 2.4 [IMPL] Drop overflow stops. (AC4)
  - evidence: AC4 passes.
- [x] 2.5 [TEST] Configurable window (e.g. 10:00–16:00) changes which stops fit. (AC8)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 2.6 [IMPL] Read window from config. (AC8)
  - evidence: AC8 passes.

## 3. Real travel times (Amap direction)
- [x] 3.1 [TEST] Failing tests: legs use Amap direction `distance`/`duration` (walking ≤2km, driving otherwise). (AC9)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.2 [IMPL] Implement direction calls in `src/amap.ts` + wire into `src/route.ts` (cached per leg). (AC9)
  - evidence: AC9 passes.
- [x] 3.3 [TEST] Direction failure → haversine fallback, still valid route. (AC10)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.4 [IMPL] Implement the haversine fallback. (AC10)
  - evidence: AC10 passes.

## 4. Hotel source & selection quality
- [x] 4.1 [TEST] Failing tests: hotel query uses only `100100|100101–100105`; generic `100000`/hostels excluded. (AC11)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 4.2 [IMPL] Change the hotel query typecodes + drop non-hotel POIs. (AC11)
  - evidence: AC11 passes.
- [x] 4.3 [TEST] Ranking: Amap relevance (relevanceRank asc) → brand boost → rating desc → distance asc → id asc. (AC12)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 4.4 [IMPL] Implement the brand list + new ranking. (AC12)
  - evidence: AC12 passes.
- [x] 4.5 [TEST] Zero qualifying hotels → 200 + localized notice. (AC13)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 4.6 [IMPL] Zero-hotel notice path. (AC13)
  - evidence: AC13 passes.

## 5. UI
- [x] 5.1 [IMPL] Itinerary stops render `startTime–endTime` and visit minutes; day shows `totalMinutes`; hotel cards show brand/star. (AC1, AC12)
  - evidence: web-smoke assertions pass.

## 6. Converge & verify
- [x] 6.1 [IMPL] Full suite + typecheck. (AC1–AC13)
  - evidence: `npm test` -> PASS — 15 files / 70 tests.
  - evidence: `npx tsc --noEmit` -> exit 0.
- [x] 6.2 [IMPL] Live smoke: real direction legs + hotels for a city. (AC9, AC11)
  - evidence: Xi'an → 3 hotels; day1 3 stops (09:50–15:29, 445 min total incl. real drive/walk legs 9.8km/50min, 0.5km/7min…); day2 342 min.
  - evidence: paste output.
- [x] 6.3 [IMPL] `asdlc verify trip-time-budget-and-hotel-quality` all gates pass.
  - evidence: verify output.

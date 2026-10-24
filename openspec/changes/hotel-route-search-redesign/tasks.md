# Tasks

<!-- Mutable execution state, generated AFTER approval. Not part of approved intent. -->
<!-- Task-level TDD: for each pair, write the failing test first, then implement, then paste runner output. -->

## 1. Hotel filters & HTTP contract
- [x] 1.1 [TEST] Failing tests: optional `star`/`priceMin`/`priceMax` accepted and echoed in `hotelFilters`; invalid `star`, non-integer/negative price, inverted bounds → 400. (AC1, AC3, AC4)
  - verify: `npx vitest run test/api-contract.test.ts` fails.
- [x] 1.2 [IMPL] Parse + validate filters in `app.ts` (`star ∈ {3,4,5}`, non-negative integers, `priceMin ≤ priceMax`) and echo them. (AC3, AC4)
  - evidence: AC3 + AC4 pass.
- [x] 1.3 [IMPL] Extend the response schema with `hotels[]`, `hotelFilters`, and `days[].route`. (AC1)
  - evidence: AC1 passes (documented shape).
- [x] 1.4 [TEST] Invalid city/days still → 400 `invalid_input` with `{error_code, message}`. (AC2)
  - verify: `npx vitest run test/api-contract.test.ts` fails.
- [x] 1.5 [IMPL] Preserve existing validation + error body. (AC2)
  - evidence: AC2 passes.

## 2. Hotel recommendations
- [x] 2.1 [TEST] Failing tests: up to 3 hotels (1 primary), fields, deterministic ranking (filter match → rating desc, missing last → itinerary-centroid distance asc → id asc). (AC8)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 2.2 [IMPL] Implement `src/hotels.ts` (map Amap hotel POIs, 3-hotel ranking, primary flag). (AC8)
  - evidence: AC8 passes.
- [x] 2.3 [TEST] Minimum-star filter: `star=N` → all levels `>= N`; unknown level excluded. (AC9)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 2.4 [IMPL] Implement typecode→star mapping + minimum filter + unknown exclusion. (AC9)
  - evidence: AC9 passes.
- [x] 2.5 [TEST] Price filter: all `cost` within bounds; unknown cost excluded. (AC10)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 2.6 [IMPL] Implement price filtering. (AC10)
  - evidence: AC10 passes.
- [x] 2.7 [TEST] Zero usable hotels → 200 + `no_hotel_data` notice; hotel API failure → 503. (AC15, AC16)
  - verify: `npx vitest run test/hotels.test.ts` fails.
- [x] 2.8 [IMPL] Implement the empty-hotel notice path and the failure → `attraction_source_unavailable` mapping. (AC15, AC16)
  - evidence: AC15 + AC16 pass.

## 3. Daily travel route
- [x] 3.1 [TEST] Failing tests: route starts/ends at the primary hotel, covers the day's itinerary stops. (AC11)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.2 [IMPL] Implement `src/route.ts` (hotel → stops → hotel) and wire into each day. (AC11)
  - evidence: AC11 passes.
- [x] 3.3 [TEST] Legs carry `from`/`to` (POI ids), `distanceKm`, `durationMin` (walk 5 / drive 30 km/h), `mode` (walk ≤2 km). (AC12)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.4 [IMPL] Implement haversine + duration formula + mode. (AC12)
  - evidence: AC12 passes.
- [x] 3.5 [TEST] Deterministic nearest-neighbor ordering. (AC13)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.6 [IMPL] Implement nearest-neighbor ordering. (AC13)
  - evidence: AC13 passes.
- [x] 3.7 [TEST] No hotel → stops without endpoints; zero stops → empty route (totals 0). (AC14, AC17)
  - verify: `npx vitest run test/route.test.ts` fails.
- [x] 3.8 [IMPL] Handle no-hotel and zero-stop cases. (AC14, AC17)
  - evidence: AC14 + AC17 pass.

## 4. Search & UI (tourism, visual states)
- [x] 4.1 [TEST] Failing tests: page has hero/search with hotel preference controls, language toggle, weather strip, cards, hotel section, itinerary, route sections; attribution. (AC5, AC7)
  - verify: `npx vitest run test/web-smoke.test.ts` fails.
- [x] 4.2 [IMPL] Add the hotel/route sections + hotel preference controls (star + price) to `public/`. (AC5, AC7)
  - evidence: AC5 + AC7 pass.
- [x] 4.3 [TEST] Responsive breakpoints (≤640/641–1024/>1024), `alt` on images, and loading/empty/error/active state hooks. (AC6, AC19)
  - verify: `npx vitest run test/web-smoke.test.ts` fails.
- [x] 4.4 [IMPL] Implement breakpoints + loading skeleton + empty/error states + `aria-pressed` filter chips. (AC6, AC19)
  - evidence: AC6 + AC19 pass.

## 5. Localization
- [x] 5.1 [TEST] Hotel/route labels + `no_hotel_data` localized in `en`/`zh-CN`; catalog parity. (AC18)
  - verify: `npx vitest run test/i18n.test.ts` fails.
- [x] 5.2 [IMPL] Add hotel/route catalog keys to both locales. (AC18)
  - evidence: AC18 passes.

## 6. Converge & verify
- [x] 6.1 [IMPL] Run the full suite; confirm every AC is covered. (AC1–AC19)
  - evidence: `npm test` -> PASS — Test Files 15 passed (15), Tests 65 passed (65).
  - evidence: `npx tsc --noEmit` -> exit 0.
- [x] 6.2 [IMPL] Live smoke: real Amap hotel search + a rendered plan with hotels/route. (AC8, AC11)
  - evidence: Xi'an → 3 hotels; day1 3 stops / 4 legs (24 km / 53 min); day2 3 stops / 4 legs (142.1 km / 284 min).
- [x] 6.3 [IMPL] Run `asdlc verify hotel-route-search-redesign` and fix any failing gate.
  - evidence: verify output with all gates passing.

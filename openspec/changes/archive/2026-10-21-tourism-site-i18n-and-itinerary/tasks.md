# Tasks

<!-- Mutable execution state, generated AFTER approval. Not part of approved intent. -->
<!-- Task-level TDD: for each pair, write the failing test first, then implement, then paste runner output. -->

## 1. i18n catalogs & language resolution
- [x] 1.1 [TEST] Failing tests: default `en`, `zh-CN` selection, unsupported `lang` falls back to `en`, catalog key parity. (AC7, AC9)
  - verify: `npx vitest run test/i18n.test.ts` fails.
- [x] 1.2 [IMPL] Implement `src/i18n.ts` (en/zh-CN catalogs, keyed by message code) + lang precedence (`lang` → `Accept-Language` → `en`). (AC7, AC9)
  - evidence: `npx vitest run test/i18n.test.ts` -> PASS.
- [x] 1.3 [TEST] Add a catalog-parity assertion: both locales define the same keys, no missing-key placeholder. (AC7)
  - verify: `npx vitest run test/i18n.test.ts` fails on a missing key.
- [x] 1.4 [IMPL] Complete both catalogs so parity holds. (AC7)
  - evidence: parity + i18n tests PASS.

## 2. City resolution (Amap geocode + alias table + ambiguity)
- [x] 2.1 [TEST] Failing tests for resolution. (AC1, AC2, AC3, AC4)
  - verify: `npx vitest run test/city-resolve.test.ts` fails — `西安`/`Xian`/`Xi'an`→Xi'an (610100); multi-city-level → `ambiguous_city` (candidates expose `name`/`name_zh`/`adcode`); unresolvable/non-China → `unknown_city`.
- [x] 2.2 [IMPL] Implement the curated major-city alias table (zh+pinyin+English → adcode/coords) as primary resolver. (AC1)
  - evidence: AC1 passes and no network call is made for aliased cities.
- [x] 2.3 [IMPL] Implement the Amap geocode (`/v3/geocode/geo`) fallback with city-level (`level`=市) filtering and `ambiguous_city` candidates. (AC2, AC3, AC4)
  - evidence: AC2/AC3/AC4 pass; village/POI-level matches rejected.
- [x] 2.4 [TEST] Add province input + geocode-failure mapping tests. (AC5, AC6)
  - verify: `npx vitest run test/city-resolve.test.ts` fails — `广东`→Guangzhou; Amap geocode failure → `attraction_source_unavailable` (503), not `unknown_city`.
- [x] 2.5 [IMPL] Implement province→capital mapping and the geocode-failure→503 taxonomy mapping. (AC5, AC6)
  - evidence: AC5 + AC6 pass.

## 3. Recommendation reasons & attraction introductions/photos
- [x] 3.1 [TEST] Failing tests: each ranked attraction has a localized `reason` referencing the day's weather; each has an attribute-based `introduction` and `https` Amap `image` (or `null`). (AC10, AC11)
  - verify: `npx vitest run test/recommendation-detail.test.ts` fails.
- [x] 3.2 [IMPL] Implement localized `reason` (weather + environment + category) and attribute-based `introduction` + `image` (https-only). (AC10, AC11)
  - evidence: AC10 + AC11 pass.
- [x] 3.3 [TEST] Add a test that non-Amap/`http` photo URLs are discarded. (AC11)
  - verify: `npx vitest run test/recommendation-detail.test.ts` fails on an `http` URL fixture.
- [x] 3.4 [IMPL] Enforce https/Amap-origin filtering for `image`. (AC11)
  - evidence: AC11 passes.

## 4. Trip itinerary
- [x] 4.1 [TEST] Failing tests: per-day `itinerary` with 2–4 time slots; rainy day → every stop indoor/mixed; hot day → no outdoor in the midday slot; consistent with the day's advice. (AC12, AC13)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 4.2 [IMPL] Implement the day itinerary builder (morning/afternoon/evening) reusing the rain/heat classification. (AC12, AC13)
  - evidence: AC12 + AC13 pass.
- [x] 4.3 [TEST] Add the degenerate test: a day with 1 attraction yields a 1-stop itinerary. (AC14)
  - verify: `npx vitest run test/itinerary.test.ts` fails.
- [x] 4.4 [IMPL] Handle fewer-than-2 attractions without error. (AC14)
  - evidence: AC14 passes.

## 5. Tourism-style website + language toggle
- [x] 5.1 [TEST] Failing tests: served page has hero/search, language toggle, weather strip, attraction cards, itinerary; viewport meta + breakpoints; images have `alt`; Amap attribution. (AC15, AC16, AC17)
  - verify: `npx vitest run test/web-smoke.test.ts` fails.
- [x] 5.2 [IMPL] Redesign `public/` into a tourism-style responsive page with a language toggle, cards+images, itinerary, and attribution. (AC15, AC16, AC17)
  - evidence: AC15/AC16/AC17 pass.
- [x] 5.3 [TEST] Assert every returned attraction carries a non-empty `name_zh` (locale-independent). (AC8) — covered by the pre-existing `web-output.test.ts` case (labelled AC21 in v1).
  - verify: `npx vitest run test/web-output.test.ts` -> PASS (name_zh assertion).
- [x] 5.4 [IMPL] Ensure `name_zh` is always populated from Amap. (AC8)
  - evidence: `src/amap.ts` sets `nameZh` from `poi.name`; AC8 assertion passes (no new failing-test step needed).

## 6. Converge & verify
- [x] 6.1 [IMPL] Wire `lang` through `GET /api/recommend?city=&days=&lang=` and extend the response schema (lang, reason, introduction, image, itinerary). (AC7, AC10, AC11, AC12)
  - evidence: `test/api-contract.test.ts` (extended) passes.
- [x] 6.2 [IMPL] Run the full suite; confirm every AC is covered. (AC1–AC17)
  - evidence: `npm test` -> PASS — Test Files 13 passed (13), Tests 51 passed (51).
  - evidence: `npx tsc --noEmit` -> PASS (exit 0).
- [x] 6.3 [IMPL] Live smoke against real Amap geocode (`西安`/`Xi'an`) and Open-Meteo. (AC1)
  - evidence: `西安 -> Xi'an (西安)`, `Xian -> Xi'an (西安)`, `Beijing -> Beijing`; itineraries generated (Morning/Afternoon/Evening).
- [x] 6.4 [IMPL] Run `asdlc verify tourism-site-i18n-and-itinerary` and fix any failing gate.
  - evidence: verify output with all gates passing.

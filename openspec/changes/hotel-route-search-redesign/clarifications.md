# Clarifications: hotel-route-search-redesign

> Requirement: "在现有 '天气感知景点推荐' 基础上新增: (1) 重新设计顶部搜索框,改善用户体验; (2) 推荐计划中加入住宿酒店推荐,并支持在顶部搜索框以可选方式输入酒店星级或价格区间; (3) 在给出推荐酒店后,提供包含酒店的出行路线/日程安排"
> Settled via `batch-grill-me` Round 1 (all recommendations approved).

## Requirement
"在现有 '天气感知景点推荐' 基础上新增: (1) 重新设计顶部搜索框,改善用户体验; (2) 推荐计划中加入住宿酒店推荐,并支持在顶部搜索框以可选方式输入酒店星级或价格区间; (3) 在给出推荐酒店后,提供包含酒店的出行路线/日程安排"

## Context found during grilling
- The `attraction-weather-recommendations` capability is implemented and archived (v1 + v2); the living spec is at `openspec/specs/attraction-weather-recommendations/spec.md`.
- **Amap hotel typecodes** (`住宿服务` `100000`): `100100` 宾馆酒店, `100101` 奢华酒店, `100102` 五星级宾馆, `100103` 四星级宾馆, `100104` 三星级宾馆, `100105` 经济型连锁酒店, `100200` 旅馆招待所, `100201` 青年旅舍. `biz_ext` carries `rating` and `cost` (人均消费) for hotels.
- **Amap routing** (`/v3/direction/walking`, `/v3/direction/driving`) returns `distance` (m) + `duration` (s) and draws on the larger 基础LBS quota; but per-leg calls add latency/quota.

## Settled decisions

- **A1 — Base & relationship** → This change **MODIFIES** the `attraction-weather-recommendations` capability (redesigned search, hotel recommendations, daily routes).

- **B1 — Search hotel filters** → Add **optional** hotel preferences to the top search: **star** (any / 3★+ / 4★+ / 5★) and **price range** (min–max).

- **B2 — Search UX** → Clear labels, inline validation, loading state, responsive single column on mobile, a "Clear" action, and the hotel filters in a collapsible "Hotel preferences" group.

- **C1 — Hotel source** → Amap `place/text` with `types=100000`, `extensions=all` (for `biz_ext.cost`/`rating` and photos), same key/client/cache.

- **C2 — Star & price filtering** → Star derived from the typecode (`100102`→5★, `100103`→4★, `100104`→3★, `100105`→economy); price from `biz_ext.cost`. POIs missing the field are kept only when no filter is set (graceful).

- **C3 — How many** → Recommend **3 hotels** (1 primary + 2 alternatives); the **primary** is used for the whole trip.

- **C4 — Ranking** → Filter match → rating desc → distance to the trip's attractions centroid asc.

- **C5 — Localized hotel output** → localized name/intro + image + star label + price, following the existing attraction pattern (`name_zh`, https photo, attribute-based intro).

- **D1 — Route engine** → **Offline nearest-neighbor ordering + haversine distance/time** (no extra quota, deterministic). Amap directions are a future enhancement.

- **D2 — Route shape** → Per day: **Hotel → stops → Hotel**, each leg with `from`/`to`, `distanceKm`, `durationMin`, `mode`.

- **D3 — Transport mode** → Walk if the leg is ≤ 2 km, otherwise estimate driving.

- **E1 — Contract** → Response adds `hotels[]` (id, name_zh, star, price, rating, address, image, reason), `hotelFilters` (echo), and `days[].route` (legs).

- **E2 — Backward compatible** → `hotels`/`hotelFilters`/`route` are additive; existing fields unchanged.

- **E3 — i18n** → Localize hotel and route labels in `en` and `zh-CN`.

- **F1 — NFR** → Cache hotel search per city+filters (TTL); compute routes locally; keep p95 < 2000 ms.

## Round 2 — spec-review resolutions

- **B1 (star semantics)** → **Minimum level**: `star=N` means derived level `>= N` (UI "3★+ / 4★+ / 5★"). Aligned in spec scenario/AC9, design §4, and proposal.

- **Hotel upstream failure** → maps to `503 attraction_source_unavailable` with no partial plan (scenario + AC16).

- **`durationMin` rule** → `round(distanceKm / speed × 60)`, walk 5 km/h, drive 30 km/h; `mode = walk` when `distanceKm <= 2`, else `drive` (AC12).

- **Ranking determinism** → filter match → rating desc (missing last) → distance to the centroid of **all itinerary stops across the trip** asc → POI `id` asc (AC8).

- **Localization** → hotel/route labels + `no_hotel_data` localized in `en`/`zh-CN` with catalog parity (AC18).

- **Price bounds** → non-negative **integers**; non-integer, negative, or inverted (`priceMin > priceMax`) → `400 invalid_input` (AC4).

- **Route endpoints** → `from`/`to` hold POI `id`s (deterministic tests) (AC12).

- **Zero hotels / zero stops** → zero hotels = `200` + `no_hotel_data` + hotel-less routes (AC15); zero stops = empty route with zero totals (AC17).

- **Unknown star level** → excluded when a `star` filter is set (mirrors the unknown-cost exclusion).

## Open questions
<!-- must be empty before the spec is written -->
(none)

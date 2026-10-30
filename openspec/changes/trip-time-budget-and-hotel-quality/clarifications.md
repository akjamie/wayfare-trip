# Clarifications: trip-time-budget-and-hotel-quality

> Requirement: "在现有行程规划基础上改进: (1) 根据景点规模/类型估算游览时长,并按一天的时间预算(含景点间交通)安排每天行程,避免一天塞太多景点或把时间浪费在路上; (2) 酒店推荐只选择真实酒店(排除非酒店住宿POI),优先主流/知名连锁与高星级酒店,按知名度与评分排序,避免冷门或无关结果"

## Requirement
"在现有行程规划基础上改进: (1) 根据景点规模/类型估算游览时长,并按一天的时间预算(含景点间交通)安排每天行程,避免一天塞太多景点或把时间浪费在路上; (2) 酒店推荐只选择真实酒店(排除非酒店住宿POI),优先主流/知名连锁与高星级酒店,按知名度与评分排序,避免冷门或无关结果"

## Facts found during grilling
- **No free API provides attraction visit duration.** OpenTripMap (free key) exposes a popularity `rate` + Wikipedia text but no duration; Foursquare has tips/reviews but is paid. → duration must be a **system recommendation**.
- **`types=100000` is the generic 住宿服务 code** and returns non-hotels (e.g. a park). Real hotels are `100100` + subcodes `100101–100105`; hostels are `100200/100201`.
- **Amap direction API** (`/v3/direction/walking`, `/v3/direction/driving`) returns real `distance` (m) + `duration` (s) and can consider traffic; it draws on the larger 基础LBS quota.

## Settled decisions

- **Q1 — Visit-duration source** → **No free duration API exists.** Use a **system-recommended duration** (configurable heuristic by Amap typecode/category/scale) as the baseline; optionally enrich with **OpenTripMap popularity (`rate`)** when a free key is configured. Tourist comments are not a reliable duration source.

- **Q2 — Day time budget** → A configurable day window (**default 09:00–18:00**) filled with **visit time + travel time**; stops that do not fit are dropped; each day emits per-stop start/end times and a day total. Max 3 stops.

- **Q3 — Duration values** → system-recommended defaults by category (museum/indoor 90, park/garden 90, national/world-heritage scenic 180, provincial scenic 120, temple/church/viewpoint 45, default 90) — all configurable and optionally popularity-adjusted.

- **Q4 — Travel time** → **Not the haversine estimate** (that is straight-line). Use **Amap direction API** (walking for short legs, driving otherwise) for real `distance`/`duration`; fall back to haversine only if the direction call fails.

- **Q5 — Hotel POI source** → Query **`100100|100101|100102|100103|100104|100105`** (real hotels); **exclude** generic `100000` and hostels `100200|100201`.

- **Q6 — Hotel ranking** → **Amap relevance (prominence) first** → known-brand boost → rating desc → distance to itinerary centroid asc → POI id asc.

- **Q7 — Mainstream brands** → curated configurable list (Hilton/万豪/洲际/雅高/凯悦/香格里拉/喜来登/威斯汀/皇冠假日 + 华住/如家/汉庭/全季/亚朵/维也纳/锦江/桔子/7天…).

- **Q8 — Tracking** → new change `trip-time-budget-and-hotel-quality`; MODIFY `Trip itinerary`, ADD `Attraction visit duration`, `Time-budgeted daily plan`, `Real travel times`, `Hotel source and selection quality`.

## Open questions
<!-- must be empty before the spec is written -->
(none)

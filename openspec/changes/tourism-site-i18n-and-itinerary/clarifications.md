# Clarifications: tourism-site-i18n-and-itinerary

> Requirement: "基于现有 '城市景点+天气推荐' 功能改版: (1) 重做网页 UI,做成旅游网站风格,美观有吸引力; (2) 城市输入支持中文和拼音,并修正错误解析(例如 Xian 被解析成珠海、西安解析失败); (3) 网页支持中英文切换 (English/中文); (4) 输入城市后输出包含: 未来几天天气预报、景点推荐列表、每个景点的推荐理由、景点介绍、以及出游计划/行程安排"
> Settled via `batch-grill-me` Round 1 (all recommendations approved).

## Requirement
"基于现有 '城市景点+天气推荐' 功能改版: (1) 重做网页 UI,做成旅游网站风格,美观有吸引力; (2) 城市输入支持中文和拼音,并修正错误解析(例如 Xian 被解析成珠海、西安解析失败); (3) 网页支持中英文切换 (English/中文); (4) 输入城市后输出包含: 未来几天天气预报、景点推荐列表、每个景点的推荐理由、景点介绍、以及出游计划/行程安排"

## Context found during grilling
- v1 change `city-attractions-weather-recommendations` is implemented (impl PR #3 merged) and **archived**; living spec at `openspec/specs/attraction-weather-recommendations/spec.md`.
- **Root cause of the reported bug**: city resolution used **Open-Meteo geocoding**, which is wrong for Chinese — `西安` fails entirely and `Xian` fuzzy-matched **Zhuhai** (highest-population CN result) → 珠海长隆.
- **Amap geocode** (`/v3/geocode/geo`) resolves `西安`→西安市 (adcode 610100) and `Xi'an`→西安市, but bare `Xian` still returns 10 **village-level** matches — so a provider swap alone is insufficient; pinyin/alias handling + a level policy is required.

## Settled decisions

- **A1 — Base & relationship** → Merge impl PR #3 and `asdlc archive` the v1 change **first** (done), then this change **MODIFIES** the `attraction-weather-recommendations` capability.

- **B1 — City resolver** → Replace Open-Meteo geocoding with **Amap geocode** (`/v3/geocode/geo`), native for Chinese.

- **B2 — Pinyin/English support** → Primary: a **curated major-city alias table** (zh + pinyin + common English → adcode/coords, ~200 cities); fallback: Amap geocode for other Chinese input. (Deterministic; fixes `Xian`→西安.)

- **B3 — Ambiguity policy** → Use **city-level (`level` 省/市) matches only**; if more than one remains, return an `ambiguous_city` error **with the candidate list**; never return a village/POI-level guess.

- **C1 — Languages** → **en** + **zh-CN**; **default en**; toggle in the UI plus `?lang=` (and `Accept-Language`).

- **C2 — Localization scope** → Localize UI labels, advice, weather summaries, environment/category labels, and itinerary labels; **attraction proper names stay `name_zh`** (plus optional `name_en` when Amap provides one).

- **C3 — i18n mechanism** → Server-side message catalogs (one JSON dictionary per locale) keyed by message code; the client toggle re-requests.

- **D1 — UI approach** → Keep **vanilla static HTML/JS** but build a genuine tourism-style design (hero + search, weather strip, attraction cards, itinerary, language toggle); no framework.

- **D2 — Imagery** → Show **Amap POI photos** on attraction cards (with attribution).

- **D3 — Verifiable UI** → The spec pins concrete criteria (required sections, responsive at 360/768/1280, images with `alt`, no horizontal overflow, language toggle) so "good looking" is testable.

- **E1 — 推荐理由 (`reason`)** → Template-generated per attraction/day from weather + environment + category, localized.

- **E2 — 景点介绍 (`introduction`)** → **Attribute-based** from Amap data (category, environment, rating, address, photos), localized wrapper — **not** free-form generated prose (avoids hallucination).

- **E3 — 出游计划 (`itinerary`)** → Per-day plan with **time-of-day slots** (morning/afternoon/evening), 2–4 stops, ordering respects rain (indoor-first) + heat (avoid 11:00–15:00 outdoor), localized labels.

- **F1 — NFR** → Reuse the per-city TTL cache; keep mocked tests and extend the live smoke; i18n and itinerary must be test-mapped.

## Open questions
<!-- must be empty before the spec is written -->
(none)

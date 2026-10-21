# Proposal: Tourism-style site with Chinese/English i18n, richer output, and correct city resolution

## Why
The first release works but falls short as a product: the page does not look like a tourism site; Chinese and pinyin city input resolve incorrectly (`西安` fails, `Xian` returns Zhuhai/长隆); output is English-only; and a result is just a flat attraction list with no reasons, no descriptions, and no trip plan. Travelers need a presentable, bilingual page that actually plans a visit.

## What Changes
- **Correct city resolution + Chinese/pinyin input.** Replace Open-Meteo geocoding with **Amap geocode** (`/v3/geocode/geo`), backed by a **curated major-city alias table** (zh + pinyin + common English → adcode/coords). Accept only **city-level** matches; when several remain, return an `ambiguous_city` error with candidates (never a wrong/village guess).
- **Bilingual website (English / 中文).** Add `en` + `zh-CN`; **default `en`**; a UI language toggle plus `?lang=` (and `Accept-Language`). Localize UI labels, advice, weather summaries, category/environment labels, and itinerary labels; attraction proper names remain `name_zh` (with optional `name_en`).
- **Tourism-style UI.** Redesign the static frontend (hero + search, weather strip, attraction cards with **Amap photos**, itinerary, language toggle); responsive at 360/768/1280 with no horizontal overflow.
- **Richer, planned output.** Per day, return the weather forecast, a ranked attraction list, a **recommendation reason** (推荐理由) per attraction, an **introduction** (景点介绍) built from Amap attributes, and a **trip itinerary** (出游计划) with time-of-day slots that respect the rain (indoor-first) and heat (avoid 11:00–15:00 outdoor) rules.
- **BREAKING (contract):** the response schema gains `lang`, per-attraction `reason`/`introduction`/`image`, and per-day `itinerary`; the error taxonomy gains `ambiguous_city`. The v1 "English-only" behavior is removed (replaced by bilingual output).

## Capabilities
- **New Capabilities**: none.
- **Modified Capabilities**: `attraction-weather-recommendations` (existing path `openspec/specs/attraction-weather-recommendations/spec.md`) — modify the city-resolution and output-language requirements and add reason/introduction/itinerary/website requirements.

## Impact
- **Code**: `src/city.ts` (resolver swap + alias table), new `src/i18n.ts` + locale catalogs, `src/recommend.ts`/`src/rank.ts` (reason/introduction/itinerary), `src/amap.ts` (photos), `public/` (redesigned UI + lang toggle), HTTP contract (`lang`).
- **APIs/contract**: `GET /api/recommend?city=&days=&lang=`; response gains `lang`, `attractions[].reason/introduction/image`, `days[].itinerary`; new `ambiguous_city` error.
- **Data**: new bundled city alias table (zh/pinyin/English → adcode/coords).
- **Dependencies**: Amap geocode + `place/text` (key required, cached); Open-Meteo remains weather-only.
- **Systems**: unchanged upstreams (Amap Open Platform, Open-Meteo).

## Out of Scope
- Languages other than English and Simplified Chinese.
- Amap's paid multilingual POI search (`langCode=en`); attraction names may stay Chinese.
- LLM-generated free-form descriptions (introductions are attribute-based).
- Booking, ticketing, transportation, navigation, accounts, persistence, or a database.
- Native mobile apps; offline mode; a hosted production deployment.
- Guaranteed attraction coverage beyond Amap's POI types.

## Dependencies & Assumptions
- Assumes the Amap Web Service key covers **geocode** + `place/text` within the free personal quota, mitigated by per-city caching.
- Assumes the curated alias table covers the major cities users will type; other Chinese input falls back to Amap geocode.
- Assumes Amap `extensions=all` returns usable `photos`/`biz_ext` for most POIs; when absent, cards degrade to a placeholder.
- Assumes Open-Meteo continues to provide the forecast (`timezone=auto`); unchanged from v1.

## System Design refs
<!-- none for this change -->

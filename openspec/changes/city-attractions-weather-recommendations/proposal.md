# Proposal: City Attraction Recommendations with Weather-Aware Advice

## Why
Travelers picking a Chinese city need to know which attractions are worth visiting *and* how the upcoming weather should change those plans. Today there is no tool that answers both at once; weather apps show forecasts but no attraction guidance, and attraction lists ignore the forecast. We build a website that takes a Chinese city name and returns per-day attraction recommendations shaped by the forecast, with English as the default system output.

## What Changes
- **New website** (browser UI) backed by a Node.js (TypeScript) service; the recommendation logic is a pure, testable core module behind one JSON API. No CLI (the website is the product).
- **Attraction retrieval via the Amap (高德) Web Service API** — `place/text` keyword search constrained to scenic POIs (`types=110000`, 风景名胜). An Amap Web Service key is required. Because Amap exposes no indoor/outdoor flag, each attraction's `environment ∈ {indoor,outdoor,mixed}` is derived from its `typecode` through a configurable mapping. Amap responses are cached per city (TTL) to respect the ~100 search calls/day personal quota.
- **Weather via Open-Meteo** (free, no API key): hourly/daily `temperature_2m`, `precipitation_probability`, and WMO `weather_code`, with `timezone=auto` for city-local time.
- **Per-day recommendations** — `days[]`, one entry per forecast day (default 7), each carrying its weather summary, advice, and a ranked attraction list. Not a single merged ranking.
- **Ranking rules**: rainy days rank indoor (and mixed) attractions ahead of outdoor; hot days flag outdoor (and mixed) attractions to avoid 11:00–15:00 local. Within a tier, Amap relevance order is preserved, tie-broken by POI id, capped at top-N (default 10/day).
- **English default output** for all system/UI/advice/city text; Amap POI proper names are kept as `name_zh` (Chinese) with optional `name_en`, since Amap's English POI search is a paid multilingual service. Results are exposed as structured JSON plus an English summary.
- **Explicit degraded-success vs validation-error semantics** (see spec): forecast-unavailable and no-attraction-data are 200 responses with notices; unresolved/ambiguous city and invalid input are 400.

## Capabilities
- **New Capabilities**:
  - `attraction-weather-recommendations` (becomes `specs/attraction-weather-recommendations/spec.md`)
- **Modified Capabilities**: none (greenfield).

## Impact
- **Code**: new Node/TypeScript service (backend + JSON API) and a minimal static frontend; no existing application code to modify (repo is scaffold-only).
- **Dependencies**: Amap Web Service API (key required; free personal quota ~100 search calls/day); Open-Meteo (no key, free non-commercial tier).
- **APIs**: new `GET /api/recommend?city=<name>&days=<n>` JSON endpoint; the website consumes it.
- **Data**: an in-process per-city cache (TTL) for Amap lookups; a configurable typecode→environment mapping. No bundled attraction dataset.
- **Systems**: Amap Open Platform and Open-Meteo public APIs.

## Out of Scope
- Non-English (i18n) system output beyond the documented POI-name exception.
- Amap's paid multilingual POI search (`langCode=en`) — attraction proper names may remain Chinese.
- Booking, ticketing, transportation, navigation, accounts, persistence, or a database.
- Native mobile apps; only a responsive website.
- Push notifications, offline mode, or a hosted production deployment.
- Full China attraction coverage guarantees (coverage is whatever Amap returns for `types=110000`).

## Dependencies & Assumptions
- Assumes an Amap **Web Service API key** is provisioned (individual certification) and supplied via environment (`AMAP_KEY`); free-tier quota (~100 search calls/day personal) is sufficient for v1 traffic, mitigated by per-city caching.
- Assumes network access to the Amap and Open-Meteo public APIs; Open-Meteo requires no key (non-commercial free tier, attribution to Open-Meteo and GeoNames).
- Assumes Open-Meteo geocoding can resolve Chinese/pinyin/English city names and return `population`/`admin1` for disambiguation.
- Assumes the typecode→environment mapping is curated ahead of time (Amap does not supply indoor/outdoor); representative mapping examples are documented in the spec.
- Assumes thresholds have sensible defaults and are overridable via environment variables.

## System Design refs
<!-- none for this change -->

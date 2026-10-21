# Proposal: Redesigned search with optional hotel preferences, hotel recommendations, and daily routes

## Why
The current planner recommends attractions but ignores where travelers stay and how they move between stops. Users also find the top search box clumsy, and there is no way to bias the trip toward a star level or budget. Travelers need a cleaner search, a recommended hotel that respects their star/price preference, and a day-by-day route that connects the hotel and the attractions.

## What Changes
- **Redesigned search (top bar).** Clear labels, inline validation, loading state, responsive single-column on mobile, a "Clear" action, and an optional collapsible **Hotel preferences** group with **star** (any / 3★+ / 4★+ / 5★) and **price range** (min–max).
- **Hotel recommendations.** Retrieve hotels from Amap `place/text` (`types=100000`, `extensions=all`), filter by star (typecode) and price (`biz_ext.cost`) when provided, and recommend **3 hotels** (1 primary + 2 alternatives). Ranking: filter match → rating desc → distance to the trip's attraction centroid asc. The **primary** hotel is used for the whole trip.
- **Daily travel routes.** For each forecast day, produce a route **Hotel → stops → Hotel**, ordered by nearest-neighbor using haversine distance; each leg carries `from`, `to`, `distanceKm`, `durationMin`, and `mode` (walk ≤ 2 km, else drive). Routing is computed **offline** (no extra Amap quota).
- **Contract additions (additive):** response gains `hotels[]`, `hotelFilters` (echo), and `days[].route`; query gains optional `star`, `priceMin`, `priceMax`. Existing fields are unchanged.
- **i18n:** hotel and route labels are localized in `en` and `zh-CN`, consistent with the existing bilingual output.

## Capabilities
- **New Capabilities**: none.
- **Modified Capabilities**: `attraction-weather-recommendations` (existing path `openspec/specs/attraction-weather-recommendations/spec.md`) — extend the HTTP contract and the website; add hotel-recommendation and daily-route requirements.

## Impact
- **Code**: `src/amap.ts` (hotel search + star/cost), new `src/hotels.ts` (filter/rank), new `src/route.ts` (nearest-neighbor + haversine), `src/recommend.ts` (wire hotels/route/filters), `src/app.ts` (new query params + validation), `public/` (search redesign + hotel & route sections), `src/i18n.ts` (labels).
- **APIs/contract**: `GET /api/recommend?city=&days=&lang=&star=&priceMin=&priceMax=`; additive response fields; new `400 invalid_input` cases for bad filter values.
- **Data**: hotel POIs are cached per city+filters (TTL); routes are computed locally.
- **Dependencies**: unchanged (Amap Web Service + Open-Meteo).
- **Systems**: none new.

## Out of Scope
- Turn-by-turn navigation and real road routing via Amap directions (offline distance/time only in this change).
- Hotel booking, availability, room inventory, or live prices.
- Multi-hotel / per-night hotel switching (one primary hotel for the trip).
- Languages other than English and Simplified Chinese.
- Native mobile apps; offline mode; hosted production deployment.

## Dependencies & Assumptions
- Assumes the Amap key's search quota covers hotel lookups, mitigated by per-city+filters caching.
- Assumes Amap hotel POIs expose `biz_ext.cost`/`rating` and a star-derived `typecode` for most hotels; missing values degrade gracefully.
- Assumes haversine distance is an acceptable proxy for travel distance/time in this release.
- Assumes one hotel for the whole trip is acceptable for short city breaks.

## System Design refs
<!-- none for this change -->

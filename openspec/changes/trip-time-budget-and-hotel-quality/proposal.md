# Proposal: Realistic day plans (visit duration + time budget) and quality hotel recommendations

## Why
Current plans can cram three distant attractions into one day, so travelers waste hours in transit, and hotel recommendations surface obscure or even non-hotel POIs (the generic `住宿服务` code includes parks/other lodging). We need plans sized to how long attractions actually take (plus real travel time) and a hotel list built from real, mainstream hotels.

## What Changes
- **Attraction visit duration.** Each ranked attraction gets a `visitMinutes` from a configurable typecode/category mapping (default 90, range 30–480), optionally adjusted by a free popularity signal (OpenTripMap `rate`) when configured. No free API exposes duration, so this is an explicit system recommendation, not scraped truth.
- **Time-budgeted daily plan.** Each day is scheduled inside a configurable window (default 09:00–18:00): visit time + travel time; stops that do not fit are dropped (≤3 stops/day); every stop carries `startTime`/`endTime` and the day carries `totalMinutes`.
- **Real travel times.** Route legs use the Amap direction API (`/v3/direction/walking|driving`) for real `distance`/`duration`; haversine is only a fallback on failure. This replaces the straight-line estimate.
- **Hotel source & selection quality.** Query only real hotel typecodes (`100100|100101|100102|100103|100104|100105`), exclude generic `100000` and hostels (`100200|100201`); rank by Amap relevance → configurable mainstream-brand boost → rating desc → distance to itinerary centroid asc → id asc.
- **Additive contract:** itinerary stops gain `visitMinutes`/`startTime`/`endTime`; days gain `totalMinutes`; hotels gain source/brand metadata. Existing fields remain.

## Capabilities
- **New Capabilities**: none.
- **Modified Capabilities**: `attraction-weather-recommendations` (existing path `openspec/specs/attraction-weather-recommendations/spec.md`) — modify `Trip itinerary`; add visit duration, time-budgeted plan, real travel times, and hotel source/selection quality.

## Impact
- **Code**: `src/advice.ts`/new `src/duration.ts` (duration mapping), `src/itinerary.ts` (time budgeting), `src/route.ts` + `src/amap.ts` (direction API), `src/hotels.ts` (real-hotel filtering + brand ranking), `src/recommend.ts`, `src/config.ts`, `public/` (show per-stop times + hotel brand).
- **APIs/contract**: additive fields; Amap direction API calls (LBS quota); optional OpenTripMap key.
- **Dependencies**: Amap Web Service (search + direction); optional OpenTripMap (free key) for popularity.
- **Systems**: none new beyond the above.

## Out of Scope
- Buying/estimating ticket prices or queue times.
- Paid review/duration datasets; OpenTripMap popularity is an optional signal only.
- Multi-city trips, booking, live availability.
- Non-English output beyond the existing bilingual support.

## Dependencies & Assumptions
- Assumes no free API provides visit duration (verified); durations are a configurable system recommendation.
- Assumes the Amap direction API is available within LBS quota; failures fall back to haversine.
- Assumes real hotel typecodes are sufficient to exclude non-hotel POIs; a configurable brand list defines “mainstream”.
- Assumes a day window (09:00–18:00) is a reasonable default and is configurable.

## System Design refs
<!-- none for this change -->

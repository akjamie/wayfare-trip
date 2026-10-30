# Spec Delta

## Purpose
Make each day's plan realistic by estimating how long each attraction takes, budgeting the day (visits + real travel time) so stops are not crammed or wasted on long transfers, and improve hotel recommendations by selecting only real hotels and prioritising mainstream/known brands.

## MODIFIED Requirements

### Requirement: Trip itinerary
The system SHALL produce, for each forecast day, an itinerary of at most 3 attractions drawn from that day's ranked list, scheduled inside a configurable day window (default 09:00–18:00) whose budget covers each attraction's estimated visit duration plus the travel time between consecutive stops; each stop SHALL carry its slot, `visitMinutes`, `startTime`, and `endTime`, and the day SHALL carry `totalMinutes`. Stops that do not fit the remaining budget MUST be dropped (keeping at least one stop when one is available). Itineraries SHALL reuse the retained rain (indoor/mixed) and hot (no midday outdoor) rules and MUST be consistent with that day's advice. When a day's ranked list has fewer than 2 attractions, the itinerary SHALL contain the available stops without error.
_Story: trip-time-budget-and-hotel-quality_

#### Scenario: Itinerary per day
- **GIVEN** a resolved city with N forecast days
- **WHEN** the system emits recommendations
- **THEN** each day includes an `itinerary` of at most 3 stops (or all available when fewer), each with a slot, visit duration, and start/end times

#### Scenario: Weather-aware itinerary
- **GIVEN** a rainy day and a hot day
- **WHEN** the system builds each itinerary
- **THEN** every stop on the rainy day is indoor or mixed (unless indoor options are insufficient) and the hot day places no outdoor attraction in the midday slot

#### Scenario: Fewer attractions than slots
- **GIVEN** a day whose ranked list has a single attraction
- **WHEN** the system builds that day's itinerary
- **THEN** the itinerary contains that one stop and no error

#### Scenario: Day budget overflow
- **GIVEN** a day whose candidate stops would exceed the time budget
- **WHEN** the system schedules the day
- **THEN** it drops the stops that exceed the budget and the day's `totalMinutes` stays within the window

**Acceptance criteria**
- [ ] AC1: Each day's itinerary has at most 3 stops, each with `slot`, `visitMinutes`, `startTime`, `endTime`, and the day has `totalMinutes`. (test: test/itinerary.test.ts)
- [ ] AC2: Every stop on a rainy day is indoor/mixed (unless the limited-indoor notice applies) and a hot day's midday slot has no outdoor attraction. (test: test/itinerary.test.ts)
- [ ] AC3: A day with a single attraction yields a 1-stop itinerary without error. (test: test/itinerary.test.ts)
- [ ] AC4: When stops exceed the day budget, the surplus is dropped and `totalMinutes` stays within the window. (test: test/itinerary.test.ts)

## ADDED Requirements

### Requirement: Attraction visit duration
The system SHALL assign every ranked attraction a positive `visitMinutes` estimated from a configurable Amap typecode/category mapping (default 90 minutes) and optionally adjusted by a free popularity signal (OpenTripMap `rate`) when configured; unmapped categories SHALL fall back to the default, and all resulting durations MUST stay within 30–480 minutes.
_Story: trip-time-budget-and-hotel-quality_

#### Scenario: Mapped category duration
- **GIVEN** an attraction whose category/typecode is present in the configured duration mapping
- **WHEN** the system builds recommendations
- **THEN** the attraction carries the mapped `visitMinutes` within 30–480

#### Scenario: Unmapped category default
- **GIVEN** an attraction whose category is not in the mapping
- **WHEN** the system builds recommendations
- **THEN** the attraction uses the configured default duration (90 minutes)

**Acceptance criteria**
- [ ] AC5: Each ranked attraction carries `visitMinutes` within 30–480 from the type/category mapping, defaulting to 90 when unmapped. (test: test/itinerary.test.ts)
- [ ] AC6: The duration mapping is configurable (changing it changes the assigned durations). (test: test/itinerary.test.ts)

### Requirement: Time-budgeted daily plan
The system SHALL schedule each day's stops from the configured window start (default 09:00), adding each stop's visit duration plus the travel time from the previous stop; it SHALL emit per-stop `startTime`/`endTime` and a day `totalMinutes`, and SHALL drop stops that would exceed the window.
_Story: trip-time-budget-and-hotel-quality_

#### Scenario: Schedule within the window
- **GIVEN** a day with several candidate stops
- **WHEN** the system schedules the day
- **THEN** stops are scheduled in order with monotonic `startTime`/`endTime`, and the day's `totalMinutes` is within the configured window

#### Scenario: Configurable window changes capacity
- **GIVEN** an operator changes the day window (e.g. 10:00–16:00)
- **WHEN** the system schedules the day
- **THEN** the number/identity of stops that fit changes accordingly

**Acceptance criteria**
- [ ] AC7: Stop `startTime`/`endTime` are monotonic and consistent with visit + travel time, and `totalMinutes` ≤ the day window. (test: test/itinerary.test.ts)
- [ ] AC8: The day window is configurable and changing it changes which stops fit. (test: test/itinerary.test.ts)

### Requirement: Real travel times
The system SHALL obtain real leg `distance`/`duration` from the Amap direction API (walking for short legs, driving otherwise) and SHALL fall back to a haversine estimate only if the direction call fails, without erroring.
_Story: trip-time-budget-and-hotel-quality_

#### Scenario: Direction API provides leg times
- **GIVEN** a route with consecutive stops
- **WHEN** the system builds the route
- **THEN** each leg's distance/duration come from the Amap direction response (walking or driving)

#### Scenario: Direction API failure falls back
- **GIVEN** the Amap direction API fails or times out
- **WHEN** the system builds the route
- **THEN** it falls back to the haversine estimate and still returns a valid route

**Acceptance criteria**
- [ ] AC9: Route legs use the Amap direction `distance`/`duration` when available. (test: test/route.test.ts)
- [ ] AC10: On direction failure the route falls back to haversine and still returns without error. (test: test/route.test.ts)

### Requirement: Hotel source and selection quality
The system SHALL query only real hotel POIs (`types=100100|100101|100102|100103|100104|100105`), SHALL exclude the generic accommodation code (`100000`) and hostels (`100200|100201`), and SHALL rank hotels by Amap relevance first, then a configurable mainstream-brand boost, then rating descending, then distance to the trip's itinerary centroid ascending, then POI id ascending.
_Story: trip-time-budget-and-hotel-quality_

#### Scenario: Only real hotels
- **GIVEN** a city whose generic accommodation search returns non-hotel POIs
- **WHEN** the system retrieves hotels
- **THEN** only POIs with real hotel typecodes are returned; generic/hostel codes are excluded

#### Scenario: Mainstream hotels surface
- **GIVEN** several equally-rated hotels, some from a configured mainstream brand
- **WHEN** the system ranks them
- **THEN** the mainstream-brand hotel ranks ahead of the non-brand hotel (after Amap relevance)

#### Scenario: No qualifying hotels
- **GIVEN** a city with no real hotel POIs matching the filters
- **WHEN** the system builds the plan
- **THEN** it responds `200` with a localized notice and no fabricated hotels

**Acceptance criteria**
- [ ] AC11: The hotel query uses only real hotel typecodes and excludes generic `100000` and hostels `100200`/`100201`. (test: test/hotels.test.ts)
- [ ] AC12: Ranking is Amap relevance → mainstream-brand boost → rating desc → distance asc → id asc (deterministic). (test: test/hotels.test.ts)
- [ ] AC13: Zero qualifying hotels returns `200` with a localized notice. (test: test/hotels.test.ts)

## Constraints & NFRs
- Visit durations SHALL come from a configurable mapping (no fabricated precision); the default window is 09:00–18:00 and both are overridable via config.
- Travel times SHALL come from the Amap direction API when available (cached per leg); failures SHALL degrade to haversine without erroring.
- Hotel search SHALL use only real hotel typecodes and cache per city+filters (TTL) to respect the Amap search quota.
- The full plan (attractions + hotels + real routes) SHALL complete within p95 < 3000 ms warm (routing adds calls), with per-upstream timeouts.

## Out of Scope
- Buying/estimating real ticket prices or queue times.
- Paid review/duration datasets (OpenTripMap/Foursquare comments are optional signals only, not required).
- Multi-city trips, booking, or live hotel availability.
- Languages other than English and Simplified Chinese.

## Test Strategy
- **Unit tests** (vitest) cover duration mapping, day scheduling/budget overflow, direction-vs-haversine route legs, and hotel source/ranking — mapped to AC1–AC13.
- **Integration tests** run the endpoint with a mocked Amap direction + hotel transport, asserting per-stop times, `totalMinutes`, and hotel filtering.
- **Contract tests** assert the extended itinerary/hotel schema.
- **Web smoke test** confirms per-stop times and hotel cards render.

<!-- IMMUTABLE once approved (PR merged). Execution state belongs in tasks.md. -->

# Spec Delta

## Purpose
Extend the trip planner with a redesigned search that accepts optional hotel star/price preferences, hotel recommendations for the trip, and a day-by-day route that starts and ends at the recommended hotel while visiting that day's attractions.

## MODIFIED Requirements

### Requirement: HTTP interface contract and input validation
The system SHALL expose `GET /api/recommend?city=<name>&days=<n>` with optional `lang`, `star` (3, 4, or 5), and `priceMin`/`priceMax` parameters, returning a JSON payload with the documented schema; it SHALL validate input (rejecting empty, whitespace-only, or longer-than-64-character `city`, `days` outside 1–16, `star` not in {3, 4, 5}, and negative or inverted price bounds, with `400 invalid_input`) and SHALL return errors as `{ "error_code": ..., "message": ... }`.
_Story: hotel-route-search-redesign_

#### Scenario: Valid request returns the documented schema
- **GIVEN** a valid `GET /api/recommend?city=Beijing&days=7`
- **WHEN** the system handles the request
- **THEN** it responds `200` with a JSON body containing `city`, `days[]` (each with `date`, `weather`, `advice`, `attractions[]`, `itinerary`, `route`), `hotels[]`, `hotelFilters`, `summary`, and `notices[]`

#### Scenario: Invalid input is rejected
- **GIVEN** an empty or whitespace-only `city`, a `city` longer than 64 characters, or `days` outside 1–16
- **WHEN** the system handles the request
- **THEN** it responds `400` with `error_code = "invalid_input"` and a human-readable `message`

#### Scenario: Hotel filters are optional and echoed
- **GIVEN** a valid request with `star=4&priceMin=200&priceMax=800`
- **WHEN** the system handles the request
- **THEN** it responds `200`, `hotelFilters` echoes `{ star: 4, priceMin: 200, priceMax: 800 }`, and every returned hotel respects those bounds

#### Scenario: Invalid filter values are rejected
- **GIVEN** `star=6`, a negative `priceMin`, or `priceMin` greater than `priceMax`
- **WHEN** the system handles the request
- **THEN** it responds `400` with `error_code = "invalid_input"`

**Acceptance criteria**
- [ ] AC1: A valid request returns `200` with the documented schema including `hotels[]`, `hotelFilters`, and per-day `route`, with correct field types and the `environment` enum. (test: test/api-contract.test.ts)
- [ ] AC2: Empty/whitespace/overlong (`>64` chars) `city`, or `days` outside 1–16, returns `400 invalid_input` with body `{error_code, message}`. (test: test/api-contract.test.ts)
- [ ] AC3: Optional `star`/`priceMin`/`priceMax` are accepted and echoed in `hotelFilters`, and filter the returned hotels. (test: test/api-contract.test.ts)
- [ ] AC4: `star` not in {3,4,5}, a negative price, or `priceMin > priceMax` returns `400 invalid_input`. (test: test/api-contract.test.ts)

### Requirement: Tourism-style responsive website
The system SHALL serve a tourism-style page comprising a hero/search area (with optional hotel star/price preference controls), a language toggle, a weather forecast strip, attraction cards (each with an image and a short reason), a hotel recommendations section, the day-by-day itinerary, and per-day route sections; the page SHALL declare a responsive viewport, define responsive breakpoints, avoid horizontal overflow, give every image a non-empty `alt`, and display Amap photo attribution.
_Story: hotel-route-search-redesign_

#### Scenario: Required sections are present
- **GIVEN** the website is served
- **WHEN** the page is loaded
- **THEN** it contains the hero/search area (with hotel star/price preference controls), language toggle, weather strip, attraction cards, hotel recommendations, itinerary, and route sections

#### Scenario: Responsive and accessible markup
- **GIVEN** the served page
- **WHEN** its markup and styles are inspected
- **THEN** it declares a responsive viewport and breakpoints, and every image carries a non-empty `alt`

#### Scenario: Hotel and route sections render for a successful plan
- **GIVEN** a successful recommendation that includes hotels and routes
- **WHEN** the page renders the result
- **THEN** the hotel section shows the primary hotel and its alternatives, and each day displays its route

**Acceptance criteria**
- [ ] AC5: The served page contains the hero/search (with hotel preference controls), language toggle, weather strip, attraction cards, hotel section, itinerary, and route sections. (test: test/web-smoke.test.ts)
- [ ] AC6: The page declares a responsive viewport (`<meta name="viewport">`), its CSS defines breakpoints, and every image has a non-empty `alt`. (test: test/web-smoke.test.ts)
- [ ] AC7: The page displays Amap photo attribution. (test: test/web-smoke.test.ts)

## ADDED Requirements

### Requirement: Hotel recommendations
The system SHALL retrieve hotels for the resolved city from Amap `place/text` (`types=100000`, `extensions=all`), SHALL filter by the optional `star` level (derived from the typecode) and price range (`biz_ext.cost`), SHALL return up to three hotels (1 primary + 2 alternatives) ranked by filter match, then rating descending, then distance to the trip's attraction centroid ascending, and SHALL localize each hotel's name/description/star label with an `https` image or `null`.
_Story: hotel-route-search-redesign_

#### Scenario: Default hotel recommendations
- **GIVEN** a resolved city with hotel POIs and no star/price filters
- **WHEN** the system builds recommendations
- **THEN** it returns up to three hotels (one flagged primary) with name, star, price, rating, address, image, and a localized reason

#### Scenario: Star filter
- **GIVEN** `star=4`
- **WHEN** hotels are filtered
- **THEN** every returned hotel has a four-star typecode-derived level

#### Scenario: Price filter
- **GIVEN** `priceMin=200&priceMax=800`
- **WHEN** hotels are filtered
- **THEN** every returned hotel's `biz_ext.cost` is within the range; hotels with unknown cost are excluded when a bound is set

**Acceptance criteria**
- [ ] AC8: Up to three hotels are returned (exactly one `primary: true`) with `id`, `name_zh`, `star`, `price`, `rating`, `address`, `image` (`https` URL or `null`), and a localized `reason`. (test: test/hotels.test.ts)
- [ ] AC9: With `star` set, every returned hotel matches that star level (or an empty list with a notice). (test: test/hotels.test.ts)
- [ ] AC10: With price bounds set, every returned hotel's price is within `[priceMin, priceMax]`, and hotels with unknown cost are excluded. (test: test/hotels.test.ts)

### Requirement: Daily travel route with hotel
The system SHALL produce, for each forecast day, a route that starts at the primary recommended hotel, visits that day's itinerary stops in nearest-neighbor order, and returns to the hotel; each leg SHALL carry `from`, `to`, `distanceKm`, `durationMin`, and `mode` (walk when the leg is ≤ 2 km, otherwise drive), computed offline without external routing calls. When no hotel is available, the route SHALL still list the day's stops without hotel endpoints and without error.
_Story: hotel-route-search-redesign_

#### Scenario: Route starts and ends at the hotel
- **GIVEN** a successful plan with a primary hotel and a day itinerary
- **WHEN** the system builds that day's route
- **THEN** the route starts at the primary hotel, visits the day's stops, and ends back at the hotel

#### Scenario: Legs carry distance, time, and mode
- **GIVEN** a route with one or more legs
- **WHEN** the route is emitted
- **THEN** each leg has `from`, `to`, `distanceKm`, `durationMin`, and a `mode` of `walk` (≤ 2 km) or `drive`

#### Scenario: Nearest-neighbor ordering
- **GIVEN** several stops with coordinates
- **WHEN** the route is ordered
- **THEN** stops are visited in deterministic nearest-neighbor order from the hotel

#### Scenario: No hotel available
- **GIVEN** a day whose hotel recommendation is unavailable
- **WHEN** the system builds the route
- **THEN** the route lists the day's stops without hotel endpoints and the response is still valid

**Acceptance criteria**
- [ ] AC11: Each day's `route` starts at the primary hotel and ends at the hotel, covering that day's itinerary stops. (test: test/route.test.ts)
- [ ] AC12: Every leg carries `from`, `to`, `distanceKm`, `durationMin`, and `mode`, with `mode = walk` when `distanceKm <= 2` and `drive` otherwise. (test: test/route.test.ts)
- [ ] AC13: Stops are ordered by deterministic nearest-neighbor from the hotel (repeatable across runs). (test: test/route.test.ts)
- [ ] AC14: When no hotel is available, the route lists the stops without hotel endpoints and does not error. (test: test/route.test.ts)

## Constraints & NFRs
- Hotel search SHALL be cached per city+filters (TTL) so the Amap search quota is respected; routes SHALL be computed locally (no Amap direction calls).
- Hotel star SHALL be derived from the Amap typecode and price from `biz_ext.cost`; missing values SHALL degrade gracefully (never fabricate a star or price).
- The full plan (attractions + hotels + routes) SHALL still complete within p95 < 2000 ms warm, with the existing 3000 ms upstream timeout.
- The `en` and `zh-CN` catalogs SHALL define the same hotel/route keys (no missing-key placeholder).

## Out of Scope
- Turn-by-turn navigation and real road routing (offline distance/time only in this change).
- Hotel booking, availability, room inventory, or live prices.
- Multi-hotel / per-night hotel switching (one primary hotel per trip).
- Languages other than English and Simplified Chinese.
- Native mobile apps; offline mode; hosted production deployment.

## Test Strategy
- **Unit tests** (vitest) cover hotel filtering/ranking (star/price/edge cases), the nearest-neighbor route + haversine + mode, and filter validation — mapped 1:1 to AC1–AC14.
- **Integration tests** run the HTTP endpoint against a mocked Amap + Open-Meteo transport with and without hotel filters, asserting `hotelFilters`, `hotels[]`, and `days[].route`.
- **Contract tests** assert the extended schema and the new `400 invalid_input` paths.
- **Web smoke test** asserts the hotel preference controls, hotel section, and route sections are present.
- **No live routing calls** — routes are local and deterministic.

<!-- IMMUTABLE once approved (PR merged). Execution state belongs in tasks.md. -->

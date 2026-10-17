# Spec Delta

## Purpose
Provide a website that takes a Chinese city name and returns per-day attraction recommendations shaped by the upcoming weather forecast, ranking indoor attractions first when precipitation is expected and flagging outdoor attractions to avoid the midday window when it is hot, with all system output in English by default.

## ADDED Requirements

### Requirement: City resolution and disambiguation
The system SHALL resolve a user-supplied city name written in Chinese, pinyin, or English to a single canonical city constrained to China, returning its coordinates, an English display name, and its first-level administrative area; when several same-named cities match, the system MUST select the candidate with the highest population.
_Story: city-attractions-weather-recommendations_

#### Scenario: Resolve a Chinese city name
- **GIVEN** a user supplies the city name "北京"
- **WHEN** the system resolves the city
- **THEN** the system returns the resolved city as Beijing with latitude/longitude, an English display name, and `admin1`, with `country = CN`

#### Scenario: Resolve a pinyin or English city name
- **GIVEN** a user supplies the city name "beijing" or "Beijing"
- **WHEN** the system resolves the city
- **THEN** the system returns the same resolved city as it would for "北京"

#### Scenario: Disambiguate same-named cities
- **GIVEN** a name matches multiple Chinese cities (e.g. 台州 / 泰州)
- **WHEN** the system resolves the city
- **THEN** the system selects the candidate with the highest population and exposes the resolved English name and `admin1`

#### Scenario: Unresolvable or non-China city
- **GIVEN** a user supplies an unresolvable name (e.g. "asdfghjkl") or a non-China city (e.g. "Paris")
- **WHEN** the system attempts to resolve the city
- **THEN** the system returns a distinct `unknown_city` error and produces no recommendations

**Acceptance criteria**
- [ ] AC1: "北京", "beijing", and "Beijing" all resolve to the same location with non-empty latitude/longitude and `country = CN`. (test: test/city-resolve.test.ts)
- [ ] AC2: When a name matches multiple Chinese cities, the highest-population candidate is chosen and the result includes an English name and `admin1`. (test: test/city-resolve.test.ts)
- [ ] AC3: An unresolvable name returns an `unknown_city` error and no recommendation payload. (test: test/city-resolve.test.ts)
- [ ] AC4: A non-China city (e.g. "Paris") returns `unknown_city` because resolution is constrained to `country = CN`. (test: test/city-resolve.test.ts)

### Requirement: Amap attraction retrieval and environment classification
The system SHALL retrieve scenic attractions for the resolved city from the Amap Web Service `place/text` API constrained to scenic POIs (`types=110000`), annotate every attraction with an `environment` of `indoor`, `outdoor`, or `mixed` derived from its Amap `typecode` via a configurable mapping, and cache per-city results with a TTL to limit Amap calls.
_Story: city-attractions-weather-recommendations_

#### Scenario: Retrieve attractions for a major city
- **GIVEN** a resolved city whose Amap scenic search returns results
- **WHEN** the system generates recommendations
- **THEN** the system returns at least one attraction, each carrying a POI `id`, `name_zh`, coordinates, and an environment of `indoor`, `outdoor`, or `mixed`

#### Scenario: Classify environment from typecode
- **GIVEN** an Amap POI with a `typecode` present in the configured mapping (e.g. an aquarium → indoor, a park → outdoor)
- **WHEN** the system classifies the attraction
- **THEN** the attraction's environment equals the mapped value, and falls back to `mixed` when the typecode is unmapped

#### Scenario: Cache avoids repeated Amap calls
- **GIVEN** the system has already retrieved attractions for a city within the cache TTL
- **WHEN** the same city is requested again before the TTL expires
- **THEN** the system serves the cached attractions and does not issue a second Amap search call

**Acceptance criteria**
- [ ] AC5: For a major city with Amap results, the response contains one or more attractions, each with `id`, `name_zh`, coordinates, and environment in `{indoor,outdoor,mixed}`. (test: test/amap-client.test.ts)
- [ ] AC6: Environment is derived from `typecode` via the configured mapping, defaulting to `mixed` for unmapped codes. (test: test/amap-client.test.ts)
- [ ] AC7: A second request for the same city within the cache TTL is served from cache without an additional Amap call. (test: test/amap-client.test.ts)

### Requirement: Weather-aware per-day recommendation
The system SHALL produce one recommendation entry per forecast day (default 7, configurable), where each entry contains the day's date, an English weather summary, the day's advice, and a ranked attraction list, using the city's local timezone.
_Story: city-attractions-weather-recommendations_

#### Scenario: Per-day output for the forecast horizon
- **GIVEN** a resolved city with a forecast of N days (default 7)
- **WHEN** the system emits recommendations
- **THEN** the response contains exactly N day entries, each with date, weather summary, advice, and a ranked attraction list

#### Scenario: Independent per-day advice
- **GIVEN** a forecast week with rain forecast on one day and heat on another
- **WHEN** the system emits recommendations
- **THEN** the rainy day shows indoor-first ordering and the hot day shows the midday advisory, independently of each other

#### Scenario: City-local time
- **GIVEN** a city in a non-UTC timezone
- **WHEN** the system evaluates the midday window
- **THEN** the 11:00–15:00 window is interpreted in the city's local time (Open-Meteo `timezone=auto`)

**Acceptance criteria**
- [ ] AC8: `days` contains one entry per forecast day (default 7, configurable), each with `date`, `weather`, `advice`, and `attractions[]`. (test: test/recommendation.test.ts)
- [ ] AC9: A week with rain on day A and heat on day B yields indoor-first ordering on day A and a midday advisory on day B, independently. (test: test/recommendation.test.ts)
- [ ] AC10: Hourly/day boundaries used for the midday window follow the city's local timezone. (test: test/recommendation.test.ts)

### Requirement: Indoor-first when there is precipitation
The system SHALL classify a forecast day as rainy when its precipitation probability meets the configured threshold or its WMO weather code is in the configured rain set, and on such days SHALL rank indoor and mixed attractions ahead of outdoor attractions and advise preferring indoor attractions.
_Story: city-attractions-weather-recommendations_

#### Scenario: Rain forecast prefers indoor attractions
- **GIVEN** a forecast day classified as rainy
- **WHEN** the system ranks attractions for that day
- **THEN** indoor and mixed attractions are ordered ahead of outdoor-only attractions and the advice recommends indoor attractions

#### Scenario: Rain classification thresholds
- **GIVEN** a forecast day with precipitation probability at or above the configured threshold (default 50%) or a WMO weather code in the configured rain set (default 51–67, 80–82, 95–99)
- **WHEN** the system classifies the day
- **THEN** the day is classified as rainy

#### Scenario: Snow counts as precipitation
- **GIVEN** a forecast day with a WMO snow code (default 71–77, 85–86)
- **WHEN** the system classifies the day
- **THEN** the day is classified as rainy for indoor-first purposes

**Acceptance criteria**
- [ ] AC11: On a rainy day, every indoor and mixed attraction precedes every outdoor attraction in the ranking. (test: test/weather-advice.test.ts)
- [ ] AC12: Rain classification is true when precipitation probability >= 50% (default) or the WMO code is in the rain set (51–67, 80–82, 95–99). (test: test/weather-advice.test.ts)
- [ ] AC13: WMO snow codes (71–77, 85–86) classify the day as rainy for indoor-first ranking. (test: test/weather-advice.test.ts)

### Requirement: Avoid midday outdoor when hot
The system SHALL flag outdoor and mixed attractions as unsuitable for the 11:00–15:00 local window on any forecast day whose maximum temperature reaches the high-temperature threshold (default 33°C), and SHALL advise avoiding midday outdoor visits; the threshold and window MUST be overridable via configuration.
_Story: city-attractions-weather-recommendations_

#### Scenario: Hot day flags midday outdoor visits
- **GIVEN** a forecast day whose maximum temperature is at or above the high-temperature threshold
- **WHEN** the system produces advice for that day
- **THEN** outdoor and mixed attractions carry an "avoid 11:00–15:00" advisory and the advice recommends avoiding midday outdoor visits

#### Scenario: Non-hot day carries no midday advisory
- **GIVEN** a forecast day whose maximum temperature is below the high-temperature threshold
- **WHEN** the system produces advice for that day
- **THEN** no "avoid 11:00–15:00" advisory is attached to any attraction

#### Scenario: Configurable thresholds
- **GIVEN** an operator overrides the high-temperature threshold or the noon window via configuration
- **WHEN** the system produces advice
- **THEN** the advisories trigger according to the overridden values

**Acceptance criteria**
- [ ] AC14: Given max temperature >= 33°C, outdoor and mixed attractions are flagged with an 11:00–15:00 avoidance advisory. (test: test/weather-advice.test.ts)
- [ ] AC15: Given max temperature < 33°C, no 11:00–15:00 advisory is produced. (test: test/weather-advice.test.ts)
- [ ] AC16: The high-temperature threshold and noon window are overridable via env and change where advisories trigger. (test: test/weather-advice.test.ts)

### Requirement: Deterministic ranking and top-N
The system SHALL rank attractions within each tier preserving Amap relevance order, MUST break ties deterministically by POI `id` ascending, and SHALL cap each day's ranked list at a configurable top-N (default 10).
_Story: city-attractions-weather-recommendations_

#### Scenario: Stable ordering
- **GIVEN** two attractions in the same tier with equal Amap relevance
- **WHEN** the system ranks them
- **THEN** they are ordered by POI `id` ascending, producing identical output across repeated runs

#### Scenario: Top-N cap
- **GIVEN** more candidate attractions than the configured top-N (default 10)
- **WHEN** the system ranks attractions for a day
- **THEN** the returned list contains at most top-N attractions

**Acceptance criteria**
- [ ] AC17: Within a tier, ordering preserves Amap relevance order and breaks ties by POI `id` ascending; repeated runs are byte-identical. (test: test/ranking.test.ts)
- [ ] AC18: Each day's ranked list is capped at top-N (default 10, configurable). (test: test/ranking.test.ts)

### Requirement: English default website output
The system SHALL serve a website whose UI text, advice, weather summaries, and city output are in English, and SHALL emit a structured JSON payload plus an English human-readable summary; Amap POI proper names SHALL be provided as `name_zh` with an optional `name_en`.
_Story: city-attractions-weather-recommendations_

#### Scenario: English system output
- **GIVEN** a successful recommendation
- **WHEN** the system formats the result
- **THEN** all UI, advice, weather-summary, and city strings are English, and the response contains both a JSON payload and a non-empty English summary

#### Scenario: POI names keep their source language
- **GIVEN** an Amap attraction whose only available name is Chinese
- **WHEN** the system returns the attraction
- **THEN** the attraction includes a non-empty `name_zh` and `name_en` may be absent

**Acceptance criteria**
- [ ] AC19: All UI/advice/weather/city strings in the default response are English, and the response carries both a JSON payload and a non-empty English summary. (test: test/web-output.test.ts)
- [ ] AC20: An attraction with only a Chinese name returns a non-empty `name_zh` and no error when `name_en` is absent. (test: test/web-output.test.ts)

### Requirement: HTTP interface contract and input validation
The system SHALL expose `GET /api/recommend?city=<name>&days=<n>` returning a JSON payload with the documented schema, SHALL validate input (rejecting empty, whitespace-only, or out-of-range input with a `400 invalid_input` response), and SHALL return errors as a body of `{ "error_code": ..., "message": ... }`.
_Story: city-attractions-weather-recommendations_

#### Scenario: Valid request returns the documented schema
- **GIVEN** a valid `GET /api/recommend?city=Beijing&days=7`
- **WHEN** the system handles the request
- **THEN** it responds `200` with a JSON body containing `city`, `days[]` (each with `date`, `weather`, `advice`, `attractions[]`), and `summary`

#### Scenario: Invalid input is rejected
- **GIVEN** an empty or whitespace-only `city`, or a `days` value outside the allowed range
- **WHEN** the system handles the request
- **THEN** it responds `400` with `error_code = "invalid_input"` and a human-readable English `message`

**Acceptance criteria**
- [ ] AC21: A valid request returns `200` with the documented JSON schema (`city`, `days[]`, `summary`) and correct field types and the `environment` enum. (test: test/api-contract.test.ts)
- [ ] AC22: Empty/whitespace `city` or an out-of-range `days` returns `400` with `error_code = "invalid_input"` and body shape `{error_code, message}`. (test: test/api-contract.test.ts)

### Requirement: Graceful degradation and error taxonomy
The system SHALL treat an unavailable forecast as a degraded success (HTTP 200 with a `forecast_unavailable` notice and indoor-first ranking) and a city without attraction data as a degraded success (HTTP 200 with a `no_attraction_data` notice and no fabricated attractions), and SHALL return client errors for unresolved or ambiguous cities and invalid input.
_Story: city-attractions-weather-recommendations_

#### Scenario: Forecast unavailable falls back to indoor
- **GIVEN** a city resolves but the weather forecast cannot be retrieved
- **WHEN** the system generates recommendations
- **THEN** it responds `200` with a `forecast_unavailable` notice, still returns attractions, and ranks indoor attractions first

#### Scenario: City without attraction data
- **GIVEN** a city resolves but Amap returns no scenic attractions
- **WHEN** the system generates recommendations
- **THEN** it responds `200` with a `no_attraction_data` notice and zero fabricated attractions

#### Scenario: Error taxonomy
- **GIVEN** an unresolved/ambiguous city or invalid input
- **WHEN** the system handles the request
- **THEN** it returns `400` with the matching `error_code` (`unknown_city` or `invalid_input`), while forecast-unavailable and no-attraction-data remain `200` notices

**Acceptance criteria**
- [ ] AC23: When the forecast is unavailable, the response is `200` with a `forecast_unavailable` notice and indoor attractions ranked first. (test: test/degradation.test.ts)
- [ ] AC24: When no attractions are found, the response is `200` with a `no_attraction_data` notice and an empty attractions list. (test: test/degradation.test.ts)
- [ ] AC25: Unresolved/ambiguous city returns `400 unknown_city`, and the taxonomy distinguishes validation errors (`400`) from degraded successes (`200`). (test: test/degradation.test.ts)

## Constraints & NFRs
- Recommendation generation for a single city SHALL complete within p95 < 2000 ms (warm cache) when the upstream APIs are healthy, with a per-upstream HTTP timeout budget of 3000 ms.
- No API keys SHALL be exposed to the browser; the Amap key SHALL be read from the server environment (`AMAP_KEY`) and used only server-side.
- Per-city Amap responses SHALL be cached with a configurable TTL (default 24h) so that expected v1 traffic stays within the Amap free personal quota (~100 search calls/day); the cache SHALL be safe for concurrent requests.
- Logs SHALL NOT contain the Amap key or user-supplied city strings beyond what is necessary, and SHALL be free of PII.
- The website SHALL be responsive and usable on mobile widths down to 360 px.

## Out of Scope
- Non-English system output (English only) beyond the documented POI-name exception.
- Amap's paid multilingual POI search (`langCode=en`); attraction proper names may remain Chinese.
- Booking, ticketing, transportation, navigation, accounts, persistence, or a database.
- Native mobile apps; offline mode; a hosted production deployment.
- Guaranteed full-China attraction coverage beyond what Amap `types=110000` returns.

## Test Strategy
- **Unit tests** (vitest) cover city resolution/disambiguation, typecode→environment mapping, rain/high-temperature classification, per-day assembly, deterministic ranking/top-N, output language, and the error taxonomy — each mapped 1:1 to the ACs above (`test/*.test.ts`).
- **Integration tests** run the HTTP endpoint against a mocked Amap + Open-Meteo transport (including cache-hit assertions) to verify the end-to-end per-day recommendation path without live network calls.
- **Contract tests** assert the `/api/recommend` JSON schema (fields, types, `environment` enum) and the `{error_code, message}` error body.
- **Web smoke test** verifies the served page loads and calls the JSON API.
- No manual UI testing is required beyond the smoke test.

<!-- IMMUTABLE once approved (PR merged). Execution state belongs in tasks.md. -->

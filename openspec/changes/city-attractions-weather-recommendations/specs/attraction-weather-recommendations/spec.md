# Spec Delta

## Purpose
Recommend attractions for a user-supplied Chinese city and rank them against an upcoming weather forecast, prioritizing indoor attractions when it rains and steering clear of midday outdoor attractions when it is very hot, with all output in English by default.

## ADDED Requirements

### Requirement: City resolution
The system SHALL resolve a user-supplied city name written in Chinese, pinyin, or English to a canonical city location (coordinates + resolved display name) before any recommendation is produced.
_Story: city-attractions-weather-recommendations_

#### Scenario: Resolve a Chinese city name
- **GIVEN** a user supplies the city name "北京"
- **WHEN** the system resolves the city
- **THEN** the system returns the resolved city as Beijing with its latitude/longitude coordinates and an English display name

#### Scenario: Resolve a pinyin or English city name
- **GIVEN** a user supplies the city name "beijing" or "Beijing"
- **WHEN** the system resolves the city
- **THEN** the system returns the same resolved city (Beijing) as it would for "北京"

#### Scenario: Unknown or ambiguous city
- **GIVEN** a user supplies a city name that cannot be resolved
- **WHEN** the system attempts to resolve the city
- **THEN** the system returns a distinct English error and produces no recommendations

**Acceptance criteria**
- [ ] AC1: Supplying "北京", "beijing", and "Beijing" all resolve to the same location with non-empty latitude and longitude. (test: test/city-resolve.test.ts)
- [ ] AC2: Supplying an unresolvable name (e.g. "asdfghjkl") returns a resolvable error and no recommendation payload. (test: test/city-resolve.test.ts)

### Requirement: Weather-aware attraction recommendation
The system SHALL return a ranked list of attractions for the resolved city, each attraction annotated with its environment (indoor, outdoor, or mixed), derived from the curated dataset.
_Story: city-attractions-weather-recommendations_

#### Scenario: Recommend attractions for a known city
- **GIVEN** a resolved city exists in the curated attraction dataset
- **WHEN** the system generates recommendations
- **THEN** the system returns at least one attraction, each carrying a name and an `indoor`, `outdoor`, or `mixed` environment tag

#### Scenario: City without local attraction data
- **GIVEN** a resolved city is not present in the curated attraction dataset
- **WHEN** the system generates recommendations
- **THEN** the system returns a distinct English message stating no local attraction data is available yet, and no fabricated attractions

**Acceptance criteria**
- [ ] AC3: For a seeded city, the response contains one or more attractions and every attraction has an environment of `indoor`, `outdoor`, or `mixed`. (test: test/recommendation.test.ts)
- [ ] AC4: For an unseeded city, the response contains no attraction entries and includes the no-data message. (test: test/recommendation.test.ts)

### Requirement: Indoor-first when raining
The system SHALL rank indoor and mixed attractions ahead of outdoor attractions on any forecast day that is classified as rainy.
_Story: city-attractions-weather-recommendations_

#### Scenario: Rain forecast prefers indoor attractions
- **GIVEN** the forecast for a future day is classified as rainy (precipitation probability meets the configured threshold, or the weather code is in the rain set)
- **WHEN** the system ranks attractions for that day
- **THEN** indoor and mixed attractions are ordered ahead of outdoor-only attractions, and the output advises preferring indoor attractions

**Acceptance criteria**
- [ ] AC5: Given a rainy day, the recommendation ordering places every indoor and mixed attraction before every outdoor attraction. (test: test/weather-advice.test.ts)
- [ ] AC6: Rain classification is true when precipitation probability >= 50% (default) OR the weather code is in the configured rain set. (test: test/weather-advice.test.ts)

### Requirement: Avoid midday outdoor when hot
The system SHALL flag outdoor attractions as unsuitable for the 11:00–15:00 window on any forecast day whose maximum temperature reaches the high-temperature threshold, and SHALL advise avoiding midday outdoor visits.
_Story: city-attractions-weather-recommendations_

#### Scenario: Hot day flags midday outdoor visits
- **GIVEN** a future day's maximum temperature is at or above the high-temperature threshold (default 33°C)
- **WHEN** the system produces advice for that day
- **THEN** outdoor attractions carry an "avoid 11:00–15:00" advisory and the output recommends avoiding midday outdoor attractions

#### Scenario: Non-hot day carries no midday advisory
- **GIVEN** a future day's maximum temperature is below the high-temperature threshold
- **WHEN** the system produces advice for that day
- **THEN** no midday "avoid 11:00–15:00" advisory is attached to outdoor attractions

**Acceptance criteria**
- [ ] AC7: Given a max temperature >= 33°C, outdoor attractions are flagged with an 11:00–15:00 avoidance advisory. (test: test/weather-advice.test.ts)
- [ ] AC8: Given a max temperature < 33°C, no 11:00–15:00 advisory is produced for outdoor attractions. (test: test/weather-advice.test.ts)
- [ ] AC9: The high-temperature and noon-window values are overridable via configuration (flag or env), changing where the advisories trigger. (test: test/weather-advice.test.ts)

### Requirement: English default output
The system SHALL emit its recommendation result as structured JSON accompanied by an English human-readable summary, and SHALL use English for all user-facing text by default.
_Story: city-attractions-weather-recommendations_

#### Scenario: English output is returned
- **GIVEN** a successful recommendation
- **WHEN** the system formats the result
- **THEN** the result contains a machine-readable JSON payload and an English summary, with no user-facing text defaulting to another language

**Acceptance criteria**
- [ ] AC10: A successful response contains both a structured JSON payload and a non-empty English summary field. (test: test/output.test.ts)
- [ ] AC11: All user-facing recommendation strings in the default output are English. (test: test/output.test.ts)

### Requirement: Graceful failure handling
The system SHALL return distinct English errors (with a non-zero CLI exit code or an HTTP 4xx status) for unknown/ambiguous cities, unavailable forecasts, and missing attraction data, and SHALL default to recommending indoor attractions when a forecast cannot be retrieved.
_Story: city-attractions-weather-recommendations_

#### Scenario: Forecast unavailable falls back to indoor
- **GIVEN** a city resolves successfully but the weather forecast cannot be retrieved
- **WHEN** the system generates recommendations
- **THEN** the system still returns attractions and defaults to ranking indoor attractions first, with a notice that the forecast is unavailable

**Acceptance criteria**
- [ ] AC12: When the forecast is unavailable, indoor attractions are ranked first and a forecast-unavailable notice is included. (test: test/errors.test.ts)
- [ ] AC13: The CLI returns a non-zero exit code and the HTTP endpoint returns a 4xx status for unresolved-city, no-forecast, and no-attraction failure cases, each with a distinct message. (test: test/errors.test.ts)

## Constraints & NFRs
- Recommendation generation for a single city SHALL complete in under 2 seconds (weather fetch included) when the upstream weather API is healthy.
- No API keys or secrets SHALL be required or stored for the weather data source in v1.
- The service SHALL work offline for attraction ranking when only the bundled dataset is needed (no live network beyond weather/geocoding).
- No user-supplied data SHALL be logged persisently; logs SHALL be free of PII.

## Out of Scope
- Non-English (i18n) output.
- Attractions beyond the curated seed city dataset.
- Booking, ticketing, transportation, navigation, accounts, caching, or persistence.
- Amap/高德 live POI integration.

## Test Strategy
- **Unit tests** (Node test runner / vitest) cover city resolution, rain classification, high-temperature advisory logic, indoor-first ranking, output formatting, and error/fallback behavior, each mapped 1:1 to the ACs above (`test/*.test.ts`).
- **Integration tests** exercise a mocked forecast/geocoding transport to verify the end-to-end ranking path without hitting the live network.
- **Contract tests** assert the response JSON shape (fields, types, environment enum) matches the documented schema.
- No manual UI testing is required (CLI + JSON API only).
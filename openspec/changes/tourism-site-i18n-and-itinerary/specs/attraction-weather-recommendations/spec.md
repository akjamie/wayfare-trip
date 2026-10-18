# Spec Delta

## Purpose
Deliver a tourism-style, bilingual (English / 中文) website that resolves a Chinese city correctly from Chinese or pinyin input and returns a planned visit: a multi-day weather forecast, a ranked attraction list with photos, a reason and an introduction per attraction, and a day-by-day itinerary that prefers indoor attractions when it rains and avoids midday outdoor visits when it is hot.

## MODIFIED Requirements

### Requirement: City resolution and disambiguation
The system SHALL resolve a user-supplied city name written in Chinese, pinyin, or English to a single canonical city constrained to China, returning its coordinates, a display name, and its first-level administrative area. Resolution SHALL use a curated major-city alias table (Chinese + pinyin + common English) first and Amap geocoding (`/v3/geocode/geo`) as a fallback. It SHALL accept only Amap matches at **city level** (`level` = 市); village/district/POI-level matches MUST be rejected, so bare pinyin of a non-listed city yields `ambiguous_city` or `unknown_city` and never a village guess. The alias table SHALL also map province names to their capital city (e.g. 广东 → 广州), and a province-only input SHALL resolve to that capital. When several city-level candidates remain, the system MUST return an `ambiguous_city` error whose candidates expose `name`, `name_zh`, and `adcode`, rather than guessing. An Amap geocode failure (network error or a non-success Amap `status`) MUST map to `attraction_source_unavailable` (503), NOT `unknown_city`; a successful geocode with no city-level match MUST be `unknown_city`.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: Resolve a Chinese city name
- **GIVEN** a user supplies the city name "西安"
- **WHEN** the system resolves the city
- **THEN** the system returns Xi'an with latitude/longitude and `admin1` = Shaanxi, with `country = CN`

#### Scenario: Resolve a pinyin or English city name
- **GIVEN** a user supplies "Xian", "Xi'an", "beijing", or "Beijing"
- **WHEN** the system resolves the city
- **THEN** the system returns the same resolved city as the equivalent Chinese input (Xi'an / Beijing)

#### Scenario: Disambiguate same-named cities
- **GIVEN** a name matches several city-level Chinese candidates
- **WHEN** the system resolves the city
- **THEN** the system returns an `ambiguous_city` error listing the candidates and produces no recommendations, rather than guessing

#### Scenario: Unresolvable or non-China city
- **GIVEN** a user supplies an unresolvable name (e.g. "asdfghjkl") or a non-China city (e.g. "Paris")
- **WHEN** the system attempts to resolve the city
- **THEN** the system returns a distinct `unknown_city` error and produces no recommendations

#### Scenario: Province-level input resolves to its capital
- **GIVEN** a user supplies a province name such as "广东"
- **WHEN** the system resolves the city
- **THEN** the system resolves it to the province capital (Guangzhou) rather than a village or POI

#### Scenario: Geocode upstream failure is not unknown_city
- **GIVEN** the Amap geocode fallback fails (network error or non-success Amap status)
- **WHEN** the system attempts to resolve the city
- **THEN** the system returns `attraction_source_unavailable` (503), not `unknown_city`

**Acceptance criteria**
- [ ] AC1: "西安", "Xian", and "Xi'an" all resolve to Xi'an (`adcode=610100`); "北京"/"beijing"/"Beijing" resolve to Beijing. (test: test/city-resolve.test.ts)
- [ ] AC2: A name matching multiple city-level candidates returns `ambiguous_city` with a non-empty candidate list (each exposing `name`, `name_zh`, `adcode`) and no recommendations (never a wrong pick). (test: test/city-resolve.test.ts)
- [ ] AC3: An unresolvable name returns `unknown_city` and no recommendation payload. (test: test/city-resolve.test.ts)
- [ ] AC4: A non-China city (e.g. "Paris") returns `unknown_city`. (test: test/city-resolve.test.ts)
- [ ] AC5: Province-only input (e.g. "广东") resolves to its capital (Guangzhou); village/POI-level matches are rejected. (test: test/city-resolve.test.ts)
- [ ] AC6: An Amap geocode failure yields `attraction_source_unavailable` (503), while a successful geocode with no city-level match yields `unknown_city`. (test: test/city-resolve.test.ts)

## REMOVED Requirements

### Requirement: English default website output
**Reason**: replaced by the bilingual output requirement (English is now the default of a two-language system, not the only language). The v1 behavior of English-only output is intentionally dropped.
**Migration**: the `Localized website output (English and Chinese)` requirement adds `lang` (`en` default, `zh-CN`) and localizes UI/advice/weather/itinerary labels; attraction proper names remain `name_zh`.

## ADDED Requirements

### Requirement: Localized website output (English and Chinese)
The system SHALL support `en` and `zh-CN` output, defaulting to `en`, selectable via a UI toggle and a `lang` request parameter, resolved by the precedence `lang` parameter → `Accept-Language` → `en`, where an unsupported `lang` value (e.g. `fr`) MUST fall back to `en` rather than error. It SHALL localize UI labels, advice, weather summaries, environment/category labels, and itinerary labels, and SHALL emit a structured JSON payload plus a localized human-readable summary; Amap attractions SHALL expose their proper name as `name_zh` with an optional `name_en`.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: English is the default
- **GIVEN** a successful request with no `lang`
- **WHEN** the system formats the result
- **THEN** all system text is English and the response includes a non-empty English summary

#### Scenario: Chinese output is selectable
- **GIVEN** a request with `lang=zh-CN`
- **WHEN** the system formats the result
- **THEN** UI/advice/weather/env/itinerary text is Chinese and the summary is Chinese

#### Scenario: Attraction names use the source name
- **GIVEN** an Amap attraction whose only available name is Chinese
- **WHEN** the system returns the attraction
- **THEN** the attraction includes a non-empty `name_zh` and `name_en` may be absent

#### Scenario: Unsupported language falls back to English
- **GIVEN** a request with an unsupported `lang` value (e.g. `fr`)
- **WHEN** the system formats the result
- **THEN** the result is returned in English with no error

**Acceptance criteria**
- [ ] AC7: `lang=en` (default) returns all system text in English; `lang=zh-CN` returns UI/advice/weather/env/itinerary text in Chinese; both carry a JSON payload and a same-language summary. (test: test/i18n.test.ts)
- [ ] AC8: Every returned attraction carries a non-empty `name_zh`. (test: test/web-output.test.ts)
- [ ] AC9: An unsupported `lang` (e.g. `fr`) falls back to English output rather than returning an error. (test: test/i18n.test.ts)

### Requirement: Recommendation reasons
Each recommended attraction SHALL include a localized `reason` explaining why it suits that day, derived from the day's weather (reusing the rainy/hot classification of the retained `Indoor-first when there is precipitation` and `Avoid midday outdoor when hot` requirements) plus the attraction's environment and category.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: Rain day reason
- **GIVEN** a rainy day
- **WHEN** the system builds a recommendation
- **THEN** each attraction's `reason` is non-empty and mentions the weather-driven fit (e.g. indoor/sheltered) in the selected language

#### Scenario: Hot day reason
- **GIVEN** a hot day
- **WHEN** the system builds a recommendation
- **THEN** an outdoor attraction's `reason` notes the midday-heat caution

**Acceptance criteria**
- [ ] AC10: On every day, every ranked attraction carries a non-empty localized `reason` that references the day's weather condition. (test: test/recommendation-detail.test.ts)

### Requirement: Attraction introductions and photos
Each attraction SHALL include a localized `introduction` assembled from Amap attributes (category/type, environment, rating, address) and an `image` field holding an `https` Amap-origin photo URL when available (otherwise `null`); non-Amap or `http` photo URLs MUST be discarded rather than rendered. Introductions MUST be attribute-based, not free-form generated prose.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: Introduction from attributes
- **GIVEN** an Amap attraction with category, environment, rating, and address
- **WHEN** the system formats the attraction
- **THEN** `introduction` is a non-empty localized string built from those attributes

#### Scenario: Missing photo degrades gracefully
- **GIVEN** an Amap attraction with no photo
- **WHEN** the system returns the attraction
- **THEN** `image` is `null` and the response is still valid

**Acceptance criteria**
- [ ] AC11: Every attraction includes a non-empty localized `introduction` and an `image` that is an `https` Amap URL or `null`. (test: test/recommendation-detail.test.ts)

### Requirement: Trip itinerary
The system SHALL produce, for each forecast day, an itinerary with localized time-of-day slots (morning/afternoon/evening) containing up to 4 attractions drawn from that day's ranked list, ordered such that EVERY stop on a day classified as rainy is an indoor or mixed-environment attraction (using the environment rule of the retained `Amap attraction retrieval and environment classification` requirement) and no outdoor attraction is placed in the midday slot on a day classified as hot. Rainy/hot classification SHALL reuse the thresholds of the retained `Indoor-first when there is precipitation` and `Avoid midday outdoor when hot` requirements, and the itinerary MUST be consistent with that day's advice. When a day's ranked list has fewer than 2 attractions, the itinerary SHALL contain the available stops (1–4) without error.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: Itinerary per day
- **GIVEN** a resolved city with N forecast days
- **WHEN** the system emits recommendations
- **THEN** each day includes an `itinerary` of 2–4 time-slotted stops (or all available, 1–4, when fewer are present) with localized slot labels

#### Scenario: Weather-aware itinerary
- **GIVEN** a rainy day and a hot day
- **WHEN** the system builds each itinerary
- **THEN** every stop on the rainy day is indoor or mixed and the hot day places no outdoor attraction in the midday slot, consistent with each day's advice

#### Scenario: Fewer attractions than slots
- **GIVEN** a day whose ranked list has a single attraction
- **WHEN** the system builds that day's itinerary
- **THEN** the itinerary contains that one stop and no error

**Acceptance criteria**
- [ ] AC12: Each day includes an `itinerary` of 2–4 time-slotted stops (or all available, 1–4, when fewer than 2) drawn from that day's ranked attractions, with localized slot labels. (test: test/itinerary.test.ts)
- [ ] AC13: Every stop on a rainy day is indoor/mixed and a hot day's midday slot contains no outdoor attraction, consistent with the day's advice. (test: test/itinerary.test.ts)
- [ ] AC14: A day whose ranked list has 1 attraction yields a 1-stop itinerary without error. (test: test/itinerary.test.ts)

### Requirement: Tourism-style responsive website
The system SHALL serve a tourism-style page comprising a hero/search area, a language toggle, a weather forecast strip, attraction cards (each with an image and a short reason), and the day-by-day itinerary; the page SHALL declare a responsive viewport, define responsive breakpoints, avoid horizontal overflow, give every attraction image a non-empty `alt`, and display Amap photo attribution.
_Story: tourism-site-i18n-and-itinerary_

#### Scenario: Required sections are present
- **GIVEN** the website is served
- **WHEN** the page is loaded
- **THEN** it contains the hero/search area, language toggle, weather strip, attraction cards, and itinerary sections

#### Scenario: Responsive and accessible markup
- **GIVEN** the served page
- **WHEN** its markup and styles are inspected
- **THEN** it declares a responsive viewport and breakpoints, and every attraction image carries a non-empty `alt`

**Acceptance criteria**
- [ ] AC15: The served page contains the hero/search, language toggle, weather strip, attraction cards, and itinerary sections. (test: test/web-smoke.test.ts)
- [ ] AC16: The page declares a responsive viewport (`<meta name="viewport">`), its CSS defines breakpoints, and every attraction image has a non-empty `alt`. (test: test/web-smoke.test.ts)
- [ ] AC17: The page displays Amap photo attribution. (test: test/web-smoke.test.ts)

## Constraints & NFRs
- The `en` and `zh-CN` message catalogs SHALL define the same keys; rendering in either locale SHALL NOT emit a missing-key placeholder.
- City resolution SHALL use the bundled alias table for major cities (no network) and SHALL fall back to Amap geocode only when needed; Amap geocode + `place/text` SHALL reuse the per-city TTL cache.
- Recommendation generation for a single city SHALL still complete within p95 < 2000 ms (warm cache), with a 3000 ms per-upstream timeout.
- The API key SHALL stay server-side; logs SHALL NOT contain the key, URLs carrying it, or PII.
- Ambiguous or unknown input SHALL NEVER produce recommendations for a guessed city.

## Out of Scope
- Languages other than English and Simplified Chinese.
- LLM-generated free-form descriptions (introductions are attribute-based).
- Amap's paid multilingual POI search (`langCode=en`).
- Booking, ticketing, transportation, navigation, accounts, persistence, or a database.
- Native mobile apps; offline mode; a hosted production deployment.

## Test Strategy
- **Unit tests** (vitest) cover the alias-table resolution (`西安`/`Xian`/`Xi'an`), the `ambiguous_city` policy, i18n catalog parity, and reason/introduction/itinerary generation — mapped 1:1 to AC1–AC12.
- **Integration tests** run the HTTP endpoint against a mocked Amap + Open-Meteo transport in both `en` and `zh-CN`, including cache-hit and failure injection.
- **Contract tests** assert the extended schema (`lang`, `attractions[].reason/introduction/image`, `days[].itinerary`) and the new `ambiguous_city` error.
- **Web smoke test** asserts the required sections, responsive viewport/breakpoints, and image `alt`.
- **Live smoke** verifies real Amap geocode resolves `西安`/`Xi'an` correctly.

<!-- IMMUTABLE once approved (PR merged). Execution state belongs in tasks.md. -->
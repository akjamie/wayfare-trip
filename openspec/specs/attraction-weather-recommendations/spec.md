# attraction-weather-recommendations Specification

## Purpose
Provide a website that takes a Chinese city name and returns per-day attraction recommendations shaped by the upcoming weather forecast, ranking indoor attractions first when precipitation is expected and flagging outdoor attractions to avoid the midday window when it is hot, with all system output in English by default.

## Requirements

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

### Requirement: Amap attraction retrieval and environment classification
The system SHALL obtain the resolved city's `adcode` via Amap reverse geocoding at the resolved coordinates, query the Amap Web Service `place/text` API with `city=<adcode>` and `citylimit=true` constrained to scenic and museum-type POIs (`types=110000|140100|140200|140400|140600`), annotate every attraction with an `environment` of `indoor`, `outdoor`, or `mixed` derived from its Amap `typecode` via a configurable mapping, and cache per-city results with a TTL to limit Amap calls.
_Story: city-attractions-weather-recommendations_

#### Scenario: Bridge the resolved city to an Amap query
- **GIVEN** a city resolved to coordinates
- **WHEN** the system prepares the Amap query
- **THEN** it obtains the city `adcode` via Amap reverse geocoding and issues `place/text` with `city=<adcode>` and `citylimit=true`

#### Scenario: Retrieve attractions for a major city
- **GIVEN** a resolved city whose Amap search returns results
- **WHEN** the system generates recommendations
- **THEN** the system returns at least one attraction, each carrying a POI `id`, `name_zh`, coordinates, and an environment of `indoor`, `outdoor`, or `mixed`

#### Scenario: Classify environment from typecode
- **GIVEN** an Amap POI with a `typecode` present in the configured mapping (e.g. a museum `140100` maps to indoor, a park `110100` maps to outdoor)
- **WHEN** the system classifies the attraction
- **THEN** the attraction's environment equals the mapped value, and falls back to `mixed` when the typecode is unmapped

#### Scenario: Cache avoids repeated Amap calls
- **GIVEN** the system has already retrieved attractions for a city within the cache TTL
- **WHEN** the same city is requested again before the TTL expires
- **THEN** the system serves the cached attractions and does not issue a second Amap search call

**Acceptance criteria**
- [ ] AC5: For a major city with Amap results, the response contains one or more attractions, each with `id`, `name_zh`, coordinates, and environment in `{indoor,outdoor,mixed}`. (test: test/amap-client.test.ts)
- [ ] AC6: Environment is derived from `typecode` via the configured mapping (museum `1401xx` / exhibition `1402xx` / gallery `1404xx` / science `1406xx` map to indoor; park `1101xx` / scenery `1102xx` map to outdoor or mixed), defaulting to `mixed` for unmapped codes. (test: test/amap-client.test.ts)
- [ ] AC7: The Amap request uses the resolved city's `adcode` with `citylimit=true` and a `types` set including `110000` and `140100`. (test: test/amap-client.test.ts)
- [ ] AC8: A second request for the same city within the cache TTL is served from cache without an additional Amap call. (test: test/amap-client.test.ts)

### Requirement: Weather-aware per-day recommendation
The system SHALL produce one recommendation entry per forecast day (default 7, configurable within 1–16), where each entry contains the day's date, an English weather summary, the day's advice, and a ranked attraction list, using the city's local timezone.
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
- [ ] AC9: `days` contains one entry per forecast day (default 7, configurable 1–16), each with `date`, `weather`, `advice`, and `attractions[]`. (test: test/recommendation.test.ts)
- [ ] AC10: A week with rain on day A and heat on day B yields indoor-first ordering on day A and a midday advisory on day B, independently. (test: test/recommendation.test.ts)
- [ ] AC11: Hourly/day boundaries used for the midday window follow the city's local timezone. (test: test/recommendation.test.ts)

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
- [ ] AC12: On a rainy day, every indoor and mixed attraction precedes every outdoor attraction in the ranking. (test: test/weather-advice.test.ts)
- [ ] AC13: Rain classification is true when precipitation probability >= 50% (default) or the WMO code is in the rain set (51–67, 80–82, 95–99). (test: test/weather-advice.test.ts)
- [ ] AC14: WMO snow codes (71–77, 85–86) classify the day as rainy for indoor-first ranking. (test: test/weather-advice.test.ts)

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
- [ ] AC15: Given max temperature >= 33°C, outdoor and mixed attractions are flagged with an 11:00–15:00 avoidance advisory. (test: test/weather-advice.test.ts)
- [ ] AC16: Given max temperature < 33°C, no 11:00–15:00 advisory is produced. (test: test/weather-advice.test.ts)
- [ ] AC17: The high-temperature threshold and noon window are overridable via env and change where advisories trigger. (test: test/weather-advice.test.ts)

### Requirement: Deterministic ranking and top-N
The system SHALL rank attractions within each tier preserving Amap relevance order, MUST break ties deterministically by POI `id` ascending, and SHALL cap each day's ranked list at a configurable top-N (default 10).
_Story: city-attractions-weather-recommendations_

#### Scenario: Stable ordering
- **GIVEN** two attractions in the same tier with equal Amap relevance
- **WHEN** the system ranks them
- **THEN** they are ordered by POI `id` ascending, producing identical output across repeated runs for the same (cached or mocked) input

#### Scenario: Top-N cap
- **GIVEN** more candidate attractions than the configured top-N (default 10)
- **WHEN** the system ranks attractions for a day
- **THEN** the returned list contains at most top-N attractions

**Acceptance criteria**
- [ ] AC18: Within a tier, ordering preserves Amap relevance order and breaks ties by POI `id` ascending; repeated runs over the same cached/mocked input are identical. (test: test/ranking.test.ts)
- [ ] AC19: Each day's ranked list is capped at top-N (default 10, configurable). (test: test/ranking.test.ts)

### Requirement: HTTP interface contract and input validation
The system SHALL expose `GET /api/recommend?city=<name>&days=<n>` with optional `lang`, `star` (3, 4, or 5), and `priceMin`/`priceMax` parameters, returning a JSON payload with the documented schema; it SHALL validate input (rejecting empty, whitespace-only, or longer-than-64-character `city`, `days` outside 1–16, `star` not in {3, 4, 5}, and `priceMin`/`priceMax` that are not non-negative integers or where `priceMin > priceMax`, with `400 invalid_input`) and SHALL return errors as `{ "error_code": ..., "message": ... }`.
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
- [ ] AC4: `star` not in {3,4,5}, a non-integer or negative price (e.g. `200.5` or `-1`), or `priceMin > priceMax` returns `400 invalid_input`. (test: test/api-contract.test.ts)

### Requirement: Upstream API failure and error taxonomy
The system SHALL block the response and return a user-friendly system-issue message whenever an upstream API call fails (either the weather API or the Amap attraction API), responding `503` with the matching `error_code`; a well-formed Amap response containing zero scenic attractions SHALL instead be a `200` notice; unresolved cities and invalid input SHALL be `400`.
_Story: city-attractions-weather-recommendations_

#### Scenario: Weather API error blocks with a friendly message
- **GIVEN** the weather API returns an error or times out
- **WHEN** the system handles the request
- **THEN** it responds `503` with `error_code = "forecast_unavailable"` and a user-friendly English system-issue message, and returns no partial recommendations

#### Scenario: Attraction API error blocks with a friendly message
- **GIVEN** the Amap API returns an error status (including quota exhaustion such as `infocode = 10003`), an invalid/expired key, or times out
- **WHEN** the system handles the request
- **THEN** it responds `503` with `error_code = "attraction_source_unavailable"` and a user-friendly English system-issue message, and returns no partial recommendations

#### Scenario: Attraction API succeeds but returns no scenic results
- **GIVEN** Amap returns a successful response with zero matching scenic/museum POIs
- **WHEN** the system handles the request
- **THEN** it responds `200` with a `no_attraction_data` notice and empty (non-fabricated) attraction lists

#### Scenario: Error taxonomy
- **GIVEN** unresolved/ambiguous city or invalid input
- **WHEN** the system handles the request
- **THEN** it returns `400` with `error_code` (`unknown_city` or `invalid_input`), distinct from the `503` upstream-failure and `200` notice cases

**Acceptance criteria**
- [ ] AC24: A weather-API error or timeout yields `503 forecast_unavailable` with a user-friendly English message and no partial recommendations. (test: test/upstream-errors.test.ts)
- [ ] AC25: An Amap error status (incl. quota `infocode=10003`), invalid key, or timeout yields `503 attraction_source_unavailable` with a user-friendly English message. (test: test/upstream-errors.test.ts)
- [ ] AC26: A successful Amap response with zero scenic POIs yields `200` with a `no_attraction_data` notice and empty attraction lists. (test: test/upstream-errors.test.ts)
- [ ] AC27: The taxonomy holds: `400` for `unknown_city`/`invalid_input`, `503` for `forecast_unavailable`/`attraction_source_unavailable`, `200` for `no_attraction_data`. (test: test/upstream-errors.test.ts)

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
The system SHALL serve a tourism-style page comprising a hero/search area (with optional hotel star/price preference controls), a language toggle, a weather forecast strip, attraction cards (each with an image and a short reason), a hotel recommendations section, the day-by-day itinerary, and per-day route sections; the page SHALL declare a responsive viewport, define mobile (≤640px), tablet (641–1024px), and desktop (>1024px) breakpoints, avoid horizontal overflow, give every image a non-empty `alt`, display Amap photo attribution, and define loading (skeleton/spinner), empty (no hotels / no attractions), error (inline banner + retry), and active-filter states.
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

#### Scenario: Interaction states are defined
- **GIVEN** the served page and its client script
- **WHEN** the UI is inspected
- **THEN** it provides loading (skeleton/spinner), empty (no hotels / no attractions), and error (inline banner with retry) states, and the hotel filter controls expose an active state

**Acceptance criteria**
- [ ] AC5: The served page contains the hero/search (with hotel preference controls), language toggle, weather strip, attraction cards, hotel section, itinerary, and route sections. (test: test/web-smoke.test.ts)
- [ ] AC6: The page declares a responsive viewport (`<meta name="viewport">`), its CSS defines mobile (≤640px), tablet (641–1024px), and desktop (>1024px) breakpoints, and every image has a non-empty `alt`. (test: test/web-smoke.test.ts)
- [ ] AC7: The page displays Amap photo attribution. (test: test/web-smoke.test.ts)
- [ ] AC19: The UI defines loading (skeleton/spinner), empty (no hotels / no attractions), and error (inline banner + retry) states, and hotel filter controls expose an active state (`aria-pressed`), asserted in the served markup/JS. (test: test/web-smoke.test.ts)

### Requirement: Hotel recommendations
The system SHALL retrieve hotels for the resolved city from Amap `place/text` (`types=100000`, `extensions=all`), SHALL filter by the optional `star` level as a **minimum** (`level >= star`, where the level is derived from the typecode) and by the optional price range (`biz_ext.cost`), SHALL return up to three hotels (1 primary + 2 alternatives) ranked by filter match, then rating descending (a missing rating ranks last), then distance to the centroid of all itinerary stops across the trip ascending, then POI `id` ascending; it SHALL exclude hotels with an unknown star level when a `star` filter is set and hotels with an unknown cost when a price bound is set, SHALL localize each hotel's name/description/star label with an `https` image or `null`, and SHALL map a hotel-search upstream failure to `503 attraction_source_unavailable` with no partial plan.
_Story: hotel-route-search-redesign_

#### Scenario: Default hotel recommendations
- **GIVEN** a resolved city with hotel POIs and no star/price filters
- **WHEN** the system builds recommendations
- **THEN** it returns up to three hotels (one flagged primary) with name, star, price, rating, address, image, and a localized reason

#### Scenario: Star filter
- **GIVEN** `star=4`
- **WHEN** hotels are filtered
- **THEN** every returned hotel's typecode-derived level is at least four stars (5★ hotels are allowed), and hotels with an unknown level are excluded

#### Scenario: Price filter
- **GIVEN** `priceMin=200&priceMax=800`
- **WHEN** hotels are filtered
- **THEN** every returned hotel's `biz_ext.cost` is within the range; hotels with unknown cost are excluded when a bound is set

#### Scenario: No hotels available
- **GIVEN** a valid request whose hotel search returns zero POIs (or all are filtered out)
- **WHEN** the system builds the plan
- **THEN** it responds `200` with `hotels: []` and a localized `no_hotel_data` notice, still returning the attraction plan and routes without hotel endpoints

#### Scenario: Hotel upstream failure
- **GIVEN** the Amap hotel search fails (error status, invalid key, or timeout)
- **WHEN** the system builds the plan
- **THEN** it responds `503` with `error_code = "attraction_source_unavailable"` and no partial plan

**Acceptance criteria**
- [ ] AC8: Up to three hotels are returned (exactly one `primary: true`) with `id`, `name_zh`, `star`, `price`, `rating`, `address`, `image` (`https` URL or `null`), and a localized `reason`; ordering is filter match → rating desc (missing last) → centroid distance asc → `id` asc (deterministic). (test: test/hotels.test.ts)
- [ ] AC9: With `star` set, every returned hotel's derived level is `>= star` (or an empty list with a notice); unknown-level hotels are excluded. (test: test/hotels.test.ts)
- [ ] AC10: With price bounds set, every returned hotel's price is within `[priceMin, priceMax]`, and hotels with unknown cost are excluded. (test: test/hotels.test.ts)
- [ ] AC15: When the hotel search yields zero usable hotels, the response is `200` with `hotels: []` and a localized `no_hotel_data` notice, and routes are returned without hotel endpoints. (test: test/hotels.test.ts)
- [ ] AC16: A hotel-search upstream failure yields `503 attraction_source_unavailable` with no partial plan. (test: test/hotels.test.ts)

### Requirement: Daily travel route with hotel
The system SHALL produce, for each forecast day, a route that starts at the primary recommended hotel, visits that day's itinerary stops in nearest-neighbor order, and returns to the hotel; each leg SHALL carry `from` and `to` (the POI `id`s of the endpoints), `distanceKm`, `durationMin` (= round(`distanceKm` / speed × 60), with speed 5 km/h walking or 30 km/h driving), and `mode` (walk when the leg is ≤ 2 km, otherwise drive), computed offline without external routing calls. When no hotel is available, the route SHALL still list the day's stops without hotel endpoints and without error; when a day has no stops, the route SHALL be empty (`legs: []`, `totalDistanceKm: 0`, `totalDurationMin: 0`).
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

#### Scenario: Zero-stop day
- **GIVEN** a day whose itinerary has no stops
- **WHEN** the system builds the route
- **THEN** the route is empty (`legs: []`, `totalDistanceKm: 0`, `totalDurationMin: 0`) and the response is valid

**Acceptance criteria**
- [ ] AC11: Each day's `route` starts at the primary hotel and ends at the hotel, covering that day's itinerary stops. (test: test/route.test.ts)
- [ ] AC12: Every leg carries `from`/`to` (POI `id`s), `distanceKm`, `durationMin` (= round(`distanceKm` / speed × 60), walk 5 km/h or drive 30 km/h), and `mode`, with `mode = walk` when `distanceKm <= 2` and `drive` otherwise. (test: test/route.test.ts)
- [ ] AC13: Stops are ordered by deterministic nearest-neighbor from the hotel (repeatable across runs). (test: test/route.test.ts)
- [ ] AC14: When no hotel is available, the route lists the stops without hotel endpoints and does not error. (test: test/route.test.ts)
- [ ] AC17: A day with zero stops yields an empty route (`legs: []`, totals 0) without error. (test: test/route.test.ts)

### Requirement: Hotel and route localization
The system SHALL localize hotel labels (star, price, reason), route labels (mode/slot/distance), and the `no_hotel_data` notice in `en` and `zh-CN`, and both catalogs SHALL define the same keys (no missing-key placeholder).
_Story: hotel-route-search-redesign_

#### Scenario: Hotel and route labels are localized
- **GIVEN** a successful plan
- **WHEN** the result is formatted in `en` and again in `zh-CN`
- **THEN** the hotel star/price/reason labels, route mode/distance labels, and the `no_hotel_data` notice appear in the selected language

**Acceptance criteria**
- [ ] AC18: Hotel and route labels (and `no_hotel_data`) are localized in `en` and `zh-CN`, and the two catalogs have identical keys. (test: test/i18n.test.ts)

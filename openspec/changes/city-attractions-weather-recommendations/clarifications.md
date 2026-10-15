# Clarifications: city-attractions-weather-recommendations

> Requirement: "用户输入一个中国城市名,系统返回该城市的景点推荐,并结合未来几天的天气给出建议:下雨时优先室内景点,高温时避开中午的户外景点. 整个系统用英文作为默认输出"
> Settled via `batch-grill-me` (Round 1). All recommendations approved by the author.

## Requirement
"用户输入一个中国城市名,系统返回该城市的景点推荐,并结合未来几天的天气给出建议:下雨时优先室内景点,高温时避开中午的户外景点. 整个系统用英文作为默认输出"

## Settled decisions
<!-- one entry per settled decision: decision -> answer, with the reason -->

- **Q1 — Delivery shape** → Option C (shared core + CLI & thin HTTP wrapper, Node/TypeScript).
  Reason: the recommendation logic lives in one pure, testable module; both entry points are cheap; matches the installed Node v24 toolchain.

- **Q2 — Weather data source** → Option A (Open-Meteo, no API key). Also uses Open-Meteo Geocoding API (`language=zh`) for city resolution.
  Reason: free, no key, works for China (ECMWF + CMA models), and the geocoding endpoint doubles as city resolution.

- **Q3 — Attraction data source** → Option A (bundled static curated dataset: city → attractions with `name_en`, `environment: indoor|outdoor|mixed`, `category`) for a seed set of cities.
  Reason: indoor/outdoor is the core signal the feature hinges on, and no POI API exposes it; curated data is deterministic and offline-testable. (Amap POI is a possible later extension.)

- **Q4 — Weather thresholds** → Option B (configurable). Defaults: rain = daily `precipitation_probability` ≥ 50% or `weather_code` in the rain set; high temperature = daily max `temperature_2m` ≥ 33°C; noon window = 11:00–15:00. Overridable via CLI flags / env.
  Reason: thresholds are product taste; config override is cheap and avoids a re-spec later.

- **Q5 — City coverage & resolution** → Option A (accept any Chinese city, geocode freely; graceful "no local attraction data yet" for cities outside the dataset).
  Reason: geocoding is free and unlimited; do not artificially restrict input, only degrade gracefully.

- **Q6 — Input normalization** → Option B (Chinese + pinyin + English, e.g. 北京 / beijing / Beijing).
  Reason: trivial via geocoding `language=en` fallback; near-zero cost.

- **Q7 — Output format & language** → Option B (structured JSON + an English human-readable summary; English is the default everywhere; no i18n in v1).
  Reason: JSON keeps it testable/consumable; English is the default language for all user-facing output.

- **Q8 — Failure handling** → Option A (distinct English errors for unknown/ambiguous city, no forecast, weather API down, no attractions; non-zero exit / HTTP 4xx; default to indoor attractions when forecast is unavailable).
  Reason: "no weather → default to indoor" is the safe recommendation for a travel-tip product.

## Open questions
<!-- must be empty before the spec is written -->
(none)
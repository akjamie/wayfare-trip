# Proposal: City Attraction Recommendations with Weather-Aware Advice

## Why
Travelers picking a Chinese city need to know which attractions are worth visiting *and* how the upcoming weather should change those plans. Today there is no tool that answers both at once; weather apps show forecasts but no attraction guidance, and attraction lists ignore the forecast. We build a single entry point that returns recommended attractions plus day-by-day advice, with English as the default output.

## What Changes
- New Node.js (TypeScript) service exposing a shared, testable recommendation core with two thin entry points: a CLI command and an HTTP JSON endpoint.
- New inner workflows: resolve an input city (Chinese / pinyin / English) to coordinates; fetch a forecast (Open-Meteo, no API key); load a curated seed attraction dataset keyed by city; rank attractions against the forecast.
- New domain logic: when rain is forecast, indoor attractions rank first; when the daily max temperature reaches a high-temperature threshold, outdoor attractions are flagged to avoid the 11:00–15:00 window.
- All user-facing output defaults to English; results are returned as structured JSON plus an English human-readable summary.
- New bundled curated dataset of attractions for a seed set of Chinese cities, each attraction tagged `environment: indoor|outdoor|mixed`.

## Capabilities
- **New Capabilities**:
  - `attraction-weather-recommendations` (becomes `specs/attraction-weather-recommendations/spec.md`)
- **Modified Capabilities**: none (greenfield).

## Impact
- **Code**: new Node/TypeScript service (no existing application code to modify — repo is scaffold-only).
- **Dependencies**: `open-meteo` via upstream HTTP API (geocoding + forecast); no SDK; no API key in v1.
- **APIs**: new CLI command and new REST JSON endpoint.
- **Data**: new bundled static attraction dataset (JSON) added to the repo.
- **Systems**: none external beyond the Open-Meteo public API.

## Out of Scope
- i18n / non-English output (English is the only language in v1).
- Full China attraction coverage — only a curated seed set of cities in v1.
- Live trip booking, ticketing, transportation, or navigation.
- Persistence, accounts, caching layers, or caching invalidation.
- Amap/高德 POI integration (a possible later extension, not part of this change).
- Push notifications, mobile/web UI, or a hosted deployment.

## Dependencies & Assumptions
- Assumes network access to the public Open-Meteo Geocoding and Forecast APIs (no key required; non-commercial free tier).
- Assumes the curated attraction dataset is populated ahead of time (indoor/outdoor/mixed tags are human-curated; the upstream API does not supply them).
- Assumes no existing codebase conventions to respect (greenfield); coding conventions will be established during implementation.
- Assumes thresholds (rain probability, high temperature, noon window) have sensible defaults and are user-overridable via flags/env.

## System Design refs
<!-- none for this change -->
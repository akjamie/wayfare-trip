# wayfare-trip

A website that takes a Chinese city name and returns **per-day attraction
recommendations shaped by the weather forecast**:

- when precipitation is expected, indoor attractions rank first;
- when it is hot, outdoor attractions are flagged to avoid the 11:00–15:00 window.

All system output is in English by default.

## How it works

```
city name ──▶ resolve city ──▶ attractions (Amap) ┐
                                                   ├─▶ per-day ranking ──▶ website / JSON API
                 forecast (Open-Meteo) ────────────┘
```

- **City resolution** — resolve Chinese / pinyin / English input to a canonical
  Chinese city (coordinates, English name, `adcode`).
- **Attractions** — Amap (高德) Web Service `place/text`, constrained to scenic +
  museum/exhibition POI types (`110000|140100|140200|140400|140600`); each
  attraction is tagged `indoor` / `outdoor` / `mixed` from its Amap `typecode`.
- **Weather** — Open-Meteo (free, no API key): hourly/daily temperature,
  precipitation probability, WMO weather codes, city-local time.
- **Recommendation** — one ranked list per forecast day (default 7), applying the
  rain (indoor-first) and heat (avoid midday outdoor) rules.

## Requirements

- Node.js >= 20 (developed against v24)
- An **Amap Web Service API key** (free personal tier)

## Setup

```bash
cp .env.example .env      # then set AMAP_KEY
npm install
```

Environment variables (see `.env.example`): `AMAP_KEY`, and optional threshold
overrides `WAYFARE_RAIN_PROB`, `WAYFARE_HIGH_TEMP_C`, `WAYFARE_NOON_START`,
`WAYFARE_NOON_END`, `WAYFARE_FORECAST_DAYS`, `WAYFARE_TOP_N`.

## Usage

> Implementation is specified under `openspec/changes/city-attractions-weather-recommendations/`
> and not yet built. Commands below are the intended interface.

- Website: serve the UI, which calls `GET /api/recommend?city=<name>&days=<n>`.

## API contract

`GET /api/recommend?city=<name>&days=<n>` → `200` JSON:

```jsonc
{
  "city": { "name": "...", "admin1": "...", "lat": 0, "lon": 0 },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "weather": { "summary": "...", "tempMaxC": 0, "precipProb": 0 },
      "advice": "...",
      "attractions": [
        { "id": "...", "name_zh": "...", "environment": "indoor|outdoor|mixed", "location": "..." }
      ]
    }
  ],
  "summary": "...",
  "notices": []
}
```

Errors use `{ "error_code": "...", "message": "..." }` with the mapped status:

- `400 invalid_input` — bad `city`/`days` input
- `400 unknown_city` — city not found (resolution is constrained to China)
- `503 forecast_unavailable` — the weather API failed (blocked, friendly message)
- `503 attraction_source_unavailable` — the Amap API failed, including quota
  exhaustion (`infocode=10003`) and timeouts (blocked, friendly message)

A well-formed Amap response with **no** scenic/museum results is a success:
`200` with a `no_attraction_data` notice and empty attraction lists.

## Project governance

This repo uses the **Agentic SDLC** flow. Everything runs through `asdlc`:

```bash
asdlc status <ID>     # where a change is
asdlc lint <ID>       # check the spec
asdlc approve <ID>    # record approval after the spec PR merges
asdlc apply <ID>      # implement (task-level TDD)
asdlc verify <ID>     # verify the implementation
asdlc archive <ID>    # close the change
```

See `openspec/config.yaml`, `.sdlc/policy.yaml`, and `AGENTS.md`.

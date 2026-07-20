# Integrations

## Integration boundaries

HeatShift keeps external services behind server-only modules and Next.js route handlers. Browser code never receives provider credentials. Integration responses are parsed with local Zod schemas before they reach the deterministic domain rules or scheduler. No submitted plan text, extracted plan, or weather response is persisted.

## OpenRouter plan extraction

`POST /api/parse-plan` accepts `text` plus optional authoritative form `context`: site name, location name, shift date/start/end, crew size, and non-acclimatized-worker count. Extraction fills empty fields only and removes missing-information messages for values already supplied by the supervisor.

Before OpenRouter, a pure parser recognizes hyphen/en-dash/em-dash schedule rows, English or Arabic numerals, 12/24-hour times, sequential half-day inference, and noon rollover inside a supplied same-day shift. Explicit ranges create requested start/end values and derived minute durations with the source row attached as evidence. Ambiguous ranges remain review items. Obvious break/meal terms create non-work activities, and explicit must-complete/equipment notes are retained without inventing equipment times.

If OpenRouter is unconfigured or unavailable but the deterministic parser found structured rows, the endpoint returns those reviewable activities without a model. Unstructured prose still returns the existing typed AI error and keeps manual entry available.

`POST /api/parse-plan` accepts JSON containing a `text` field. The text is trimmed, must contain at least 10 meaningful characters, may not exceed 5000 characters, and is protected by a 10 KiB request-body limit. Unsupported content types and invalid JSON receive typed `INVALID_INPUT` errors.

The provider-neutral extraction service asks OpenRouter's OpenAI-compatible chat-completions endpoint for strict JSON-schema output and sends `provider.require_parameters: true` so routing is limited to providers that support the requested parameters. It extracts stated plan facts only. Instructions prohibit invented regulations, safety decisions, dates, times, durations, crew counts, or locations. Uncertainty is returned as assumptions or missing information, and local Zod validation remains the trusted boundary.

When OpenRouter returns an actual model identifier, the endpoint exposes it as neutral response metadata for a review notice only; it never affects domain rules. The service makes one retry only after invalid structured output. It does not automatically retry rate limits, authentication failures, cancellation, or timeout.

AI does not decide whether work is safe and does not apply restrictions, work/rest rules, hydration calculations, scheduling, or briefing content. Those decisions remain deterministic.

Requests are aborted after 30 seconds or when the incoming request disconnects. Provider failures are mapped to typed, user-facing errors without stack traces:

- `AI_NOT_CONFIGURED`
- `AI_TIMEOUT`
- `AI_RATE_LIMITED`
- `AI_INVALID_RESPONSE`
- `AI_UNAVAILABLE`

The server does not log full plan text or API keys.

## OpenRouter environment setup

Copy `.env.example` to `.env.local` and set:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
```

`OPENROUTER_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix. If it is absent or blank, HeatShift still builds and runs; only AI extraction is disabled with `AI_NOT_CONFIGURED`. `OPENROUTER_MODEL` defaults to `openrouter/free`, OpenRouter's free-model router. A fixed model may be selected by setting a currently available `:free` model ID instead.

OpenRouter documents the [free router](https://openrouter.ai/docs/guides/routing/routers/free-router), [chat-completions API and structured outputs](https://openrouter.ai/docs/api/reference/overview), and [free-tier rate limits](https://openrouter.ai/docs/api/reference/limits). Free availability, latency, selected models, and limits can change, so manual entry and the deterministic demo remain essential fallback paths.

## Open-Meteo location search and weather

`GET /api/locations?q=<query>&language=en|ar` uses Open-Meteo Geocoding without an API key. Queries must contain 2–100 characters. The adapter validates upstream records, keeps Saudi Arabia (`countryCode=SA`) results only, returns no more than eight, applies a six-second timeout, and briefly caches successful searches. Empty results remain empty; malformed, timed-out, and failed responses return typed errors without exposing upstream details. Riyadh, Jeddah, Dammam, Mecca, and Medina remain quick presets and network-free fallback choices rather than the only production locations.

`GET /api/weather?latitude=<latitude>&longitude=<longitude>&date=YYYY-MM-DD&timezone=Asia%2FRiyadh&locationName=<name>` uses the selected `SiteLocation` coordinates. The MVP accepts only `Asia/Riyadh` (`UTC+3`, without daylight-saving adjustment) and requests Open-Meteo data in that zone. It requests:

- `temperature_2m` → `temperatureCelsius`
- `apparent_temperature` → `apparentTemperatureCelsius`
- `relative_humidity_2m` → `relativeHumidityPercent`
- `wind_speed_10m` → `windSpeedKph`

The service validates array lengths and every normalized hour. It never substitutes, interpolates, or fabricates missing weather. Invalid coordinates, dates, timezones, unavailable dates, empty forecasts, malformed responses, upstream failures, and timeouts return typed errors. Response metadata includes the selected name, latitude, longitude, forecast timezone, requested date, and retrieval time.

The full requested day's hourly forecast is retained for deterministic scheduling lookup. A 06:30 slot uses the latest forecast at or before that slot, so the 06:00 point is preserved. A separate shift-filtered subset drives the displayed strip, peak temperature, peak apparent temperature, and shift summary; values after an early shift cannot inflate those metrics.

Open-Meteo's returned hourly strings are already Saudi local clock values because the request specifies `Asia/Riyadh`; HeatShift does not convert them a second time or apply the browser's time zone. Retrieval timestamps remain UTC internally and are formatted for users as a Saudi local date and time with the explicit `Saudi Arabia Standard Time (UTC+3)` label.

Forecast values support advance planning. The UI labels them “Model forecast for selected coordinates — preliminary planning only,” shows coordinate and retrieval metadata, and explicitly states that the model forecast is not an on-site measurement. Forecast data remains separate from the supervisor-entered TWL zone and does not replace qualified field procedures. HeatShift does not calculate TWL from ordinary forecast values.

Location search and forecast data are attributed to [Open-Meteo](https://open-meteo.com/). No Open-Meteo key is required.

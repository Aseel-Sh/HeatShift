# Integrations

## Integration boundaries

HeatShift keeps external services behind server-only modules and Next.js route handlers. Browser code never receives provider credentials. Integration responses are parsed with local Zod schemas before they reach the deterministic domain rules or scheduler. No submitted plan text, extracted plan, or weather response is persisted.

## OpenRouter plan extraction

`POST /api/parse-plan` accepts JSON containing a `text` field. The text is trimmed, must contain at least 10 meaningful characters, may not exceed 5000 characters, and is protected by a 10 KiB request-body limit. Unsupported content types and invalid JSON receive typed `INVALID_INPUT` errors.

The provider-neutral extraction service asks OpenRouter's OpenAI-compatible chat-completions endpoint for strict JSON-schema output. It extracts stated plan facts only. Instructions prohibit invented regulations, safety decisions, dates, times, durations, crew counts, or locations. Uncertainty is returned as assumptions or missing information, and local Zod validation remains the trusted boundary.

AI does not decide whether work is safe and does not apply restrictions, work/rest rules, hydration calculations, scheduling, or briefing content. Those decisions remain deterministic.

Requests are aborted after 12 seconds or when the incoming request disconnects. Provider failures are mapped to typed, user-facing errors without stack traces:

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

## Open-Meteo weather

`GET /api/weather?city=riyadh&date=YYYY-MM-DD` supports Riyadh, Jeddah, Dammam, Mecca, and Medina using fixed coordinates in `data/cities.ts`. Requests use `Asia/Riyadh` and request:

- `temperature_2m` → `temperatureCelsius`
- `apparent_temperature` → `apparentTemperatureCelsius`
- `relative_humidity_2m` → `relativeHumidityPercent`
- `wind_speed_10m` → `windSpeedKph`

The service validates array lengths and every normalized hour. It never substitutes, interpolates, or fabricates missing weather. Invalid cities or dates, unavailable dates, empty forecasts, malformed responses, upstream failures, and timeouts return typed errors.

Forecast values support advance planning. They remain separate from site-verified TWL input and do not replace qualified field procedures.

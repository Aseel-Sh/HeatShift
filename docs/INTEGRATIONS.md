# Integrations

## Integration boundaries

HeatShift keeps external services behind server-only modules and Next.js route handlers. Browser code never receives provider credentials. Integration responses are parsed with local Zod schemas before they can reach the deterministic domain rules or scheduler.

No submitted plan text, extracted plan, or weather response is persisted by this iteration.

## Gemini plan extraction

`POST /api/parse-plan` accepts JSON containing a `text` field. The text is trimmed, must contain at least 10 meaningful characters, may not exceed 5000 characters, and is also protected by a 10 KiB request-body limit. Unsupported content types and invalid JSON receive typed `INVALID_INPUT` errors.

Gemini is used only to extract stated plan facts into a constrained JSON schema. Its instructions prohibit inventing regulations, safety decisions, dates, times, durations, crew counts, or locations. Uncertainty is returned as assumptions or missing information. The server validates the model's JSON again with Zod before returning it.

Gemini does not decide whether work is safe and does not apply restrictions or work/rest rules. Those decisions remain in the deterministic domain layer.

The extraction request is aborted after 12 seconds or when the incoming request disconnects. Provider failures are mapped to typed errors without stack traces:

- `AI_NOT_CONFIGURED`
- `AI_TIMEOUT`
- `AI_RATE_LIMITED`
- `AI_INVALID_RESPONSE`
- `AI_UNAVAILABLE`

The server does not log full plan text or API keys.

## Gemini environment setup

Copy `.env.example` to `.env.local` and set:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

`GEMINI_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix. If the key is absent or blank, HeatShift continues to build and run; only AI extraction is disabled with `AI_NOT_CONFIGURED`. `GEMINI_MODEL` defaults to `gemini-3.5-flash`.

## Open-Meteo weather

`GET /api/weather?city=riyadh&date=YYYY-MM-DD` supports Riyadh, Jeddah, Dammam, Mecca, and Medina using fixed coordinates in `data/cities.ts`. Requests use the `Asia/Riyadh` timezone and request these hourly Open-Meteo fields:

- `temperature_2m` → `temperatureCelsius`
- `apparent_temperature` → `apparentTemperatureCelsius`
- `relative_humidity_2m` → `relativeHumidityPercent`
- `wind_speed_10m` → `windSpeedKph`

The service validates array lengths and every normalized hour. It never substitutes, interpolates, or fabricates missing weather. Invalid cities or dates, unavailable dates, empty forecasts, malformed responses, upstream failures, and eight-second timeouts return typed errors instead of forecast data.

Forecast values support advance planning. They remain separate from site-verified TWL input and do not replace qualified field procedures.

## Free-tier and availability limitations

The MVP relies on provider availability and free-tier access. Rate limits, forecast horizons, model availability, and provider policies may change. Neither integration has an application-owned uptime guarantee or offline cache. The built-in deterministic demo scenario remains available without either service and is explicitly labeled as demo data.

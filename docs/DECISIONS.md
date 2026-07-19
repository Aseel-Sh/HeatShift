# Decisions

## Foundation decisions

| Decision | Rationale |
| --- | --- |
| Next.js App Router with strict TypeScript | Keeps UI and future server handlers in one typed application. |
| Tailwind CSS without a component framework | Supports a small, accessible design system without a large dependency. |
| Zod at external and untrusted boundaries | Makes future extraction and weather payload validation explicit. |
| Vitest for unit tests and Playwright for end-to-end tests | Separates fast deterministic checks from browser-level confidence. |
| No database or authentication | The MVP plans one crew and does not need accounts or server persistence. |
| AI only extracts structured plan data | Probabilistic output is isolated from safety decisions. |
| Deterministic safety engine | Restrictions and work/rest decisions must be explainable, reproducible, and testable. |
| Forecast and site-verified TWL are separate | Forecasts support advance planning; site-verified readings represent observed local conditions. |
| Built-in deterministic demo required | The core experience must remain demonstrable without AI, weather services, or secrets. |
| Qualified safety language only | The product provides guidance and cannot guarantee safety or regulatory compliance. |
| Discriminated guidance results | Hydration output distinguishes a planning range, a minimum, and preliminary guidance; work/rest output distinguishes continuous work, cycles, and preliminary guidance. |
| Stable source IDs in rule output | Rule results remain compact and deterministic while UI layers can resolve human-readable official source metadata separately. |
| End-exclusive midday time boundary | The restricted interval is represented as 12:00 inclusive to 15:00 exclusive, matching the requirement that work at 15:00 is permitted. |
| Five-minute discrete scheduler | Every current time and cycle rule divides into five-minute units, enabling exact capacity and overlap accounting. |
| Stable greedy scheduling | Fixed task priority, stable input-order ties, cooler-temperature ranking, and chronological final ties make results reproducible without an optimizer. |
| Separate restriction and crew occupancy masks | Direct-sun restrictions can overlap indoor work while crew work and rest remain mutually exclusive. |
| Provider-neutral extraction boundary | Business logic depends on a small chat-completions interface rather than a provider SDK. |
| OpenRouter free router by default | `openrouter/free` avoids paid-model defaults and routes to available free models supporting requested capabilities. |
| Double validation for AI output | Provider structured output constrains generation, while local Zod parsing remains the trusted boundary. |
| Fixed Open-Meteo city coordinates | Five supported city IDs resolve deterministically without maps, geocoding, or user-location tracking. |
| No weather fallback values | Empty, unavailable, malformed, or timed-out forecasts return typed errors instead of invented data. |
| Network-free demo service | The core scenario remains repeatable when provider access, credentials, or connectivity are unavailable. |
| Typed local workflow reducer | Explicit transitions keep the first workflow testable without a global state dependency. |
| Manual values take precedence | AI extraction fills gaps without silently replacing supervisor-entered plan details. |
| Internal bilingual dictionary | English/Arabic labels and RTL behavior work without an external translation service. |
| Weather failure remains preliminary | The UI offers forecast-only preliminary guidance or site-verified TWL entry without inventing weather. |

## Visual system

The shell uses a warm neutral background, deep navy text, and amber emphasis. Red is reserved for future critical-condition states. The interface avoids gradients, glass effects, stock imagery, chat patterns, and unnecessary motion.

## Deferred decisions

Production hosting remains deferred. The current scheduler intentionally remains a bounded single-crew greedy strategy rather than a general optimization framework.

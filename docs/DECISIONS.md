# Decisions

## Foundation decisions

| Decision | Rationale |
| --- | --- |
| Next.js App Router with strict TypeScript | Keeps UI and future server handlers in one typed application. |
| Tailwind CSS without a component framework | Supports a small, accessible design system without a large dependency. |
| Zod at external and untrusted boundaries | Makes future extraction and weather payload validation explicit. |
| Vitest for unit tests and Playwright for end-to-end tests | Separates fast deterministic checks from browser-level confidence. |
| No database or authentication | The MVP plans one crew and does not need accounts or server persistence. |
| Gemini only extracts structured plan data | Probabilistic output is isolated from safety decisions. |
| Deterministic safety engine | Restrictions and work/rest decisions must be explainable, reproducible, and testable. |
| Forecast and site-verified TWL are separate | Forecasts support advance planning; site-verified readings represent observed local conditions. |
| Built-in deterministic demo required | The core experience must remain demonstrable without Gemini, weather services, or secrets. |
| Qualified safety language only | The product provides guidance and cannot guarantee safety or regulatory compliance. |

## Visual system

The shell uses a warm neutral background, deep navy text, and amber emphasis. Red is reserved for future critical-condition states. The interface avoids gradients, glass effects, stock imagery, chat patterns, and unnecessary motion.

## Deferred decisions

Provider contracts, domain entities, Saudi rule sources, schedule algorithms, localization strategy, and production hosting will be decided in later iterations. No placeholder implementation in this foundation should constrain those choices.

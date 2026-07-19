# Architecture

## System shape

HeatShift is a single Next.js App Router application. The browser UI and any future server route handlers live in one deployable project. There is no separate backend, database, or authentication layer.

The intended future request flow is:

1. A supervisor describes one crew's plan.
2. Gemini extracts that text into a strictly validated structure; it does not make safety decisions.
3. The supervisor verifies the extracted tasks and manually entered site information.
4. Forecast conditions and site-verified TWL information remain visibly separate inputs.
5. A deterministic domain engine applies restrictions and work/rest rules.
6. The UI presents a safer shift plan and a planning report with clear limitations.

Only the application shell and module boundaries exist in this foundation iteration.

## Directory boundaries

- `app/`: layouts, pages, global styling, and future HTTP route handlers under `app/api/`
- `components/layout/`: shared application framing
- `components/plan/`: future plan description and verification UI
- `components/conditions/`: future forecast and site-verified TWL UI
- `components/schedule/`: future generated schedule UI
- `components/report/`: future planning report UI
- `lib/ai/`: future Gemini structured-extraction adapter
- `lib/domain/`: deterministic policy, scheduling rules, and shared schemas
- `lib/weather/`: future weather-provider adapter
- `lib/i18n/`: future English and Arabic message handling
- `data/`: versioned deterministic demo fixtures
- `tests/unit/`: fast deterministic tests
- `tests/e2e/`: browser-level user-flow tests

Dependencies point inward: UI and integrations may call the domain layer, while the domain layer must not import framework, AI, or weather-provider code. External payloads will be parsed with Zod at their boundaries.

## Data and privacy

No data is persisted server-side. The product handles one crew without worker names, medical data, or accounts. If temporary client state is introduced later, it must remain minimal and contain no sensitive personal data.

## Safety model

Gemini is limited to structured plan extraction. Forecast data informs advance planning, while manually verified on-site TWL data represents site conditions; the product must never collapse them into one concept. All restrictions, work/rest decisions, and schedule changes are deterministic and testable.

HeatShift provides planning guidance. It must never claim to guarantee safety or regulatory compliance.

# Architecture

## System shape

HeatShift is a single Next.js App Router application. The browser UI and any future server route handlers live in one deployable project. There is no separate backend, database, or authentication layer.

The intended future request flow is:

1. A supervisor describes one crew's plan.
2. A swappable AI provider extracts that text into a strictly validated structure; it does not make safety decisions.
3. The supervisor verifies the extracted tasks and manually entered site information.
4. City-center forecast data and the supervisor-entered TWL zone remain visibly separate inputs.
5. A deterministic domain engine applies restrictions and work/rest rules.
6. The UI presents a safer shift plan and a planning report with clear limitations.

The boundary schemas, source metadata, deterministic heat-planning rules, pure five-minute scheduler, server integrations, offline demo data, four-step workflow, and field-operations results board now exist.

## Directory boundaries

- `app/`: layouts, pages, global styling, and future HTTP route handlers under `app/api/`
- `components/layout/`: shared application framing
- `components/workflow/`: the client-side Describe, Verify, and Conditions workflow
- `components/plan/`: future plan description and verification UI
- `components/conditions/`: forecast and supervisor-entered TWL UI
- `components/schedule/`: future generated schedule UI
- `components/report/`: future planning report UI
- `lib/ai/`: provider-neutral extraction service, OpenRouter adapter, and extraction schemas
- `lib/domain/`: Zod boundary schemas, pure deterministic heat-planning rules, and the single-crew scheduler
- `lib/weather/`: Open-Meteo adapter and pure response normalization
- `lib/server/`: server environment validation and shared typed integration errors
- `lib/demo/`: network-free deterministic demo service
- `lib/workflow/`: typed local reducer and workflow validation
- `lib/i18n/`: future English and Arabic message handling
- `data/`: official source metadata, fixed city coordinates, and deterministic demo fixtures
- `tests/unit/`: fast deterministic tests
- `tests/e2e/`: browser-level user-flow tests

Dependencies point inward: UI and integrations may call the domain layer, while the domain layer must not import framework, AI, or weather-provider code. External payloads will be parsed with Zod at their boundaries.

## Data and privacy

No data is persisted server-side. The product handles one crew without worker names, medical data, or accounts. If temporary client state is introduced later, it must remain minimal and contain no sensitive personal data.

## Safety model

AI is limited to structured plan extraction. City-center forecast data informs advance planning, while a supervisor-entered TWL zone comes from a separate appropriate on-site assessment; HeatShift neither measures nor verifies TWL and must never collapse these concepts. All restrictions, work/rest decisions, schedule changes, hydration guidance, and briefings are deterministic and testable.

HeatShift provides planning guidance. It must never claim to guarantee safety or regulatory compliance.

## Domain rule API

The public domain entry point is `lib/domain/index.ts`. Current pure functions cover:

- seasonal and time-window evaluation for direct-sun, shaded outdoor, and conditioned-indoor work;
- forecast temperature categorization;
- TWL work/rest planning guidance;
- hydration planning as either a range, a minimum, or preliminary guidance;
- critical high-TWL conflicts for non-acclimatized workers;
- intermediate/high-TWL lone-work warnings; and
- deterministic five-minute task placement, crew-rest blocks, capacity conflicts, and schedule metrics.

Every rule result contains a stable source ID. Human-readable source metadata is stored separately in `data/official-sources.ts`; domain functions make no network calls.

The scheduler uses the existing rule functions rather than duplicating policy thresholds. Its public API and limitations are documented in `docs/SCHEDULER.md`.

## Server integration API

Plan import has a deterministic preprocessing stage. It parses recognizable schedule rows into normalized requested times, derived minute durations, activity kinds, timing preferences, and field-level evidence before OpenRouter is called. The provider may translate names or suggest unverified workload/environment/splitting values, but it cannot replace parser-backed timing or authoritative form context.

`POST /api/parse-plan` and `GET /api/weather` are thin HTTP adapters. They validate request boundaries, invoke server-only services, and map internal failures to typed responses without stack traces. OpenRouter output and Open-Meteo payloads are both locally validated before use. Integration setup and failure behavior are documented in `docs/INTEGRATIONS.md`.

## Client workflow

One typed React reducer owns plan fields, verified tasks, extraction notes, conditions, forecast status, language, and the basic result invocation. Manual values already entered by the supervisor take precedence over overlapping extracted values. Demo loading bypasses both APIs, and only the local deterministic scheduler is called by Generate.

## Verification and provenance boundaries

The draft activity model distinguishes work, breaks, and meals. Work requires verified workload, environment, and splitting permission. Breaks and meals retain requested timing, duration, and supervisor-controlled recovery eligibility without being converted into fake work. Only verified work activities cross the existing `ShiftPlan` scheduler boundary in this iteration; the scheduler algorithm itself is unchanged.

`DraftWorkTask` is intentionally distinct from validated `WorkTask`. Drafts can retain unknown AI fields and optional original requested times; conversion occurs only after form validation. `evaluateOriginalPlan` is a pure evaluator whose `OriginalPlanConflict[]` never contains scheduler-capacity or worker-readiness findings. Sample plan, sample forecast, live forecast, AI-extracted, manual, and supervisor-entered TWL provenance are tracked explicitly. Material sample edits invalidate sample-derived forecast, conditions, and results.

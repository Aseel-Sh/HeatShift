# Progress

## Foundation iteration

Status: complete.

- Next.js App Router project with strict TypeScript
- Responsive HeatShift application shell
- Tailwind CSS, Zod, Vitest, Playwright, and Lucide React foundations
- Architecture, product scope, decision, and environment documentation

## Deterministic domain rules iteration

Status: complete on 2026-07-18.

Implemented:

- Zod schemas and inferred types for cities, tasks, plans, site conditions, forecast hours, and conflicts
- Stable metadata records for the 2026 Saudi midday restriction and NCOSH temperature/TWL guidance
- Pure seasonal midday restriction evaluation with direct-sun, shaded outdoor, and indoor outcomes
- Pure forecast temperature categorization at every requested boundary
- Pure TWL work/rest guidance for every zone and workload combination
- Hydration planning results that distinguish ranges, minimums, and preliminary guidance
- Critical high-TWL conflict for non-acclimatized workers
- Intermediate/high-TWL lone outdoor work warning
- Public domain entry point at `lib/domain/index.ts`

Validation:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, 6 files and 45 tests
- `npm run build` — passed
- Domain import audit — no React, Next.js, AI, network calls, or remote URLs in `lib/domain`
- Safety-language audit — none of the prohibited phrases are present

Deferred by that iteration's scope:

- Scheduler and task placement
- Gemini integration
- Weather fetching
- Full planning workflow UI
- Deterministic demo fixture

Blockers: none.

## Describe, verify, and conditions workflow iteration

Status: complete on 2026-07-18.

Implemented:

- Typed local reducer for plan fields, editable tasks, language, extraction metadata, conditions, forecast status, and a basic schedule result
- Responsive Describe form with inline validation, AI loading/errors, manual task creation, and deterministic demo loading
- AI extraction through `/api/parse-plan` while preserving already-entered manual fields
- Editable bilingual task cards with duration, workload, environment, split, add, and delete controls
- Conditions screen with hourly forecast, peak/category summary, explicit failure path, and site-verified TWL selection
- Local deterministic scheduler invocation with a deliberately basic completion summary
- Functional English/Arabic dictionary toggle and document-level RTL direction
- Accessible labels, associated errors, visible focus, and loading/disabled controls
- Cross-platform Playwright server ownership and reliable teardown

Validation:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, 13 files and 84 tests
- `npm run test:e2e` — passed, 7 tests
- E2E integration calls are mocked; the demo test asserts that neither API is called

Deferred by scope:

- Polished schedule results and report screen
- Persistence, authentication, uploads, worker-level assignment, or live monitoring

Blockers: none. A Gemini key is optional for demo/manual use and required only for live AI extraction.

## Deterministic scheduler iteration

Status: complete on 2026-07-18.

Implemented:

- Zod-validated schedule blocks, unscheduled tasks, metrics, hydration planning, and schedule results
- Five-minute same-day shift slots with validation for slot-aligned inputs
- Seasonal midday direct-sun restriction masks that still allow indoor and shaded work
- Stable six-level task priority and input-order tie breaking
- Cooler forecast-hour preference for direct-sun work
- Midday preference for indoor work during the active restriction season
- Contiguous non-splittable tasks and divisible splittable tasks
- Deterministic TWL work/rest packages with one-crew rest occupancy
- Cross-task outdoor rest continuity and no unnecessary final rest
- Exact partial-capacity and unscheduled-minute reporting
- Critical `INSUFFICIENT_SAFE_CAPACITY` conflicts
- Preliminary results when no site-verified TWL zone is selected
- Schedule metrics, hydration planning, reason codes, and deterministic explanations
- Algorithm documentation in `docs/SCHEDULER.md`

Validation:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, 7 files and 63 tests
- `npm run build` — passed
- `git diff --check` — passed
- Purity audit — no React, Next.js, AI, network, database, clock, or random-number use in `lib/domain`
- Safety-language audit — none of the prohibited phrases are present

Deferred by that iteration's scope:

- Gemini integration
- Weather network calls
- Full workflow UI
- Worker-level assignment or parallel crews
- Deterministic demo fixture

Blockers: none.

## Server integrations and demo iteration

Status: complete on 2026-07-18.

Implemented:

- Server-only `@google/genai` structured plan extraction service
- Locally validated extraction schema, model instructions, assumptions, and missing-information output
- `POST /api/parse-plan` with JSON-only input, meaningful-length validation, 5000-character text limit, 10 KiB body limit, disconnect/timeout aborts, and typed errors
- Graceful `AI_NOT_CONFIGURED` behavior when `GEMINI_API_KEY` is absent
- Fixed coordinates for Riyadh, Jeddah, Dammam, Mecca, and Medina
- Open-Meteo hourly retrieval using the `Asia/Riyadh` timezone
- Strict normalization into `ForecastHour[]` without fallback or fabricated values
- `GET /api/weather` validation and typed unavailable, empty, range, and timeout errors
- Explicitly labeled deterministic Riyadh demo fixture and network-free internal service
- Integration setup, security boundaries, fields, failure behavior, and free-tier limitations in `docs/INTEGRATIONS.md`

Validation:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, 12 files and 80 tests
- `npm run build` — passed, including both dynamic API routes
- `git diff --check` — passed
- Automated integration tests use injected fake clients or mocked fetch implementations; no external network calls
- Security audit — no browser-exposed Gemini variable, plan-text logging, API-key logging, or stack-trace responses

Deferred by scope:

- Complete multi-step workflow UI
- Authentication, persistence, uploads, or worker-level assignment

Blockers: none.

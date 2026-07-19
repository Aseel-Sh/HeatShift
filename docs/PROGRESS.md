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
- Pure seasonal midday restriction evaluation with direct-sun, shaded outdoor, and conditioned-indoor outcomes
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
- AI extraction integration
- Weather fetching
- Full planning workflow UI
- Deterministic demo fixture

Blockers: none.

## Correctness and product-integrity repair

- Added nullable/blank `DraftWorkTask` safety fields with validation-gated `WorkTask` conversion.
- Retained optional original requested task times through extraction, editing, fixtures, evaluation, and reporting.
- Added pure original-plan evaluation and separated its findings from capacity, readiness, and rules applied.
- Preserved explicitly entered zero values while allowing untouched blanks to receive AI-extracted values.
- Invalidated sample-derived weather, conditions, and results on material edits; edited city/date drives the next request.
- Added monotonic task IDs and regression coverage for add/delete/add mapping integrity.
- Renamed the environment to `conditioned_indoor`, added bilingual clarification, and excluded it from outdoor TWL cycles.
- Replaced misleading “Conflicts resolved” and stale deferred-results wording; sample/live/manual/AI/TWL provenance is visible.
- Expanded unit and Playwright regression coverage for every repair above.

Final acceptance: lint passed; strict typecheck passed; 104 unit tests across 16 files passed; 35 Playwright tests passed; production build passed. Blockers: none.

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

Blockers: none. An OpenRouter key is optional for demo/manual use and required only for live AI extraction.

## Deterministic scheduler iteration

Status: complete on 2026-07-18.

Implemented:

- Zod-validated schedule blocks, unscheduled tasks, metrics, hydration planning, and schedule results
- Five-minute same-day shift slots with validation for slot-aligned inputs
- Seasonal midday direct-sun restriction masks that still allow conditioned-indoor and shaded work
- Stable six-level task priority and input-order tie breaking
- Cooler forecast-hour preference for direct-sun work
- Midday preference for conditioned-indoor work during the active restriction season
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

- AI extraction integration
- Weather network calls
- Full workflow UI
- Worker-level assignment or parallel crews
- Deterministic demo fixture

Blockers: none.

## Server integrations and demo iteration

Status: complete on 2026-07-18.

Implemented:

- Server-only structured plan extraction service
- Locally validated extraction schema, model instructions, assumptions, and missing-information output
- `POST /api/parse-plan` with JSON-only input, meaningful-length validation, 5000-character text limit, 10 KiB body limit, disconnect/timeout aborts, and typed errors
- Graceful `AI_NOT_CONFIGURED` behavior when the AI key is absent
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
- Security audit — no browser-exposed AI variable, plan-text logging, API-key logging, or stack-trace responses

Deferred by scope:

- Complete multi-step workflow UI
- Authentication, persistence, uploads, or worker-level assignment

Blockers: none.

## OpenRouter migration and results iteration

Status: complete on 2026-07-19.

Implemented:

- Provider-neutral AI extraction interface with an OpenRouter OpenAI-compatible adapter
- `openrouter/free` default, server-only environment validation, strict structured output, local Zod validation, and friendly rate-limit/provider failures
- Removed the provider-specific SDK and all legacy provider configuration
- Polished Before/After results report using only deterministic scheduler output
- Chronological work, recovery, restriction, and unscheduled timeline with visible reason details
- Capacity and non-acclimatized-worker critical warnings
- Forecast-only versus site-verified TWL/cycle distinction
- Crew hydration minimum/range derived from scheduled outdoor exposure without turning minimum guidance into an exact prescription
- Deterministic English and Arabic supervisor briefings
- Official source references without endorsement language
- Edit, conditions, recalculate, start-over, and browser-print actions
- Print stylesheet retaining warnings, sources, schedule, hydration details, and briefing in black and white
- Sample fixture coverage for the midday restriction, cooler heavy work, 20/40 cycles, conditioned-indoor midday placement, new-worker warning, and unscheduled capacity

Validation:

- Provider, report-model, scheduler, workflow, and route unit coverage
- Ten results E2E scenarios plus the existing workflow suite, with integrations mocked
- Full lint, strict typecheck, unit, browser, production build, and diff checks completed

Blockers: none. Live AI extraction requires an optional server-only `OPENROUTER_API_KEY`; demo and manual paths require no key.

## Adversarial QA and reliability iteration

Status: complete on 2026-07-19.

Implemented and verified:

- Full severity-ranked before/after audit in `docs/QA_REPORT.md`
- Text-first AI extraction without requiring duplicate manual entry
- Untouched extracted shift values no longer overridden by placeholder times
- Missing AI task duration remains visibly invalid instead of becoming an invented five-minute value
- Programmatically linked form/task errors with `aria-invalid` and alert semantics
- Failure-only Playwright screenshots, traces, and videos
- Focused E2E argument forwarding and support for inspecting an already-running app
- Adversarial AI, weather, form, responsive, keyboard, refresh, duplicate-action, console, network, and safe-rendering browser coverage
- Exact noon/15:00, entirely restricted shift, multiple-heavy-task, capacity, and preliminary scheduler edge coverage
- Repository, browser bundle, logging, input-limit, and tracked-secret audits

Final status:

- No critical issue remains
- No high issue remains
- Demo and manual workflows complete reliably
- Demo workflow produces no console error, page error, failed network request, or uncaught error
- `npm run lint`, `npm run typecheck`, and `npm run build` pass
- `npm run test` passes: 96 tests across 15 files
- `npm run test:e2e` passes: 33 browser tests
- One medium limitation remains documented: local reducer state resets on browser refresh

Blockers: none.

# Progress

## Final product-design and usability iteration — 2026-07-19

- Added an original reusable sun-and-shift-bar SVG mark, language-specific horizontal wordmarks, and an SVG app icon.
- Rebuilt task review around compact alternating primary rows and expandable secondary details with actionable status controls and Apply/Dismiss suggestion chips.
- Consolidated indoor/work-area guidance into one page-level help panel.
- Converted extraction assumptions and missing-information output to validated bilingual records.
- Added the requested-versus-selected change table and reordered results around outcome, required supervisor actions, and operational explanations.
- Replaced the static letter key with conditional block-matching swatches and reduced the Forecast context ribbon height.
- Moved candidate count, strategy, movement, and splits to the final collapsed technical section.
- Audited the English and Arabic production flows, including singular wordmarks, RTL result content, translated operational copy, mobile containment, and print behavior.
- Updated unit and E2E coverage to exercise the intentional expand/collapse interaction instead of assuming all secondary controls are always visible.

## Operational validity and result comprehension repair

Status: implemented and production-browser verified on 2026-07-19.

- Connected the exact sentence “Need concrete completed today.” to Concrete's visible must-complete state and evidence; retained “Pump booked only today.” only as an operational note with no invented clock window.
- Added reviewable work-only predecessor suggestions, confirmation controls, arbitrary add/remove support, and circular/invalid dependency rejection.
- Enforced partial-predecessor blocking and retained exact dependency-blocked minutes.
- Changed `hardConstraintViolations` from a count to validator codes, rejected invalid candidates before scoring selection, and suppressed invalid schedule display.
- Improved requested-time preservation ahead of indoor-midday preference and added a deterministic meal-at-midday candidate that creates valid must-complete capacity.
- Added the deterministic Plan outcome, separate forecast-category and applied-TWL labels, explicit low/no-TWL recovery wording, separate untimed and unscheduled sections, and human-readable candidate explanation.
- Added exact-plan unit and production Playwright coverage plus dependency, circularity, partial predecessor, calendar-chain, hard-validity, must-priority, evidence, and bilingual-result assertions.

Verified exact low-TWL sequence: Toolbox 06:00–06:30; Excavation 06:30–09:00; Break 09:00–09:15; Rebar/Forms 09:15–11:30; Concrete 11:30–12:00; Lunch 12:00–12:30; idle/restricted direct-sun period 12:30–15:00; Concrete 15:00–16:00. Concrete has 60 minutes unscheduled; Finish/Curing has 30 minutes dependency-blocked; Cleanup has 60 minutes dependency-blocked.

Final verification: lint passed; strict typecheck passed; 193 unit tests passed across 25 files; exact regression Playwright passed; production build passed. Full Playwright was rerun after the final legacy-copy assertion update.

## Requested-versus-safer timeline repair

Status: implemented on 2026-07-19; final verification recorded below.

- Added Fit shift, 1 hour, and 30 minute timeline scales with internal horizontal scrolling and page-overflow protection.
- Replaced stacked requested blocks with one activity row per requested interval and a genuinely-untimed list.
- Added one chronological crew lane for work, recovery, break, meal, idle, and separately listed unscheduled work.
- Linked requested activities to every generated task and recovery interval; the details panel now lists all planned intervals.
- Replaced minute-only report values with human-readable durations.
- Added a forecast heat ribbon aligned to the shift ruler with numeric, categorical, hover, and screen-reader information.
- Reduced restriction-band prominence and retained a light monochrome print hatch with one visible label.
- Expanded block details with timing, must-complete status, operational notes, specific movement explanations, sources, and optimization consequences.
- Added optimization summary values without introducing a safety score.
- Added timeline display-model unit coverage, responsive/browser assertions, and repeatable visual-QA captures.

Final verification:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — 187/187 passed across 25 files
- `npm run test:e2e` — 44/44 passed
- `npm run build` — passed
- In-app browser audit — no document-level horizontal overflow and no console errors during the sample workflow

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
- Conditions screen with hourly forecast, peak/category summary, explicit failure path, and supervisor-entered TWL selection
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
- Preliminary results when no supervisor-entered TWL zone is selected
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

## Product-integrity release controls iteration

Status: complete on 2026-07-19.

Implemented:

- Versioned the Saudi midday restriction with full 2026 effective dates; other years retain ordinary scheduling but show regulatory guidance unavailable and preliminary.
- Replaced verification claims with “Supervisor-entered TWL zone” and an explicit statement that HeatShift neither measures nor verifies TWL.
- Added intermediate warnings and high critical findings for non-acclimatized workers, with zero/one/multiple-worker coverage in every TWL zone.
- Replaced exact-looking crew hydration totals with configured per-worker/per-hour ranges or minimums.
- Repeated cyclic package placement across separate safe windows with exact partial-capacity accounting.
- Scoped forecast maxima and risk categories to the selected shift and added city-center forecast provenance metadata.
- Enforced OpenRouter provider parameters, captured the actual returned model for a neutral review notice, and limited retry to one invalid structured response.
- Added push/pull-request CI, failure-safe Playwright execution, a CI badge, and ignored TypeScript incremental build state.

Focused source audit:

- `saudi-midday-work-ban-2026` supports only the configured 2026 seasonal dates and midday direct-sun restriction; it is not used as evidence for 2027.
- `ncosh-outdoor-temperature-indicator` supports only the configured outdoor-temperature categories.
- `ncosh-twl-work-rest-hydration` supports only the configured TWL cycles and rate-based hydration guidance.
- No new regulation, endorsement, or medical claim was introduced.

Validation:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, 124 tests across 18 files
- `npm run test:e2e` — passed, 35 browser tests
- `npm run build` — passed, including both dynamic API routes
- Focused terminology, source-metadata, generated-file, and diff audits — passed

Blockers: none. `OPENROUTER_API_KEY` remains optional and is needed only for live plan extraction; demo and manual planning require no key.

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
- Forecast-only versus supervisor-entered TWL/cycle distinction
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

## Field operations board redesign

Status: complete on 2026-07-19.

Implemented:

- Reframed the existing workflow as a compact field-operations planning board without changing deterministic domain behavior
- Operational header with live site, date, crew, workflow status, and bilingual controls
- Structured shift setup workspace with a concise summary rail and subdued plan-import assistance
- Desktop task operations table that becomes accessible stacked task panels on tablet and phone widths
- Separate forecast context and supervisor-entered TWL controls, including translated temperature-risk categories
- Aligned requested-versus-safer time board with a shared ruler, background restriction bands, scheduled work, recovery, indoor work, and unscheduled capacity
- Clickable schedule-block details with plain-language bilingual rule explanations and source references instead of internal reason codes
- Compact results metrics, critical operational warnings, responsive containment, Arabic RTL layout with LTR chronology, and black-and-white print rules
- A documented visual system in `docs/DESIGN_SYSTEM.md`
- Production browser review artifacts for 390x844, 768x1024, and 1440x900 layouts under `artifacts/ui-review/`

Regression coverage:

- Restriction bands are verified as visual constraints rather than sequential schedule blocks
- Internal reason codes are verified absent from operator-facing details
- City/date changes clear stale weather metadata
- Responsive workflow, bilingual mode, deterministic scheduling, failure paths, and print layout remain covered by the existing suites

Blockers: none. Live AI extraction remains optional and requires a server-only `OPENROUTER_API_KEY`; the sample and manual workflows require no key.

## Manual release ownership review

Status: completed on 2026-07-19 for the local production build.

- Completed real-browser release journeys before automated regression and recorded evidence in `artifacts/manual-qa/`
- Verified live Open-Meteo data for all five cities and exact upstream parity for Riyadh and Jeddah
- Identified free-router latency and hallucinated absent facts during live OpenRouter testing
- Increased the provider timeout to 30 seconds, strengthened extraction instructions, and added a conservative source-evidence guard
- Revised first-time setup copy to state the product outcome and manual/import paths immediately
- Removed fixable dependency advisories; two moderate Next.js/PostCSS advisories remain without a safe non-breaking npm resolution
- Added `docs/MANUAL_QA_REPORT.md` with manual/automated evidence kept separate
- Final regression: lint, strict typecheck, 126 unit tests, 36 browser tests, and production build pass

Release note: the deterministic sample demo is suitable for local recording. Live AI remains too variable for the recorded demo, and no deployed application was tested.

## Context-aware work-plan import repair

Status: complete on 2026-07-19.

Baseline before editing: lint and strict typecheck passed; 126 unit tests across 18 files passed; 36 Playwright tests passed; production build passed.

Implemented:

- Added authoritative shift-form context to `POST /api/parse-plan` and to browser requests; populated form values win and suppress resolved missing-information messages.
- Added a pure structured-row parser for dash variants, English/Arabic numerals, 12/24-hour inputs, sequential half-day inference, noon rollover, ambiguity reporting, normalized times, and derived durations.
- Made structured-row import available without OpenRouter and as a deterministic fallback when provider enrichment fails.
- Added work, break, and meal draft activity kinds; break/meal recovery eligibility is supervisor-controlled and no fake workload or environment is assigned.
- Added must-complete flags, operational notes, and flexible/preferred/fixed timing preferences without inventing equipment times.
- Replaced whole-document task evidence with per-field source-line provenance and separated inferred workload/environment/splitting suggestions from verified values.
- Added human-readable duration labels, visible suggestion controls, evidence details, and a complete shift-attention panel that returns focus to the first invalid setup field.
- Preserved the existing scheduler and results-timeline algorithm; only verified work activities cross the current `ShiftPlan` boundary.

Regression coverage includes the exact eight-activity construction plan, all requested time syntaxes and rollovers, Arabic city/time aliases, distinct crew/new-worker counts, contextual precedence, field evidence, non-work activity behavior, suggestions, duration display, and missing-shift focus handling.

Final validation: lint passed; strict typecheck passed; 152 unit tests across 20 files passed; 38 Playwright tests passed; production build passed; diff check passed.

Blockers: none. OpenRouter remains optional for structured schedule rows and required only to enrich unstructured prose imports.

## Saudi location search and coordinate weather

Status: complete on 2026-07-19.

Baseline before editing: lint and strict typecheck passed; 152 unit tests across 20 files passed; 38 Playwright tests passed; production build passed.

Implemented:

- Replaced the production `SaudiCity` plan field with a required, Zod-validated `SiteLocation` containing name, optional region, Saudi country code, coordinates, timezone, and provenance.
- Kept Riyadh, Jeddah, Dammam, Mecca, and Medina as keyboard-accessible quick presets and deterministic demo/offline fallbacks.
- Added debounced English/Arabic Saudi place search through `GET /api/locations`, including upstream validation, Saudi-only filtering, eight-result cap, timeout handling, brief successful-result caching, and typed errors.
- Added a keyboard-operable combobox result list, selected-location coordinate summary, and clear/change action without adding a map or location tracking.
- Changed `GET /api/weather` to accept and return selected location name, latitude, longitude, timezone, date, and retrieval time. No hardcoded city lookup occurs for geocoded weather.
- Retained the complete requested day's hourly data for scheduler lookup, including the 06:00 point used by a 06:30 slot, while keeping display and peak metrics shift-scoped.
- Added the normalized `ForecastDisplayPoint` model for later timeline use and visible Open-Meteo attribution.
- Changing a location or date clears stale weather and derived sample state; the demo remains completely network-free.

Regression coverage includes Arabic Riyadh and English neighborhood searches, Saudi-only filtering, empty/malformed/timeout geocoding responses, quick presets, coordinate weather requests, stale-weather invalidation, previous-hour slot lookup, shift-scoped peaks, and the network-free demo.

Final validation: lint passed; strict typecheck passed; 166 unit tests across 23 files passed; 40 Playwright tests passed; production build passed.

Blockers: none. OpenRouter remains optional; Open-Meteo location and weather calls require network access but no API key.

## Deterministic bounded schedule optimization

Status: complete on 2026-07-19.

Baseline before editing: lint and strict typecheck passed; 166 unit tests across 23 files passed; 40 Playwright tests passed; production build passed.

Implemented:

- Replaced the single-result claim with a selected safer schedule chosen from six deterministic candidate strategies.
- Added the public `OptimizationSummary`, ordered candidate score vector, stable strategy selection, and explicit non-global claim boundary.
- Preserved work, break, and meal activities through the verified workflow into the scheduler; all occupy the one crew.
- Added fixed, preferred, and flexible activity placement; must-schedule priority; operational-note explanation; and confirmed finish-to-start dependencies.
- Added chronological crew-level recovery validation across task boundaries and conditioned-indoor exclusion from outdoor TWL cycles.
- Allowed explicitly eligible breaks/meals to satisfy partial or complete recovery without adding duplicate recovery blocks; unknown or ineligible activities receive no credit.
- Added explicit critical infeasibility for fixed or must-schedule activities that cannot fit without breaking a hard constraint.
- Added bounded movement, ordering swaps, adjacent-block merging, eligible-recovery alignment, and safe-gap filling across candidate construction.
- Added the exact confirmed construction regression fixture. This historical result was superseded by the release regression below after the concrete pour was confirmed non-splittable and predecessor links were entered.
- Changed results language to “Selected safer schedule” and visibly reports “Selected from 6 deterministic candidate schedules.”
- Added `docs/OPTIMIZATION.md` and updated scheduler, architecture, scope, decisions, and README documentation.

Regression result:

- Candidates evaluated: 6
- Selected strategy: `critical_must_schedule_first`
- Hard-constraint violations: 0
- Unscheduled must-schedule work: 0 minutes
- Other unscheduled work: 355 minutes
- Movement: 535 minutes
- Splits: 9
- Original-order inversions: 4
- Forecast heat-exposure penalty: 0 for the network-free regression fixture

Final validation: lint passed; strict typecheck passed; 183 unit tests across 24 files passed; 40 Playwright tests passed; production build passed.

Blockers: none. The bounded search is deterministic and explainable but does not claim global optimality.

## Exact production work-plan release regression

Status: complete on 2026-07-19.

- Replayed the supplied North utility site plan from import through results against an optimized production build in Chromium.
- Verified live Riyadh location search and retained coordinates; used deterministic intercepted weather for repeatable schedule evidence.
- Found and fixed two release blockers: missing predecessor-confirmation controls and must-schedule cycle placement bypassing a non-splittable constraint.
- Added editable finish-to-start dependency controls and dangling-reference cleanup on task deletion.
- Corrected the scheduler so non-splittable must-schedule work is either placed as a valid contiguous activity or reported wholly unscheduled.
- Added exact production E2E evidence for import, classification, dependencies, schedule rules, linked intervals, mobile containment, Arabic RTL, and print media.
- Added a fixed concrete-pump-window infeasibility unit regression.
- Added `docs/REGRESSION_WORK_PLAN_QA.md` with manual observations, automated proof boundaries, exact import/schedule output, candidate comparison, operational/UI concerns, screenshots, and release judgment.

Corrected regression result: 6 candidates evaluated; `critical_must_schedule_first` selected by deterministic tie break; 0 hard violations; 150 must-schedule minutes and 250 other minutes unscheduled; 390 movement minutes; 6 splits; 3 order inversions; 0 heat penalty. All candidate strategies tied on the exposed score.

Final validation: lint passed; strict typecheck passed; 188 unit tests across 25 files passed; 45 Playwright tests passed; optimized production build passed. The exact production-browser regression also passed against the final build.

Blockers: no code/test blocker remains. The confirmed plan remains operationally infeasible and therefore requires supervisor intervention; this is the expected honest product outcome, not a release-test failure.

## Final timeline release polish

Status: complete on 2026-07-19.

- The detailed timeline now defaults to `1 hour` at viewport widths of 768 px and above, while mobile continues to default to `Fit shift`.
- Added concise bilingual scale guidance, retained the three existing scale controls, increased requested-lane height, and strengthened the shared selected-state treatment without changing represented durations.
- Kept horizontal scrolling inside the timeline, with sticky requested labels and a sticky time ruler where supported by the scrolling region.
- Made requested-plan outcome wording consult the configured midday-restriction evaluator before attributing a move to the 12:00–15:00 restriction.
- Added boundary coverage for 2026-07-20, 2026-06-14, 2026-09-16, and unsupported 2027-07-20 dates.
- Corrected the current Arabic setup assumption to `سياق توقعات الإحداثيات المحددة`.
- Captured the focused desktop, tablet, mobile, Arabic, and print evidence under `artifacts/final-timeline-polish/`.

Final validation: lint passed; strict typecheck passed; 197 unit tests across 26 files passed; 45 Playwright tests passed; optimized production build passed. Production-browser checks at 1440×900, 768×1024, and 390×844 found no page-level overflow or console warnings/errors.

Blockers: none.

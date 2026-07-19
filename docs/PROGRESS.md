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

Deferred by scope:

- Gemini integration
- Weather network calls
- Full workflow UI
- Worker-level assignment or parallel crews
- Deterministic demo fixture

Blockers: none.

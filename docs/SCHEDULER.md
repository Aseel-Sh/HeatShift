# Deterministic scheduler

## Purpose and boundaries

The HeatShift scheduler converts one validated `ShiftPlan`, one `SiteConditions` value, and zero or more `ForecastHour` records into a deterministic `ScheduleResult`. It evaluates a bounded set of candidate schedules and returns a selected safer schedule. It is a pure TypeScript planning component: it performs no network calls, persistence, AI inference, worker assignment, or medical calculation.

Callers must parse form or API input with the existing Zod schemas before calling `generateSchedule`.

## Why five-minute slots

Five minutes is the smallest interval needed by the current rules: all required work/rest cycles and the midday boundary divide evenly into five-minute units. Discrete slots make overlap prevention, capacity accounting, and boundary tests straightforward and reproducible without floating-point time arithmetic.

Shift times and task durations must align to five minutes. Overnight and zero-length shifts are rejected for this MVP rather than being interpreted across dates.

## Candidate construction heuristics

The original environment/workload order remains one construction heuristic, retaining input order for ties:

1. Direct-sun heavy
2. Direct-sun light
3. Shaded-outdoor heavy
4. Shaded-outdoor light
5. Indoor heavy
6. Indoor light

It is not the final selection score. Must-schedule capacity, requested timing, movement, splitting, original order, forecast exposure, indoor-midday use, completion time, and idle gaps are evaluated across six deterministic strategies as documented in `docs/OPTIMIZATION.md`.

## Bounded candidate strategy

The scheduler follows these deterministic steps:

1. Create every five-minute slot from shift start, inclusive, to shift end, exclusive.
2. When the full date is within the configured 2026 restriction period and the plan contains direct-sun work, create a 12:00–15:00 direct-sun restriction mask clipped to the shift. This mask does not consume crew capacity, so conditioned-indoor and shaded work may still use those slots. Other years are not assumed to use the 2026 rule; ordinary scheduling remains available and the result is marked preliminary with regulatory guidance unavailable.
3. Construct candidates using must-schedule-first, requested-order, coolest-direct-sun, minimum-splitting, minimum-movement, and indoor-midday strategies.
4. For direct-sun work with forecast records, rank valid candidates by lower forecast temperature and then earlier time.
5. For conditioned-indoor work during an active seasonal restriction, rank midday candidates before other times. Conditioned-indoor work does not receive outdoor TWL recovery cycles.
6. Keep non-splittable work contiguous. Splittable work may occupy multiple blocks.
7. Carry TWL exposure and recovery chronologically across every outdoor work block. Rest consumes the one crew's capacity. A final rest is omitted only when no further outdoor work follows.
8. For splittable cyclic work, place the largest valid package, subtract its work minutes, search again across all remaining valid windows, and repeat deterministically. If only partial capacity remains, schedule only genuine work capacity and report the exact remaining minutes. A non-splittable task is either scheduled in full or left unscheduled.
9. Preserve breaks and meals as crew activities. Only explicitly eligible activities may receive recovery credit, and credited time is not duplicated as a separate rest block.
10. Enforce confirmed finish-to-start dependencies. A successor cannot begin until every scheduled minute of each predecessor is complete; if a predecessor is partly unscheduled, the successor is dependency-blocked and its full remaining duration is reported.
11. Apply bounded move, swap, merge, recovery-alignment, and safe-gap filling behavior. A preferred meal may move into the restricted outdoor period in the indoor-midday candidate when doing so creates valid must-complete capacity.
12. Run the global chronological hard-constraint validator over each candidate, retain its exact violation codes, reject every invalid candidate regardless of score, and select the lowest ordered score only from valid candidates.
13. Merge adjacent slots of the same activity and type into blocks, calculate metrics, and emit deterministic conflicts for remaining activities.

Every work and rest block includes reason codes. When no supervisor-entered TWL zone is supplied, the result is marked preliminary and no precise cycle is generated.

The final validator checks single-crew overlap, shift boundaries, direct-sun restriction overlap, chronological TWL recovery, fixed-time movement, non-splittable fragmentation, invalid dependency graphs, predecessor completion, and finish-to-start order. `hardConstraintViolations: []` is therefore evidence that the selected candidate passed the configured checks, not a claim of legal compliance or guaranteed safety.

## Determinism

The engine uses fixed candidate strategies, stable input-order tie breaking, numeric temperature comparisons, chronological validation, an ordered score vector, and deterministic block IDs. It uses no randomness, external optimizer, mutable global state, clock, network, or AI. Identical inputs therefore produce deeply equal outputs.

## Known limitations

- One crew only; crew work and rest cannot overlap.
- Same-day shifts only; overnight shifts are rejected.
- Five-minute input granularity is required.
- The bounded multi-candidate search does not claim a globally optimal arrangement.
- Forecast records influence ordering but are not TWL measurements and are filtered to the selected shift for displayed maxima and risk categories.
- The scheduler does not assign individual workers or model parallel crews.
- The scheduler does not fetch forecasts or verify field conditions.
- The results UI says “Selected safer schedule” and reports the candidate count; it does not turn bounded selection into a claim of global optimality.

## Safety and regulatory language

This module produces planning guidance for a safer plan. It applies the configured deterministic rules to supplied inputs, but it is not a legal compliance engine and does not establish that a schedule is safe or compliant. Supervisors must verify site conditions and applicable requirements through qualified procedures.

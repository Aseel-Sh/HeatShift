# Deterministic scheduler

## Purpose and boundaries

The HeatShift scheduler converts one validated `ShiftPlan`, one `SiteConditions` value, and zero or more `ForecastHour` records into a deterministic `ScheduleResult`. It is a pure TypeScript planning component: it performs no network calls, persistence, AI inference, worker assignment, or medical calculation.

Callers must parse form or API input with the existing Zod schemas before calling `generateSchedule`.

## Why five-minute slots

Five minutes is the smallest interval needed by the current rules: all required work/rest cycles and the midday boundary divide evenly into five-minute units. Discrete slots make overlap prevention, capacity accounting, and boundary tests straightforward and reproducible without floating-point time arithmetic.

Shift times and task durations must align to five minutes. Overnight and zero-length shifts are rejected for this MVP rather than being interpreted across dates.

## Priority order

Tasks are considered in this fixed order, retaining input order when two tasks have the same priority:

1. Direct-sun heavy
2. Direct-sun light
3. Shaded-outdoor heavy
4. Shaded-outdoor light
5. Indoor heavy
6. Indoor light

## Greedy strategy

The scheduler follows these deterministic steps:

1. Create every five-minute slot from shift start, inclusive, to shift end, exclusive.
2. When the date is inside the seasonal restriction and the plan contains direct-sun work, create a 12:00–15:00 direct-sun restriction mask clipped to the shift. This mask does not consume crew capacity, so indoor and shaded work may still use those slots.
3. Sort tasks by the fixed priority order.
4. For direct-sun work with forecast records, rank valid candidates by lower forecast temperature and then earlier time.
5. For indoor work during an active seasonal restriction, rank midday candidates before other times.
6. Keep non-splittable work contiguous. Splittable work may occupy multiple blocks.
7. Convert TWL cycle guidance into contiguous work/rest packages. Rest consumes the one crew's capacity. A final rest is omitted only when no further outdoor work follows.
8. If a full splittable cycle package cannot fit, use the largest valid partial package and report the exact remaining minutes. A non-splittable task is either scheduled in full or left unscheduled.
9. Merge adjacent slots of the same task and type into blocks, calculate metrics, and emit deterministic conflicts for remaining work.

Every work and rest block includes reason codes. When no site-verified TWL zone is supplied, the result is marked preliminary and no precise cycle is generated.

## Determinism

The engine uses fixed task priorities, stable input-order tie breaking, numeric temperature comparisons, chronological tie breaking, and deterministic block IDs. It uses no randomness, external optimizer, mutable global state, clock, network, or AI. Identical inputs therefore produce deeply equal outputs.

## Known limitations

- One crew only; crew work and rest cannot overlap.
- Same-day shifts only; overnight shifts are rejected.
- Five-minute input granularity is required.
- The greedy strategy does not claim a globally optimal arrangement.
- Forecast records influence ordering but are not site-verified TWL measurements.
- The scheduler does not assign individual workers or model parallel crews.
- The scheduler does not fetch forecasts or verify field conditions.
- The results UI presents scheduler output but does not turn the greedy strategy into a general optimization engine.

## Safety and regulatory language

This module produces planning guidance for a safer plan. It applies the configured deterministic rules to supplied inputs, but it is not a legal compliance engine and does not establish that a schedule is safe or compliant. Supervisors must verify site conditions and applicable requirements through qualified procedures.

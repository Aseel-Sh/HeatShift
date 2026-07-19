# Deterministic bounded schedule optimization

## Claim boundary

HeatShift returns a **selected safer schedule**, selected from six deterministic candidate schedules. It does not claim global optimality, the safest possible schedule, or a guaranteed best result. The search is intentionally bounded for an explainable single-crew MVP.

`OptimizationSummary` is an explanation of the selected candidate, not a safety score. It reports the candidate count and strategy, confirms the selected schedule has zero hard-constraint violations, and exposes unscheduled must-schedule work, other unscheduled work, movement, splitting, order inversions, and forecast heat-exposure penalty.

## Candidate strategies

The engine evaluates the same validated inputs with six stable construction strategies:

1. Critical / must-schedule first
2. Preserve requested order
3. Coolest direct-sun work first
4. Minimum splitting
5. Minimum movement
6. Indoor-midday utilization

No candidate uses randomness, AI, a network call, or a third-party optimizer. Stable input order and fixed tie breakers make repeated runs deeply equal.

## Hard constraints

A selected candidate must have zero violations of:

- single-crew occupancy and shift boundaries;
- the configured direct-sun midday restriction;
- confirmed fixed activity times, or explicit reported infeasibility;
- chronological crew-level outdoor work/recovery cycles;
- conditioned-indoor exclusion from outdoor TWL cycles;
- non-splittable work continuity; and
- confirmed predecessor dependencies.

Recovery state is evaluated chronologically across task boundaries, never from task-array order. A break or meal receives recovery credit only when `recoveryEligibility=eligible`. Credited time occupies the crew once and is not duplicated as a separate recovery block.

## Ordered score

Valid candidates are compared lexicographically, not by a synthetic safety percentage. The first differing objective decides:

1. Unscheduled must-schedule work
2. Other unscheduled work
3. Movement of preferred activities
4. Total movement from requested times
5. Task splitting
6. Original-order inversions
7. Direct-sun heat exposure using the latest hourly forecast at or before each slot
8. Conditioned-indoor work outside the restricted midday period
9. Late completion
10. Fragmented idle gaps

The public summary exposes the requested score breakdown. Additional deterministic tie-break values remain internal because they are operational placement diagnostics, not safety measures.

## Bounded improvement behavior

Candidate construction and its bounded improvement pass can move activities, swap activity order, merge adjacent blocks, align explicitly eligible breaks or meals with recovery, and fill remaining valid five-minute gaps. A must-schedule activity is prioritized, but the engine will not violate a restriction, recovery rule, dependency, or fixed activity to force it into the shift.

Operational notes affect explanation and must-schedule priority only. For example, “Pump booked only today” does not create a clock window; only an explicit confirmed time window does.

## Known limitations

- This is a bounded deterministic search, not exhaustive global optimization.
- It models one crew and no worker-level assignments or parallel resources.
- It uses five-minute slots and same-day shifts only.
- Dependencies are finish-to-start confirmations; richer resource and precedence types are out of scope.
- Forecast temperature is preliminary planning context and is not TWL.
- Recovery eligibility is supervisor-confirmed input; HeatShift does not infer medical suitability.
- Infeasible fixed or must-schedule work remains explicit and requires supervisor intervention.

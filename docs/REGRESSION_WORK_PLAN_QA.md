# Regression work-plan release QA

Date: 2026-07-19  
Build: optimized local production build (`next start`, port 3100)  
Input: the exact North utility site / Riyadh plan supplied for this review

## 1. What was observed manually

The production application was opened in a real Chromium browser before relying on the regression suite. A live Open-Meteo location search returned Riyadh, Riyadh Region; selecting it retained `24.6877, 46.7219` and `Asia/Riyadh`. The exact workflow was then replayed against the optimized build with deterministic route interception for repeatable weather evidence and no mocked plan-import endpoint.

The import rendered eight timed activities with no false missing crew, new-worker, shift-start, or shift-end warning. Break and lunch remained non-work activities. Concrete pour retained its must-complete flag and the note `Pump booked only today.` No pump clock window was created. Six work classifications were visibly marked as suggestions and every activity classification was editable.

Manual screenshot inspection found two release-blocking defects in the first result:

- there was no control for confirming predecessor dependencies;
- the scheduler split the confirmed non-splittable concrete pour because the must-schedule cycle branch bypassed the splitting constraint.

Both were repaired. The verification table now exposes explicit finish-to-start predecessor checkboxes, removes dangling dependencies when a task is deleted, and the scheduler never sends a non-splittable must-schedule task through the splittable cycle path.

The corrected schedule contains no direct-sun block from 12:00 through 15:00. Fixed break and lunch remain at 09:00–09:15 and 11:30–12:00. Their explicitly eligible time contributes to required recovery without being duplicated. The excavation periods and recovery are chronological; short standalone recovery before each eligible activity combines with that activity to complete the required 40 minutes. Conditioned-indoor toolbox/prep is moved to 12:00–12:30. Confirmed dependencies prevent concrete, finish/curing, and cleanup from being scheduled before incomplete predecessors.

The result is operationally sensible as an **infeasibility report**, not as an executable promise that the pour can proceed. It correctly requires supervisor intervention: non-splittable rebar/forms cannot satisfy the selected high-TWL heavy 20/40 cycle, so concrete's confirmed predecessor is incomplete and the must-complete pour remains wholly unscheduled.

The selected Excavation row highlighted every associated work and recovery block and displayed all intervals instead of a dash. Desktop, 390×844 mobile, Arabic RTL, and print layouts were visually inspected. The document did not horizontally overflow; the timeline retained its own scroll/fit behavior. Requested rows, short blocks, heat cells, restriction hatch, activity types, recovery, and unscheduled pills remained distinguishable.

## 2. What automated tests prove

The repeatable production-browser regression test mocks location, parse, and weather HTTP responses while exercising the complete rendered workflow. It proves:

- all supplied setup values and all eight imported rows reach Verify;
- activity types, times, concrete must-complete state, note, and suggestion labels are retained;
- the three confirmed predecessor links are stored through the UI;
- selected Riyadh coordinates are sent to weather;
- forecast and TWL remain separately labeled;
- no direct-sun generated block overlaps 12:00–15:00;
- capacity failure is explicit and global-optimality language is absent;
- no genuinely timed activity appears as `Time not specified`;
- Excavation links to multiple generated intervals;
- mobile has no page-level horizontal overflow;
- Arabic changes document direction and results labels; and
- print media hides editing/print controls while preserving the report.

The unmocked local production replay established that the real deterministic import endpoint handled this exact structured text; the unit parser suite supplies stable boundary proof without depending on OpenRouter. Existing mocked browser and unit suites additionally prove recoverable location, weather, and AI failures; incomplete AI classifications; refresh behavior; long bilingual names; keyboard navigation; print behavior; 06:30-to-06:00 forecast lookup; shift-scoped peaks; global chronological recovery; eligible/ineligible meal recovery; fixed/preferred activity handling; deterministic selection; and HTML-safe rendering. A new unit regression proves that a confirmed 12:00–14:30 fixed pump window is reported infeasible rather than moved or forced through the restriction.

Automated tests do not prove field suitability, forecast accuracy, TWL measurement quality, or legal compliance.

## 3. Import output

| # | Imported activity | Requested time | Duration | Confirmed classification |
| ---: | --- | --- | ---: | --- |
| 1 | Toolbox talk + prep | 06:00–06:30 | 30 min | Work; light; conditioned indoor; non-splittable |
| 2 | Excavation | 06:30–09:00 | 2 hr 30 min | Work; heavy; direct sun; splittable |
| 3 | Break | 09:00–09:15 | 15 min | Break; fixed; recovery eligible |
| 4 | Rebar + forms | 09:15–11:30 | 2 hr 15 min | Work; heavy; shaded outdoor; non-splittable |
| 5 | Lunch | 11:30–12:00 | 30 min | Meal; fixed; recovery eligible |
| 6 | Concrete pour | 12:00–14:30 | 2 hr 30 min | Work; heavy; direct sun; non-splittable; must complete; after rebar/forms |
| 7 | Finish + curing | 14:30–15:00 | 30 min | Work; light; shaded outdoor; non-splittable; after concrete |
| 8 | Cleanup | 15:00–16:00 | 1 hr | Work; light; direct sun; splittable; after finish/curing |

The pump note is operational priority context only. No pump time was inferred.

## 4. Selected schedule

Selected strategy: `critical_must_schedule_first`. Six deterministic candidates were evaluated; hard-constraint violations are zero.

Chronological crew activity:

- 06:00–06:20 Excavation; 06:20–07:00 recovery
- 07:00–07:20 Excavation; 07:20–08:00 recovery
- 08:15–08:35 Excavation; 08:35–09:00 recovery
- 09:00–09:15 eligible fixed break, completing the required recovery without double counting
- 09:15–09:35 Excavation; 09:35–10:15 recovery
- 10:15–10:20 Excavation; 10:20–11:00 recovery
- 11:00–11:20 Excavation; 11:20–11:30 recovery
- 11:30–12:00 eligible fixed lunch, completing the required recovery without double counting
- 12:00–12:30 conditioned-indoor toolbox/prep
- 15:00–15:20 Excavation

Explicit unscheduled work:

- Excavation: 25 minutes
- Rebar + forms: 135 minutes
- Concrete pour: 150 minutes
- Finish + curing: 30 minutes
- Cleanup: 60 minutes

Totals: 155 scheduled work minutes, 195 generated recovery minutes, 45 break/meal minutes, and 400 unscheduled minutes. Concrete receives priority over cleanup in scoring, but neither can be forced through an incomplete dependency or a hard recovery/restriction constraint.

## 5. Candidate score comparison

All six bounded strategies converged to the same score for this heavily constrained confirmed plan:

| Strategy | Hard violations | Must unscheduled | Other unscheduled | Movement | Splits | Inversions | Heat penalty |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Critical/must-schedule first | 0 | 150 | 250 | 390 | 6 | 3 | 0 |
| Preserve requested order | 0 | 150 | 250 | 390 | 6 | 3 | 0 |
| Coolest direct-sun first | 0 | 150 | 250 | 390 | 6 | 3 | 0 |
| Minimum splitting | 0 | 150 | 250 | 390 | 6 | 3 | 0 |
| Minimum movement | 0 | 150 | 250 | 390 | 6 | 3 | 0 |
| Indoor-midday utilization | 0 | 150 | 250 | 390 | 6 | 3 | 0 |

The selected score is no worse than every alternative; it does **not** strictly beat them. `critical_must_schedule_first` wins the documented deterministic strategy-order tie break. The UI correctly says “Selected from 6 deterministic candidate schedules” and does not claim optimality.

## 6. Operational concerns

- The requested high-TWL classification plus non-splittable 135-minute rebar and 150-minute concrete activities is infeasible under a 20-minute heavy-work maximum. The supervisor must change conditions, task method/classification, splitting feasibility, resources, date, or duration before treating the plan as executable.
- “Pump booked only today” has no confirmed clock window. If an actual fixed window exists, it must be entered explicitly; the tested 12:00–14:30 direct-sun window is rejected.
- Recovery eligibility is a supervisor confirmation representing an appropriate shaded/cooled recovery setting. HeatShift does not separately model or verify the physical break location.
- Two non-acclimatized workers under high TWL produce the required critical reassignment/supervisor-intervention warning.

## 7. UI concerns

Resolved: dependency confirmation was absent; non-splittable must-complete work was visually reported as fragmented completion. Both are fixed.

Remaining: long full-page mobile/Arabic reports require substantial vertical scrolling; the fit-shift timeline is necessarily dense at 390 px. Exact values remain available through selection, accessible names, and the text alternative. Refresh intentionally resets local workflow state, and browser Back/Forward is not step-aware.

## 8. Screenshots

- [Import review](../artifacts/regression-work-plan/01-import-review.png)
- [Supervisor-confirmed classifications and dependencies](../artifacts/regression-work-plan/02-supervisor-confirmed.png)
- [Before fix: invalid fragmented concrete result](../artifacts/regression-work-plan/03-selected-schedule-before-fix.png)
- [Corrected selected schedule](../artifacts/regression-work-plan/03-selected-schedule.png)
- [Excavation linked intervals and details](../artifacts/regression-work-plan/04-excavation-linked.png)
- [Mobile 390×844](../artifacts/regression-work-plan/05-mobile.png)
- [Arabic RTL result](../artifacts/regression-work-plan/06-arabic.png)
- [Print-media report](../artifacts/regression-work-plan/07-print.png)

## 9. Remaining limitations

- The search is deterministic and bounded, not globally optimal.
- A tied candidate score is resolved by stable strategy order rather than a claim that one tied schedule is safer.
- The app models one crew, same-day five-minute slots, and finish-to-start dependencies only.
- Browser refresh clears local state; no plan is persisted.
- Live OpenRouter and Open-Meteo availability remains external. Failure paths do not fabricate values and preserve manual/demo operation.
- The forecast is a coordinate-based model forecast for preliminary planning. TWL is entered separately and is never calculated from it.

## 10. Ready to deploy and record?

**Ready to record the exact local production workflow as an honest infeasibility outcome.** The corrected input completes from import through results in the optimized production browser build with no console/page error and all evidence above.

**Not an unconditional field-deployment approval.** The supplied plan itself is not executable under the confirmed high-TWL, non-splittable, and dependency inputs. HeatShift correctly requires supervisor intervention, and deployment still requires ordinary hosting, operational, privacy, and qualified safety review outside this repository test.

Final acceptance: lint passed; strict typecheck passed; 188 unit tests across 25 files passed; 45 Playwright tests passed; optimized production build passed; and the exact final-build browser regression passed.

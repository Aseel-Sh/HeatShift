# HeatShift Manual Release QA Report

## Final product-design and comprehension review — 2026-07-19

### Before

- The header displayed both English and Arabic product names simultaneously and used a generic stock-style construction icon.
- Secondary task fields, evidence, notes, helper copy, and suggestions made primary task rows uneven and slow to scan.
- The results page exposed candidate and movement details before answering what changed and what the supervisor must decide.
- A letter-only timeline legend did not visually match the blocks.
- Extraction assumptions were unstructured strings, so provider-generated English could leak into Arabic mode.

### After

- The original sun-and-shift-bar mark is paired with exactly one language-specific wordmark.
- Task rows are compact and alternating; expandable details contain secondary controls, evidence, dependencies, and Apply/Dismiss suggestion chips. Blank manual tasks open automatically.
- Results lead with Plan outcome, required supervisor actions, and an activity-by-activity requested-versus-selected table. Technical candidate details are last and collapsed.
- The legend is conditional and reuses the exact work, recovery, break, meal, idle, unscheduled, restriction, and heat styles.
- Assumptions and missing information now use bilingual `{code, messageEn, messageAr}` records, with local validation after extraction.

### Ten-second comprehension check

Persona: a first-time construction supervisor with no knowledge of the optimization implementation.

From the first result viewport, the persona could identify what moved from **What changed?**, incomplete work from **What could not be completed?**, the rules from **Why?**, and required decisions from the dedicated yellow action panel. The change table showed the exact requested and selected intervals without requiring timeline interpretation. Construction-order and recovery explanations were expressed in operational language; candidate strategy and scoring were not needed to answer any of the six comprehension questions.

### Visual observations

- English and Arabic wordmarks are singular and correctly oriented.
- The document does not horizontally overflow; dense tables own their horizontal scrolling at narrower widths.
- Work, recovery, meal, break, idle, unscheduled work, restriction, and heat categories remain distinguishable without color alone.
- Arabic interface copy, status labels, recommendations, and result explanations rendered in Arabic. Dates, times, coordinates, `TWL`, temperatures, and model identifiers remain left-to-right where appropriate.
- Full-page browser captures may repeat the sticky header at page-segment boundaries; this is a capture-tool artifact and does not occur during normal scrolling or print.

### Evidence

- `artifacts/regression-work-plan/01-import-review.png` — English header, expanded work/break rows, suggestions, and source evidence
- `artifacts/regression-work-plan/02-supervisor-confirmed.png` — confirmed compact task review
- `artifacts/regression-work-plan/03-selected-schedule.png` — plan outcome, required actions, change table, timeline, forecast context, and unscheduled work
- `artifacts/regression-work-plan/06-mobile.png` — mobile result containment
- `artifacts/regression-work-plan/07-arabic.png` — Arabic wordmark and complete Arabic result
- `artifacts/regression-work-plan/08-print.png`

### Intentionally untranslated strings

- User-entered site names and original plan text.
- Official source titles and publisher names in their published language.
- Product/provider proper names: `HeatShift`, `Open-Meteo`, and configured AI model identifiers.
- Standards and scientific notation: `TWL`, `°C`, coordinates, dates, and clock times.

## 2026-07-19 operational-sequence regression addendum

The exact North utility site plan was run through the optimized production UI with Riyadh coordinates, 2026-07-20, 06:00–16:00, crew 8, two non-acclimatized workers, supervisor-confirmed work classifications, the work-only predecessor chain, and Low site-entered TWL.

Observed import state:

- Eight requested activities and every requested interval were retained.
- Break and Lunch remained calendar activities and were excluded from predecessor suggestions.
- Concrete displayed **Must complete**, evidence from “Need concrete completed today.”, and the pump note without an invented fixed interval.
- The supervisor confirmed Toolbox → Excavation → Rebar/Forms → Concrete → Finish/Curing → Cleanup.

Selected operational sequence:

1. Toolbox talk + prep — 06:00–06:30
2. Excavation — 06:30–09:00
3. Break — 09:00–09:15
4. Rebar + forms — 09:15–11:30
5. Concrete pour — 11:30–12:00
6. Lunch — 12:00–12:30
7. Idle/direct-sun restricted capacity — 12:30–15:00
8. Concrete pour — 15:00–16:00

Concrete received 90 of 150 requested minutes and retained exactly 60 unscheduled must-complete minutes. Because Concrete was incomplete, Finish/Curing remained fully dependency-blocked for 30 minutes and Cleanup remained fully dependency-blocked for 60 minutes. No successor was moved before its predecessor. The selected `indoor_midday_utilization` candidate passed with `hardConstraintViolations: []` and beat alternatives by reducing unscheduled must-complete work before movement was considered.

The production result visibly separated forecast category (**High — context only, not TWL**) from applied TWL (**Low — continuous-work guidance**) and explained zero recovery. Plan outcome, requested and selected timelines, unscheduled table, Concrete block details, mobile layout, Arabic result, and print media were inspected. No page-level horizontal overflow or fabricated value was observed.

Evidence:

- `artifacts/regression-work-plan/01-import-review.png`
- `artifacts/regression-work-plan/02-supervisor-confirmed.png`
- `artifacts/regression-work-plan/03-selected-schedule.png`
- `artifacts/regression-work-plan/05-concrete-details.png`
- `artifacts/regression-work-plan/06-mobile.png`
- `artifacts/regression-work-plan/07-arabic.png`
- `artifacts/regression-work-plan/08-print.png`

Verdict for this exact local production workflow: ready to record as a deterministic planning demonstration. This does not establish safety or regulatory compliance.

Date: 2026-07-19  
Baseline commit: `65a02be1f23bc82d5f52d6351dac2bbe7bc68098`  
Runtime: Node `v24.13.1`, npm `11.8.0`  
Surface reviewed: local optimized Next.js production build

## Release verdict

The deterministic sample and manual workflows are suitable for recording from the locally verified production build. The live AI path is not suitable for a recorded demo: `openrouter/free` was slow and model quality varied between attempts. Live weather is verified. No deployed URL was supplied or tested, so this report does not declare a deployed application ready.

HeatShift remains a planning aid. This review does not establish safety or regulatory compliance.

## What real-browser exploration proved

- The sample flow completes in four clicks from setup to an explained schedule block, with no network dependency.
- The purpose, manual path, import path, and sample path are visible in the rendered setup workflow. The revised opening copy now states the product outcome and that manual entry is available.
- Sample data is explicitly identified and editing its city, date, and task clears sample provenance.
- Edited sample data fetched live Jeddah weather and did not retain the Riyadh fixture temperature.
- Requested work, restriction conflicts, moved/split work, recovery, conditioned-indoor midday work, unscheduled capacity, and new-worker intervention are visible in the results UI.
- Intermediate heavy work shows 45/15 recovery periods; high heavy work shows 20/40 periods; no-TWL results are marked preliminary and show no exact recovery cycle.
- A 12:00–15:00 direct-sun-only shift leaves even a five-minute task explicitly unscheduled.
- A 2027 date shows that no verified HeatShift restriction configuration is available and does not claim the 2026 restriction is current.
- Arabic sample workflow is RTL, uses Arabic labels and rule explanations, retains chronological left-to-right time progression, and exposes no raw reason code.
- The 390×844 workflow remains readable. The weather strip and timeline use contained horizontal scrolling rather than overflowing the page.
- Missing AI configuration, provider timeout, and weather unavailability preserve the user’s input and expose a manual path.
- HTML-like task text renders literally; no `img` element is created.
- Refresh resets the reducer workflow to blank setup. This is expected from the no-persistence architecture but remains a user-data-loss risk.

## Live AI status

Status: **tested, unreliable, and not recommended for the demo**.

Observed attempts:

1. With outbound access blocked, all calls failed gracefully as unavailable.
2. With outbound access, the original 12-second timeout expired before `openrouter/free` returned.
3. After increasing the timeout to 30 seconds, `tencent/hy3:free` returned schema-valid output but omitted stated crew/date/durations and invented task starts.
4. After stronger instructions, `google/gemma-4-26b-a4b-it:free` correctly returned date, crew, requested trenching window, indoor/shaded environments, and three durations, but omitted the explicit 90-minute trenching duration.
5. An intentionally incomplete plan routed to `nvidia/nemotron-3-super-120b-a12b:free` and invented a date, crew size, task times, and durations.
6. A conservative local evidence guard was added to remove returned facts without source-text evidence and mark them missing. Unit regression covers this behavior.
7. The final incomplete-plan and Arabic-plan live retries timed out at 30 seconds, so the evidence guard could not be re-observed with a completed live response.

The UI’s verification gate successfully keeps incomplete tasks from scheduling, displays the actual routed model when available, and never delegates safety decisions to AI. Provider latency and free-router model variability remain an external demo risk.

## Live weather status

Status: **verified**.

- Riyadh and Jeddah were exercised in the rendered Conditions screen as city-center model forecasts.
- Riyadh, Jeddah, Dammam, Mecca, and Medina each returned 24 normalized hourly records from the application endpoint for 2026-07-20.
- Direct upstream comparison used the repository coordinates, `Asia/Riyadh`, and the same four hourly variables.
- Riyadh and Jeddah had a maximum field difference of `0` across temperature, apparent temperature, relative humidity, and wind speed.
- Riyadh’s 06:30–16:30 peak was 45.1°C and was computed only from displayed shift hours.
- The UI does not calculate TWL from forecast values and labels forecast planning as preliminary city-center context.

## Findings

### Critical

- **AI returned fabricated absent facts.** Before: the incomplete live plan produced a fabricated 2025 date, crew of five, and fabricated task times/durations. After: extraction instructions were strengthened and a deterministic evidence guard removes unsupported scalar/task facts before they reach editable state. Regression coverage was added. No deterministic safety decision consumes raw model output.

### High

- No unresolved high issue was found in the deterministic sample/manual scheduling path.

### Medium

- **Live AI latency and variability:** remains. Timeout was raised from 12 to 30 seconds, but final live retries still timed out. The manual and sample paths remain available.
- **Refresh loses local work:** remains by current no-database/no-persistence architecture. A refresh at results returned to blank setup.
- **Dependency advisories:** `npm audit fix` removed the high Vite advisory and other fixable advisories. Two moderate advisories remain through Next.js’s bundled PostCSS; npm proposes a breaking downgrade to Next 9.3.3, so no forced fix was applied.
- **Native print dialog:** browser print-media output was inspected, but the in-app browser did not expose the operating-system print-preview window for direct capture.

### Low

- Long site names truncate in compact header facts; the full site remains visible in report content.
- The Arabic report necessarily retains official English source titles because those are the published titles.

### UX friction

- Before the copy fix, the setup screen explained mechanics before outcome. It now opens with “Turn an outdoor work plan into a safer shift” and explicitly mentions manual entry or import.
- Import/manual/sample buttons may require scrolling on shorter desktop windows, although setup fields provide a clear starting action.
- Thirty seconds is too long for comfortable demo silence; the loading state is visible but does not remove the presentation risk.

### Demo risk

- Do not demonstrate live AI unless it is tested immediately before recording with the exact configured model/provider conditions.
- Use **View sample shift** for the dependable 90–120 second presentation. It is deterministic and network-free.
- Live weather is reliable in this review but remains an upstream dependency; the sample does not require it.

## Failure recovery and security

- Missing key: exact user message appears and manual entry remains available.
- Live provider timeout: exact timeout message appears; input text remains intact.
- Automated browser coverage additionally forces 429, invalid JSON, network failure, weather timeout, malformed weather, unsupported date, empty weather, double generation, and rapid navigation.
- 5,001-character plan text returns 400; an over-10 KB body returns 413; unsupported content type returns 415.
- `.env` is not tracked; only `.env.example` is tracked.
- The configured key’s exact value is absent from `.next/static` and Git history. No credential-shaped OpenRouter token appears in client assets.
- Server output did not contain submitted full plan text or API keys.
- User HTML-like text rendered as text and created no image element.

## Print and demo review

- Print-media output hides workflow navigation and action buttons.
- Warnings, metrics, requested/safer timeline, restriction band, findings, hydration guidance, briefing, and sources remain in print layout.
- The black-and-white restriction hatch and dashed recovery blocks remain distinguishable without relying on color.
- Arabic print retains RTL text and left-to-right chronology.
- The uninterrupted deterministic interaction took four clicks: sample, conditions, generate, block details. Measured UI time was 1.569 seconds; the remaining 90–120 seconds can be used to narrate verification, forecast/TWL separation, the before/after board, capacity warning, and source-backed rule details.
- AI is not visibly demonstrated in this safe demo path.

## What automated tests proved

- 126 unit tests cover domain boundaries, scheduling, integration normalization, extraction schema/error behavior, and unsupported-fact removal.
- 36 Playwright tests cover demo/manual workflows, console/page/network cleanliness, failure recovery, validation, responsive layout, Arabic, timeline rules, recalculation, start-over, and print media.
- Automated integrations are mocked; they do not prove live provider behavior. Live integration evidence is documented separately above.

## What was not tested

- No deployed URL, hosting platform, CDN, or production environment was supplied.
- Native operating-system print preview was not directly capturable; print CSS was inspected through browser print-media rendering.
- 429, malformed provider JSON, and malformed/timeout weather were not induced against real upstream services; they were forced in automated browser tests.
- Every scheduler permutation was not recreated manually. The rendered manual subset was combined with deterministic unit/E2E boundary coverage.
- Back/forward behavior was not exhaustively repeated at every field mutation.

## Screenshot observations

| Evidence | Observation |
| --- | --- |
| `01-first-time-setup.png` | Original setup emphasized mechanics; import/sample actions were below the first viewport. |
| `02-live-ai-loading.png` | Entered plan remained visible during the request; the original short timeout made the loading state difficult to capture. |
| `03-live-ai-unavailable.png` | Failure is inline, preserves text, and points to manual entry. |
| `04-live-jeddah-forecast.png` | Live Jeddah values replaced sample weather; forecast and TWL remain visibly separate. |
| `05-original-versus-safer.png` | Requested conflicts align against the restriction band; critical capacity/readiness warnings remain above the board. |
| `06-incomplete-task-validation.png` | Unknown duration, workload, environment, and split fields are explicit and color-independent. |
| `07-midday-only-unscheduled.png` | A five-minute direct-sun task is not squeezed into the restricted shift and is reported unscheduled. |
| `08-intermediate-cycle.png` | Intermediate mode changes recovery totals and visible recovery blocks without hiding requested conflicts. |
| `09-preliminary-no-twl.png` | Preliminary badge and zero recovery make the lack of site-verified cycles clear. |
| `10-unverified-2027-rule.png` | The missing verified restriction configuration is prominent and separate from capacity/new-worker warnings. |
| `11-arabic-task-review.png` | Arabic task editing is RTL while time inputs remain readable. |
| `12-arabic-result.png` | Arabic status, warnings, metrics, and timeline heading dominate the screen; English is limited to identifiers/source data. |
| `13-arabic-rule-details.png` | Rule explanations are Arabic and no internal reason code is exposed. |
| `14-mobile-setup.png` | Setup fields stack cleanly at 390×844 with readable targets. |
| `15-mobile-task.png` | Task rows become stacked panels instead of forcing page-level horizontal overflow. |
| `16-mobile-conditions.png` | TWL choices remain large and distinct; forecast uses its own contained scroller. |
| `17-mobile-result.png` | Critical capacity warning is visible before the timeline and report content stays within the viewport. |
| `18-ai-not-configured.png` | Missing-key state is recoverable and keeps manual/sample actions available. |
| `19-fixed-first-time-setup.png` | Revised copy states the product outcome and manual/import choices before task entry. |
| `20-fixed-ai-loading.png` | Extended live request shows a stable loading state without replacing user text. |
| `21-live-ai-extraction-result.png` | First live model exposed its identity but left many fields incomplete, demonstrating why verification is mandatory. |
| `22-live-ai-retest.png` | Stronger instructions improved extraction and removed invented starts, but the stated 90-minute duration was still absent. |
| `23-evidence-guard-live.png` | Final incomplete-plan live retry timed out cleanly; no fabricated values appeared. |
| `24-live-arabic-extraction.png` | Final Arabic live retry timed out and preserved the original Arabic plan. |
| `25-safe-user-text.png` | HTML-like task text remained literal in the rendered report. |
| `26-demo-final.png` | Before/after transformation, recovery cadence, restriction band, unscheduled work, reason text, and sources are immediately visible. |
| `27-refresh-resets-workflow.png` | Refresh returns to blank setup, confirming the current persistence limitation. |
| `28-print-preview-english.png` | English print media preserves the full timeline and warning/finding content with monochrome distinctions. |
| `29-print-preview-arabic.png` | Arabic print media retains chronological ruler order and RTL findings; sections remain bounded. |

## Recording recommendation

- **Local deterministic sample demo:** suitable to record.
- **Live weather demonstration:** suitable with a fallback explanation, but introduces an upstream dependency.
- **Live AI demonstration:** not suitable to record in its current free-router configuration.
- **Deployed application:** not assessed; no deployment was tested.

## Final timeline polish verification — 2026-07-19

Manual production-browser observations:

- At 1440×900 and 768×1024, the detailed timeline opened in `1 hour` mode and kept horizontal overflow inside its own region.
- At 390×844, the timeline opened in `Fit shift` mode, displayed the horizontal-scroll hint, and did not create page-level horizontal overflow.
- Requested labels retained sticky positioning; the time ruler reports sticky positioning within the timeline scroller.
- Narrow blocks retained proportional widths, remained keyboard/selectable controls, and exposed full activity names and intervals through accessible labels and details.
- The shared amber-and-navy selected treatment visibly connected requested and generated blocks without animation.
- Arabic mode remained RTL while timeline chronology stayed left-to-right. The scale helper and `سياق توقعات الإحداثيات المحددة` assumption rendered correctly.
- Browser console inspection found no warnings or errors during the sample workflow.
- The print-media capture remained legible in black and white and retained the schedule, restriction hatch, warnings, sources, and briefing.

Updated evidence:

| Screenshot | Observation |
| --- | --- |
| `artifacts/final-timeline-polish/desktop-1440x900.png` | Desktop result uses the detailed one-hour scale without page overflow. |
| `artifacts/final-timeline-polish/tablet-768x1024.png` | The 768 px breakpoint retains the one-hour detailed default and contained board scrolling. |
| `artifacts/final-timeline-polish/mobile-390x844.png` | Mobile uses Fit shift and keeps the report inside the viewport. |
| `artifacts/final-timeline-polish/arabic-result.png` | Arabic labels and helper copy remain readable while chronology remains left-to-right. |
| `artifacts/final-timeline-polish/print-output.png` | Print layout remains monochrome-readable with aligned requested and selected lanes. |

Automated proof: the four restriction-date cases pass, responsive scale/helper assertions pass, all 197 unit tests and all 45 Playwright tests pass, and the optimized production build succeeds.

## Plan-view, priority, and Saudi-time verification — 2026-07-19

Manual optimized-production observations:

- At 1440×900, Original requested plan opened in Timeline and Generated safer schedule opened in Execution list. Switching either tab did not affect the other.
- At 390×844, both sections opened in Execution list and the page retained zero document-level horizontal overflow.
- Generated execution displayed chronological recovery rows; requested execution contained only original activities and no generated recovery.
- English and Arabic headings unmistakably distinguished the original plan from the generated schedule. Arabic retained RTL document flow with left-to-right operational chronology.
- Required-today and Normal labels appeared as text, and the constraint-aware priority explanation did not promise forced completion.
- Setup, conditions, result header, and print used the Saudi Arabia Standard Time label. A UTC retrieval timestamp was displayed as the corresponding Saudi local date/time without exposing raw ISO text.
- The browser console contained no warnings or errors during the production sample journey.

Automated browser runs under both `America/Chicago` and `Asia/Riyadh` proved identical visible operational schedule values, forecast hours, restriction times, retrieval display, and print content.

Final automated result: lint passed; strict typecheck passed; 200 unit tests across 27 files passed; 48 Playwright tests passed; optimized production build passed.

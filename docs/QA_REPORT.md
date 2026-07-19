# HeatShift QA report

Date: 2026-07-19  
Scope: existing Describe → Verify → Conditions → Results workflow, deterministic scheduler, OpenRouter extraction boundary, Open-Meteo boundary, bilingual UI, accessibility, printing, security, and reliability. No new product features were added.

## Executive status

Before this review, the existing automated baseline was green, but adversarial browser testing found two high-severity extraction defects, three medium test/accessibility defects, and several documented limitations. After fixes, no critical or high-severity issue remains. The demo completes without console errors, page errors, failed network requests, or duplicate Generate behavior.

Final automated status:

- Lint: passed
- Strict typecheck: passed
- Unit tests: 96 passed across 15 files
- Playwright: 33 passed
- Production build: passed
- Browser-bundle credential scan: clean
- Tracked-secret scan: clean

## Critical

No critical issue was discovered, and none remains.

## High

### QA-H01 — AI extraction was blocked by required manual fields

Before: **Open.** Analyze validated every structured field before calling the extraction endpoint. A user could not submit a text-first plan, defeating the primary extraction journey. Default `06:30–16:30` values also overrode extracted shift times even when the user had not chosen them.

Fix: Analyze now validates the text boundary first. Untouched shift inputs begin empty and are filled by extraction. Full plan validation still blocks progression from Verify.

Proof: `AI can extract a text-first plan without duplicate requests` and the reducer extraction test.

After: **Resolved.**

### QA-H02 — Missing AI duration became an invented five-minute task

Before: **Open.** When AI correctly omitted an unstated task duration, the reducer silently changed it to five minutes. That value looked plausible and could reach scheduling after casual review.

Fix: An omitted duration becomes zero in draft UI state, is visibly invalid, and cannot proceed until the supervisor enters a positive five-minute-aligned duration.

Proof: `fills untouched plan fields and does not invent a missing extracted duration`.

After: **Resolved.**

## Medium

### QA-M01 — Invalid controls did not expose complete programmatic error state

Before: **Open.** Plan errors were announced, but controls lacked `aria-invalid`. Task name and duration errors were not linked through `aria-describedby` and did not consistently use alert semantics.

Fix: Invalid plan and task fields now expose `aria-invalid="true"`; task errors have stable IDs, linked descriptions, and `role="alert"`.

Proof: `abusive form values and task data are announced and block progress`.

After: **Resolved.**

### QA-M02 — Browser failures did not retain complete diagnostics

Before: **Open.** Traces were produced only on a retry and screenshots/videos were not configured.

Fix: Playwright now retains traces, screenshots, and video on failure only.

After: **Resolved.**

### QA-M03 — The E2E runner ignored file and grep arguments

Before: **Open.** `npm run test:e2e -- <args>` always ran the complete suite, slowing focused diagnosis. The config also could not target an already-running inspected app.

Fix: The runner forwards CLI arguments, and Playwright accepts an explicit QA base URL while retaining the self-owned default server.

After: **Resolved.**

### QA-M04 — Refresh loses in-progress workflow state

Before: **Known limitation.** Refreshing Verify, Conditions, or Results returns to an empty Describe screen because state is intentionally local and non-persistent.

After: **Remains.** Adding session persistence changes product behavior and data-retention expectations, so it was not introduced during a no-new-features QA iteration. The behavior is automated and documented rather than hidden.

## Low

### QA-L01 — Browser history is not step-aware

The workflow uses reducer state on one URL. Browser Back/Forward does not navigate between workflow steps; users must use the visible Edit plan, Back, and Change conditions controls. Remains by design.

### QA-L02 — Some provider and validation detail remains English in Arabic mode

Primary interface labels, direction, task content, results, and briefing are Arabic in RTL mode. Some server-returned provider errors and detailed validation strings remain English. This does not block operation or obscure severity, but localization is incomplete.

### QA-L03 — Free-provider availability is inherently variable

OpenRouter free routing and Open-Meteo can be unavailable or rate limited. All tested failures remain recoverable through manual entry, preliminary planning, or the deterministic demo. No invented integration data is used.

## Journey evidence

### A. Happy path

Passed: demo load, task verification, high TWL, results, changed conditions, recalculation, and print-media layout. Duplicate Generate is stable. The demo produces restriction, 20/40 cycles, indoor midday work, new-worker warning, and unscheduled capacity.

### B. Manual path

Passed without AI. A manually entered plan and task reaches deterministic results with mocked weather. React escapes hostile-looking task text; no element or script is created.

### C. AI failures

Passed with mocked responses: missing key, timeout, rate limit, invalid response, and network/unavailable failure. Each presents a specific recoverable alert and leaves manual task creation enabled. Rapid double Analyze produces one request.

### D. Weather failures

Passed with mocked responses: timeout, invalid response, unsupported date, and empty hourly data. Every case exposes forecast unavailability, states that no weather was invented, and keeps preliminary/site-verified paths available.

### E. Form abuse

Passed: empty fields, crew size zero, negative new-worker count, new workers above crew, end before start, overnight shift, 5000-character UI limit, 5000-character API limit, task duration zero, five-minute shift capacity, no tasks, and work exceeding capacity. Invalid values block progression or become explicit unscheduled work; they are never silently shortened.

### F. Scheduling edges

Passed through existing and added unit coverage: 11:55/12:00/15:00 boundaries, non-splittable noon crossing, multiple high-TWL heavy tasks, no indoor task, an entirely restricted shift, total capacity exhaustion, no forecast, no TWL, low/intermediate/high TWL, and June 14/15 plus September 15/16 boundaries. Work/rest and work blocks remain mutually exclusive.

### G. UI and reliability

Passed live browser inspection at 390×844, 768×1024, and 1440×900. No horizontal overflow occurred with 240-character English and Arabic task names. Keyboard activation reaches the demo, Conditions, Generate, and print control. Arabic direction and briefing pass. Refresh behavior is documented. App-level back controls, condition changes, recalculation, double Generate, and rapid Analyze pass.

### H. Accessibility

Passed: visible labels, one initial H1 with non-skipping heading order in inspected screens, skip link, global visible focus, keyboard activation, linked and announced errors, button accessible names, textual severity labels, and non-color warning icons/copy. Manual contrast checks for primary text/control combinations measured 5.82:1–14.65:1, above the 4.5:1 normal-text target.

### I. Security and privacy

Passed:

- No legacy or current AI key variable appears in the browser static bundle.
- No secret environment file is tracked.
- No API key pattern was found in repository source.
- Server integration modules do not log plan text or credentials.
- The extraction API enforces JSON content type, 10 KiB body size, meaningful content, and 5000 characters.
- React safely renders user-supplied task text.
- Automated tests mock AI and weather; no test depends on real providers.

The local ignored `.env` may contain developer-managed values, but it is not committed or exposed to the browser.

## Before/after summary

| Severity | Before | After |
| --- | ---: | ---: |
| Critical | 0 | 0 |
| High | 2 | 0 |
| Medium | 4 | 1 documented limitation |
| Low | 3 | 3 documented limitations |

The remaining items do not compromise deterministic rule decisions, expose secrets, create uncaught errors, or prevent completion of the demo/manual workflows.

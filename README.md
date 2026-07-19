# HeatShift — وردية آمنة

[![CI](https://github.com/Aseel-Sh/HeatShift/actions/workflows/ci.yml/badge.svg)](https://github.com/Aseel-Sh/HeatShift/actions/workflows/ci.yml)

HeatShift is a planning application for supervisors preparing a single outdoor crew's next shift in Saudi Arabia. It will turn an unstructured plan into a safer executable schedule using deterministic rules. It is planning guidance only and does not guarantee safety or regulatory compliance.

This repository contains the complete main planning workflow: validated domain models, deterministic Saudi heat-planning rules, a pure five-minute scheduler, server-side OpenRouter plan extraction, Saudi location search and coordinate-based Open-Meteo weather retrieval, deterministic demo data, editable planning steps, and bilingual printable results.

The workflow works without credentials through **Load demo scenario** or **Create tasks manually**. Live AI extraction requires a server-only OpenRouter key in `.env.local`; see `docs/INTEGRATIONS.md`.

## Local setup

Requirements:

- Node.js 22.13 or newer
- npm

Install and start the application:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Install the Playwright browser once before the first end-to-end run:

```bash
npx playwright install chromium
```

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Project boundaries

- `app/` — Next.js App Router pages and future route handlers
- `components/` — UI grouped by product area
- `lib/` — validated domain models, pure rules, deterministic scheduler, server integrations, and demo service
- `data/` — official source metadata, five quick-location presets, and deterministic demo fixtures
- `tests/` — Vitest unit tests and Playwright end-to-end tests
- `docs/` — product scope, architecture, decisions, and progress

See [Product scope](docs/PRODUCT_SCOPE.md), [Architecture](docs/ARCHITECTURE.md), [Design system](docs/DESIGN_SYSTEM.md), [Scheduler](docs/SCHEDULER.md), [Integrations](docs/INTEGRATIONS.md), and [Progress](docs/PROGRESS.md).

The configured midday restriction applies only from 2026-06-15 through 2026-09-15. HeatShift does not silently extend that source-backed configuration to another year; unsupported years remain available for preliminary ordinary scheduling with an explicit warning.

## Verification integrity

Structured schedule rows are parsed deterministically before OpenRouter. Existing shift-form values are authoritative, time ranges produce reviewable requested times and durations, and field-level evidence distinguishes parsed facts from model suggestions. Breaks and meals remain non-work activities and are never defaulted to light work.

Task verification uses a separate draft model: absent AI duration, workload, environment, or splittability remains visibly unknown and blocks scheduling until supplied. Optional requested task times are retained so original-plan findings remain separate from generated-schedule capacity and worker-readiness findings. “Indoor / cooled area” means a conditioned area only; heat-exposed indoor work requires a separate site assessment.

Location search and forecast data are provided by [Open-Meteo](https://open-meteo.com/). Forecasts use the selected Saudi coordinates and remain preliminary planning context, not an on-site measurement or a TWL calculation.

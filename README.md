# HeatShift — وردية آمنة

HeatShift is a planning application for supervisors preparing a single outdoor crew's next shift in Saudi Arabia. It will turn an unstructured plan into a safer executable schedule using deterministic rules. It is planning guidance only and does not guarantee safety or regulatory compliance.

This repository contains the stable project foundation, validated domain models, deterministic Saudi heat-planning rules, pure five-minute scheduler, server-side Gemini plan extraction, Open-Meteo weather retrieval, deterministic demo data, and the Describe → Verify → Conditions workflow. The polished results and report experience is intentionally deferred.

The workflow works without credentials through **Load demo scenario** or **Create tasks manually**. Live AI extraction requires a server-only Gemini key in `.env.local`; see `docs/INTEGRATIONS.md`.

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
- `data/` — official source metadata, fixed city coordinates, and deterministic demo fixtures
- `tests/` — Vitest unit tests and Playwright end-to-end tests
- `docs/` — product scope, architecture, decisions, and progress

See [Product scope](docs/PRODUCT_SCOPE.md), [Architecture](docs/ARCHITECTURE.md), [Scheduler](docs/SCHEDULER.md), [Integrations](docs/INTEGRATIONS.md), and [Progress](docs/PROGRESS.md).

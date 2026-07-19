# HeatShift — وردية آمنة

HeatShift is a planning application for supervisors preparing a single outdoor crew's next shift in Saudi Arabia. It will turn an unstructured plan into a safer executable schedule using deterministic rules. It is planning guidance only and does not guarantee safety or regulatory compliance.

This repository contains the stable project foundation, application shell, validated domain models, and deterministic Saudi heat-planning rules. The scheduler, Gemini extraction, weather integration, and production planning workflow are intentionally not implemented yet.

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
- `lib/` — validated domain models, pure rules, and future integration boundaries; no scheduler yet
- `data/` — official source metadata and future deterministic demo fixtures
- `tests/` — Vitest unit tests and Playwright end-to-end tests
- `docs/` — product scope, architecture, decisions, and progress

See [Product scope](docs/PRODUCT_SCOPE.md), [Architecture](docs/ARCHITECTURE.md), and [Progress](docs/PROGRESS.md).

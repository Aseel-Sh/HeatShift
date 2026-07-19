# Product scope

## Purpose

HeatShift helps an outdoor crew supervisor turn an unstructured daily plan into a safer executable shift plan using Saudi midday-work restrictions, forecast conditions, manually entered on-site TWL risk zones, task workload, task environment, and deterministic work/rest rules.

## Core MVP

The core MVP will support one supervisor planning one crew's shift. It will provide structured plan entry and verification, clearly separated forecast and site-verified condition concepts, deterministic schedule generation, and a planning report. A built-in deterministic demo scenario must allow the complete experience to work without external services.

## Non-negotiable boundaries

- Single crew only
- No authentication
- No database
- No worker names or medical data
- No IoT
- No live monitoring
- No maps
- No chatbot
- No drag-and-drop
- No voice or image upload in the core MVP
- Gemini is used only for structured plan extraction
- Safety decisions are deterministic
- Forecast planning and site-verified TWL planning are shown as separate concepts
- The app works with a built-in deterministic demo scenario
- The app never describes itself as guaranteeing safety or regulatory compliance

## Out of scope for this iteration

- Gemini integration or prompts
- Weather API integration
- Functional language switching
- Plan entry, verification, conditions, schedule, and report workflows
- Production deployment

## Implemented domain scope

- Strongly typed and Zod-validated plan, task, condition, forecast, and conflict models
- Saudi seasonal midday direct-sun restriction evaluation
- Forecast temperature indicators
- Site-verified TWL work/rest and hydration planning guidance
- High-TWL non-acclimatized-worker conflicts
- Intermediate/high-TWL outdoor lone-work warnings
- Deterministic five-minute, single-crew schedule generation
- Priority-based placement, forecast temperature preference, indoor midday preference, and contiguous non-splittable tasks
- TWL work/rest packages, exact unscheduled capacity, schedule metrics, and preliminary results

These pure modules evaluate supplied inputs only. They do not fetch conditions, assign individual workers, or model parallel crews.

## Safety language

User-facing content must use qualified terms such as “safer shift” and “planning guidance.” It must instruct supervisors to verify conditions through qualified on-site safety procedures and must not promise safety, legal compliance, or regulatory compliance.

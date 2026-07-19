# HeatShift design system

## Design principles

HeatShift uses a **field operations board** visual language. The interface prioritizes time, task comparison, crew capacity, weather exposure, restrictions, and consequences. It should feel suitable for a construction or maintenance supervisor preparing a shift, not like a chatbot, marketing page, or generic analytics dashboard.

The hierarchy follows five rules:

1. Show current site, date, crew, and planning status before explanatory content.
2. Keep primary actions safety-yellow and make secondary and tertiary actions visibly quieter.
3. Use dense tables where supervisors compare tasks, then switch those rows to compact stacked panels below the tablet breakpoint.
4. Present weather, TWL input, requested timing, and generated timing as distinct concepts.
5. Never communicate severity, restriction, work, or recovery using color alone; every state also has a label, border treatment, or text alternative.

## Colors

| Token | Value | Use |
| --- | --- | --- |
| Technical paper | `#f3efe5` | Page background and planning grid |
| Surface | `#fffdf7` | Primary work areas |
| Deep ink | `#17232d` | Primary text, table headers, strong rules |
| Muted ink | `#4e5d68` | Supporting labels and explanations |
| Safety yellow | `#f2c230` | Current step and primary planning actions |
| Steel recovery | `#dce8ec` | Recovery blocks and secondary planning context |
| Steel label | `#526f7b` | Operational section labels |
| Critical rust | `#9f352b` | Critical capacity and worker-readiness findings only |
| Rule line | `#c8c0b2` | Grid, table, and section boundaries |

Normal text uses combinations that meet the 4.5:1 contrast target. Critical rust is paired with explicit “Critical” text and a strong border. The restriction band uses hatching, a border, and a textual key so it remains legible without color and in print.

## Typography

The interface uses the system stack `Segoe UI, Tahoma, Arial, sans-serif` for reliable English and Arabic rendering without a web-font dependency. Headings use heavy weights and compact leading. Operational labels are small, uppercase in English, and letter-spaced; Arabic labels do not rely on letter spacing for hierarchy. Times and numeric metrics use tabular figures and remain left-to-right even inside an Arabic interface.

## Spacing and shape

- Base spacing increments are approximately 4, 8, 12, 16, 24, and 32 pixels.
- Corners use 3–5 pixel radii for controls and operational panels.
- Primary workspace sections use borders and whitespace instead of floating rounded cards.
- Forms retain at least a 44-pixel target height where practical.
- Desktop task rows are dense enough for comparison; mobile rows increase vertical separation for touch use.

## Timeline semantics

The requested plan and safer shift share one chronological, left-to-right ruler in both languages. The timeline contains:

- requested blocks at their supplied original positions;
- a separate list for tasks whose requested time was not supplied;
- work blocks in safety yellow;
- recovery blocks in muted steel blue with a “Recovery” label;
- cooled indoor work in a distinct neutral green treatment;
- unscheduled work in a dedicated capacity lane;
- the 12:00–15:00 restriction as a vertically aligned hatched background band, never as a sequential task.

Selecting a requested or generated block reveals its original time, planned time, workload, environment, translated rule explanation, planning consequence, and source where applicable. A complete text alternative follows the visual board for screen-reader and narrow-screen use.

## English and Arabic handling

- The document `lang` and `dir` attributes update with the language control.
- Layout direction follows the selected language, but chronological timeline direction remains left-to-right.
- City names, workload values, work areas, TWL zones, severities, errors, weather labels, and rule explanations are translated.
- Task records retain separate English and Arabic name fields.
- Times, dates, temperatures, percentages, and wind values use tabular figures and explicit direction where necessary.
- Long English and Arabic task names truncate inside timeline blocks but remain fully available in editable fields and the text alternative.

## Do-not-use patterns

Do not introduce:

- sparkle, robot, magic-wand, or chatbot visuals;
- “AI-powered,” “Ask AI,” or “Generate with AI” language;
- gradients, glassmorphism, decorative animation, or stock construction photos;
- large marketing heroes, testimonials, or vanity metrics;
- pill badges as a default container;
- large collections of rounded metric cards;
- internal rule codes in user-facing copy;
- fake safety scores, efficiency percentages, productivity savings, or compliance claims.

AI remains a quiet import mechanism labeled “Import work plan” and “Structure task list.” All safety and scheduling consequences remain deterministic.

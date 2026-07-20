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

## Brand mark and wordmark

The original HeatShift mark combines a sun arc, three shift bars, and one visibly advanced bar inside a compact shield-like square. It is an inline SVG, remains legible at favicon size, and keeps its geometry in monochrome print. The adjacent wordmark is language-specific: English displays only `HeatShift`; Arabic displays only `وردية آمنة` with RTL spacing. The mark is decorative when the adjacent wordmark supplies the accessible name.

## Task review

Task review uses the compact operational table established by the earlier design. Each read-only row presents the facts a supervisor compares repeatedly: bilingual activity name, activity type, requested interval, duration, workload or recovery eligibility, work area, priority, and completion status. A visible Edit button opens one accessible modal, so table values cannot be mistaken for editable or confirmed form controls. The modal saves atomically, traps focus, warns before discarding edits, returns focus to the originating row, and becomes a full-height sheet on narrow screens.

Suggestions are never styled as confirmed values. Each suggestion appears immediately below the input it concerns and provides explicit **Apply** and **Dismiss** actions; applying a suggestion changes only that field. An unresolved suggestion does not prevent continuing when every required safety input is valid. Status labels use `Ready`, `Needs 1 input`, `Needs N inputs`, `Needs dependency review`, and `Conflict`. Opening an incomplete task moves focus to its first unresolved input. The Arabic task-name field is optional and does not require Arabic-script characters. Work-area guidance appears once above the table rather than inside every task.

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

### Plan identity and views

The two plans always use deliberately distinct headings: **Original requested plan** and **Generated safer schedule** (Arabic: **الخطة الأصلية المطلوبة** and **الجدول المُنشأ لوردية أكثر أمانًا**). Both use the same single-crew chronological sequence so the original request cannot be confused with the generated result. The result has no competing Activity schedule mode. Print retains the same compact Fit-shift crew comparison.

Priority has only two user-facing states: **Required today / مطلوب اليوم** and **Normal / عادي**. Both are text-labeled and appear in review, comparisons, both plan views, block details, and unscheduled work. No color or invented three-level priority model carries this meaning.

### Scale and containment

- Interactive schedule views default to **1 hour** for legibility; compact print views use **Fit shift**.
- The **30 minutes** scale uses 260 pixels per hour for close inspection.
- **Fit shift** keeps the full shift inside the timeline region and remains available alongside both detailed scales.
- Detailed scales scroll horizontally inside the timeline region. The document itself must never gain horizontal overflow.
- Chronology remains left-to-right in Arabic; row labels retain Arabic right-to-left text.

### Requested and selected schedules

Crew sequence gives both plans the same horizontal calendar grammar. The original sequence shows supplied activity intervals without generated recovery. The generated sequence shows the one crew's chronological work, recovery, break, meal, idle, and unscheduled capacity. Block width remains proportional to elapsed time. Taller blocks and larger time labels improve scanning without changing represented duration. Narrow blocks use a compact visual marker while their exact interval and full name remain available through the accessible name, title, details panel, and timeline text alternative. The legend uses the same fill, border, and hatch as the rendered blocks and only lists types present in the current result.

Selecting a requested activity highlights every associated generated interval, including task-linked recovery. The details panel lists all planned intervals and explicitly reports remaining unscheduled minutes when applicable.

### Heat and restriction overlays

The compact **Forecast context** ribbon shares the timeline ruler and uses four restrained categories: lower/caution, intermediate, high, and high risk. Every period includes a numeric temperature, category text, apparent-temperature detail, and a screen-reader description. Color is supplementary.

## Result hierarchy

The default report is ordered for a field supervisor: shift identity, plain-language outcome, required actions, requested-versus-selected change table, timeline, detailed findings, hydration, briefing, sources, then collapsed optimization details. The change table is the primary explanation of movement and incomplete work; the proportional timeline is supporting evidence. Candidate count, strategy, movement penalty, and split count stay inside **How HeatShift selected this schedule** and are never presented as a safety score or proof of global optimality.

The direct-sun restriction is a low-opacity aligned hatch with one label above the ruler. The hatch remains visible in monochrome print without obscuring activity text.

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

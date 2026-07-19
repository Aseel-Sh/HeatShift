import { describe, expect, it } from "vitest";
import { parseStructuredPlanRows } from "../../lib/ai/structured-plan-parser";

const regressionPlan = `Crew A - Riyadh
Start 6:00 AM

6:00-6:30 Toolbox talk + prep
6:30-9:00 Excavation
9:00-9:15 Break
9:15-11:30 Rebar + forms
11:30-12:00 Lunch
12:00-2:30 Concrete pour
2:30-3:00 Finish + curing
3:00-4:00 Cleanup

Need concrete completed today. Pump booked only today.`;

const context = { shiftStart: "06:00", shiftEnd: "16:30" };

describe("structured work-plan rows", () => {
  it("parses the supplied regression plan without asking a model to infer times", () => {
    const result = parseStructuredPlanRows(regressionPlan, context);

    expect(result.ambiguities).toEqual([]);
    expect(result.activities).toHaveLength(8);
    expect(result.activities.map(({ requestedStart, requestedEnd, durationMinutes }) => ({ requestedStart, requestedEnd, durationMinutes }))).toEqual([
      { requestedStart: "06:00", requestedEnd: "06:30", durationMinutes: 30 },
      { requestedStart: "06:30", requestedEnd: "09:00", durationMinutes: 150 },
      { requestedStart: "09:00", requestedEnd: "09:15", durationMinutes: 15 },
      { requestedStart: "09:15", requestedEnd: "11:30", durationMinutes: 135 },
      { requestedStart: "11:30", requestedEnd: "12:00", durationMinutes: 30 },
      { requestedStart: "12:00", requestedEnd: "14:30", durationMinutes: 150 },
      { requestedStart: "14:30", requestedEnd: "15:00", durationMinutes: 30 },
      { requestedStart: "15:00", requestedEnd: "16:00", durationMinutes: 60 },
    ]);
    expect(result.activities[2].activityKind).toBe("break");
    expect(result.activities[4].activityKind).toBe("meal");
    expect(result.activities[5]).toMatchObject({
      mustSchedule: true,
      operationalNotes: ["Pump booked only today."],
      timingPreference: "preferred",
    });
    expect(result.activities[5].evidence.durationMinutes).toMatchObject({
      value: 150,
      evidence: "12:00-2:30 Concrete pour",
      source: "deterministic_parser",
    });
  });

  it.each([
    ["6:00-6:30 Task", "06:00", "06:30"],
    ["6:00 – 6:30 Task", "06:00", "06:30"],
    ["6:00—6:30 Task", "06:00", "06:30"],
    ["6:00 AM-6:30 AM Task", "06:00", "06:30"],
    ["14:00-14:30 Task", "14:00", "14:30"],
    ["٦:٠٠ ص-٦:٣٠ ص مهمة", "06:00", "06:30"],
  ])("normalizes accepted range syntax: %s", (line, start, end) => {
    const result = parseStructuredPlanRows(line, context);
    expect(result.activities[0]).toMatchObject({ requestedStart: start, requestedEnd: end });
  });

  it("uses sequential inference through noon", () => {
    const result = parseStructuredPlanRows("11:30-12:00 Task A\n12:00-2:30 Task B\n2:30-3:00 Task C", { shiftStart: "06:00", shiftEnd: "16:30" });
    expect(result.activities.map((task) => [task.requestedStart, task.requestedEnd])).toEqual([
      ["11:30", "12:00"], ["12:00", "14:30"], ["14:30", "15:00"],
    ]);
  });

  it("carries AM/PM inference forward when it appears only on the first row", () => {
    const result = parseStructuredPlanRows("6:00 AM-6:30 Prep\n6:30-9:00 Excavation\n12:00-2:30 Pour", {});
    expect(result.ambiguities).toEqual([]);
    expect(result.activities.map((task) => [task.requestedStart, task.requestedEnd])).toEqual([
      ["06:00", "06:30"], ["06:30", "09:00"], ["12:00", "14:30"],
    ]);
  });

  it("reports an ambiguous range instead of inventing a half-day", () => {
    const result = parseStructuredPlanRows("6:00-7:00 Inspection", {});
    expect(result.activities).toEqual([]);
    expect(result.ambiguities[0]).toContain("6:00-7:00 Inspection");
  });

  it.each([
    ["09:00-09:15 Rest break", "break"],
    ["11:30-12:00 Meal", "meal"],
    ["09:00-09:15 استراحة", "break"],
    ["11:30-12:00 وجبة", "meal"],
  ] as const)("detects non-work activity: %s", (line, activityKind) => {
    expect(parseStructuredPlanRows(line, { shiftStart: "06:00", shiftEnd: "16:30" }).activities[0].activityKind).toBe(activityKind);
  });
});

import { describe, expect, it } from "vitest";
import { getDemoScenario } from "../../lib/demo/get-demo-scenario";
import { generateSchedule } from "../../lib/domain/scheduler";
import { buildHydrationPlan, buildBriefings } from "../../lib/report/report-model";

describe("results report model", () => {
  const demo = getDemoScenario();
  const result = generateSchedule(demo.shiftPlan, demo.siteConditions, demo.forecastHours);

  it("presents source-supported hydration as per-worker hourly guidance", () => {
    const hydration = buildHydrationPlan(demo.shiftPlan, result);
    expect(hydration.kind).toBe("rates");
    expect(hydration.wordingEn).toContain("at least 1.2 L per worker per hour");
    expect(hydration.wordingEn).toContain("personal two-liter bottle warning");
    expect(hydration.wordingEn).not.toContain("across the crew");
  });

  it("does not understate a crew total when any scheduled exposure lacks specified hydration guidance", () => {
    const lowResult = generateSchedule(demo.shiftPlan, { measurementMode: "onsite_twl", twlZone: "low" }, demo.forecastHours);
    const hydration=buildHydrationPlan(demo.shiftPlan, lowResult);
    expect(hydration.wordingEn).toContain("0.6–1.0 L per worker per hour");
    expect(hydration.wordingEn).toContain("No configured heavy-work rate");
  });

  it("builds deterministic bilingual supervisor briefings", () => {
    const briefing = buildBriefings(demo.shiftPlan, demo.siteConditions, result);
    expect(briefing.en.join(" ")).toContain(demo.shiftPlan.siteName);
    expect(briefing.en.join(" ")).toContain("Emergency escalation");
    expect(briefing.ar.join(" ")).toContain("تذكير بالتصعيد في حالات الطوارئ");
  });

  it("the demo visibly exercises capacity, restriction, cycles, indoor midday, and new-worker outcomes", () => {
    expect(result.metrics.unscheduledMinutes).toBeGreaterThan(0);
    expect(result.blocks.some((block) => block.type === "restriction" && block.start === "12:00" && block.end === "15:00")).toBe(true);
    expect(result.blocks.some((block) => block.type === "work" && block.taskId === "demo-trenching" && Number(block.end.slice(3)) - Number(block.start.slice(3)) === 20)).toBe(true);
    expect(result.blocks.some((block) => block.type === "rest" && block.taskId === "demo-trenching")).toBe(true);
    expect(result.blocks.some((block) => block.type === "work" && block.taskId === "demo-equipment-preparation" && block.start >= "12:00" && block.end <= "15:00")).toBe(true);
    expect(result.conflicts.some((conflict) => conflict.severity === "critical" && conflict.code.includes("NON_ACCLIMATIZED"))).toBe(true);
  });
});

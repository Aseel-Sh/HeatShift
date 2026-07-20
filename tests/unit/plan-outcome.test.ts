import { describe, expect, it } from "vitest";
import { getDemoScenario } from "../../lib/demo/get-demo-scenario";
import { generateSchedule } from "../../lib/domain/scheduler";
import type { ScheduleBlock } from "../../lib/domain/scheduler-types";
import { buildPlanOutcome } from "../../lib/report/plan-outcome";

describe("plan outcome restriction wording", () => {
  const demo = getDemoScenario();
  const generated = generateSchedule(demo.shiftPlan, demo.siteConditions, demo.forecastHours);
  const movedBlock: ScheduleBlock = {
    id: "moved-trenching",
    taskId: "demo-trenching",
    type: "work",
    start: "06:30",
    end: "06:50",
    labelEn: "Heavy trenching",
    labelAr: "حفر خندق ثقيل",
    workload: "heavy",
    environment: "direct_sun",
    reasonCodes: ["COOLER_FORECAST_PREFERRED"],
  };

  it("uses restriction-specific movement wording within the configured 2026 season", () => {
    const plan = { ...demo.shiftPlan, shiftDate: "2026-07-20" };
    const result = { ...generated, blocks: [movedBlock] };

    const outcome = buildPlanOutcome(plan, demo.siteConditions, result, "en");

    expect(outcome.changed).toContain("Heavy trenching was moved outside the 12:00–15:00 direct-sun restriction.");
  });

  it.each(["2026-06-14", "2026-09-16", "2027-07-20"])(
    "uses generic movement wording when the verified restriction is inactive on %s",
    (shiftDate) => {
      const plan = { ...demo.shiftPlan, shiftDate };
      const result = { ...generated, blocks: [movedBlock] };

      const outcome = buildPlanOutcome(plan, demo.siteConditions, result, "en");
      const trenchingChange = outcome.changed.find((item) => item.startsWith("Heavy trenching"));

      expect(trenchingChange).toBe("Heavy trenching moved 5 hr earlier.");
      expect(trenchingChange).not.toContain("restriction");
    },
  );
});

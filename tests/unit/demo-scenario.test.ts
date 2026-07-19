import { describe, expect, it } from "vitest";
import { getDemoScenario } from "../../lib/demo/get-demo-scenario";
import { forecastHourSchema, shiftPlanSchema, siteConditionsSchema } from "../../lib/domain/types";

describe("deterministic demo scenario", () => {
  it("returns deeply equal, independently copied Riyadh demo data", () => {
    const first = getDemoScenario();
    const second = getDemoScenario();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first).toMatchObject({
      isDemo: true,
      label: "Demo data — Riyadh July heat-planning scenario",
      shiftPlan: {
        city: "riyadh",
        shiftStart: "06:30",
        shiftEnd: "16:30",
        crewSize: 8,
        nonAcclimatizedWorkers: 2,
      },
      siteConditions: { measurementMode: "onsite_twl", twlZone: "high" },
    });
    expect(shiftPlanSchema.parse(first.shiftPlan)).toEqual(first.shiftPlan);
    expect(siteConditionsSchema.parse(first.siteConditions)).toEqual(
      first.siteConditions,
    );
    expect(first.forecastHours.map((hour) => forecastHourSchema.parse(hour))).toEqual(
      first.forecastHours,
    );
    expect(first.shiftPlan.tasks.map((task) => task.nameEn)).toEqual([
      "Heavy trenching",
      "Contiguous concrete placement",
      "Indoor equipment preparation",
      "Shaded material inspection",
      "Direct-sun cleanup",
    ]);
    expect(first.forecastHours.at(-2)?.temperatureCelsius).toBeGreaterThan(
      first.forecastHours[0].temperatureCelsius,
    );
  });
});

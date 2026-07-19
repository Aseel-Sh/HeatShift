import { describe, expect, it } from "vitest";
import { DEMO_SCENARIO } from "../../data/demo-scenario";
import { generateSchedule } from "../../lib/domain/scheduler";
import { associatedBlocks, forecastRibbonPoints, idleBlocks, requestedInterval } from "../../lib/report/timeline-model";

const result = generateSchedule(DEMO_SCENARIO.shiftPlan, DEMO_SCENARIO.siteConditions, DEMO_SCENARIO.forecastHours);

describe("timeline display model", () => {
  it("links a requested activity to every generated work and recovery interval", () => {
    expect(associatedBlocks(result, "demo-trenching").map((block) => block.type)).toEqual([
      "work", "rest", "work", "rest", "work", "rest",
    ]);
  });

  it("keeps genuinely untimed activities distinct from requested intervals", () => {
    expect(requestedInterval(DEMO_SCENARIO.shiftPlan.tasks[0])).toBe("11:30–13:30");
    expect(requestedInterval({ ...DEMO_SCENARIO.shiftPlan.tasks[0], requestedStart: undefined, requestedEnd: undefined })).toBeNull();
  });

  it("creates exact idle gaps without changing scheduled blocks", () => {
    const gaps = idleBlocks(DEMO_SCENARIO.shiftPlan, result);
    expect(gaps.every((gap) => gap.labelEn === "Idle gap")).toBe(true);
    expect(gaps.every((gap) => gap.start < gap.end)).toBe(true);
  });

  it("includes the preceding forecast point for a partial-hour shift start", () => {
    const forecast = [
      { time: "06:00", temperatureCelsius: 29, apparentTemperatureCelsius: 30, relativeHumidityPercent: 20, windSpeedKph: 5 },
      { time: "07:00", temperatureCelsius: 33, apparentTemperatureCelsius: 35, relativeHumidityPercent: 20, windSpeedKph: 5 },
    ];
    expect(forecastRibbonPoints(forecast, "06:30", "08:00").map((point) => point.time)).toEqual(["06:00", "07:00"]);
  });
});

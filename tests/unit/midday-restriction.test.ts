import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "../../data/official-sources";
import { evaluateMiddayRestriction } from "../../lib/domain/midday-restriction";

describe("Saudi midday direct-sun restriction", () => {
  it.each([
    ["2026-06-14", false],
    ["2026-06-15", true],
    ["2026-09-15", true],
    ["2026-09-16", false],
  ] as const)("reports seasonal status for %s", (date, seasonActive) => {
    expect(
      evaluateMiddayRestriction({
        date,
        time: "12:00",
        environment: "direct_sun",
      }).seasonActive,
    ).toBe(seasonActive);
  });

  it.each([
    ["11:55", "permitted"],
    ["12:00", "blocked"],
    ["14:55", "blocked"],
    ["15:00", "permitted"],
  ] as const)("classifies direct-sun work at %s as %s", (time, status) => {
    expect(
      evaluateMiddayRestriction({
        date: "2026-07-18",
        time,
        environment: "direct_sun",
      }).status,
    ).toBe(status);
  });

  it("permits indoor work during the restricted window", () => {
    expect(
      evaluateMiddayRestriction({
        date: "2026-07-18",
        time: "12:00",
        environment: "indoor",
      }).status,
    ).toBe("permitted");
  });

  it("requires supervisor verification for shaded outdoor work", () => {
    const result = evaluateMiddayRestriction({
      date: "2026-07-18",
      time: "12:00",
      environment: "shaded_outdoor",
    });

    expect(result).toMatchObject({
      status: "supervisor_verification_required",
      sourceId: SOURCE_IDS.middayRestriction,
    });
  });
});

import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "../../data/official-sources";
import {
  getLoneWorkConflict,
  getNonAcclimatizedConflict,
} from "../../lib/domain/twl-conflicts";
import { conflictSchema } from "../../lib/domain/types";

describe("TWL crew conflicts", () => {
  it("returns a critical conflict for non-acclimatized workers at high TWL", () => {
    const conflict = getNonAcclimatizedConflict("high", 2);

    expect(conflictSchema.parse(conflict)).toMatchObject({
      severity: "critical",
      code: "HIGH_TWL_NON_ACCLIMATIZED_WORKERS",
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });

  it.each([
    ["high", 0],
    ["intermediate", 2],
    ["low", 2],
    ["none", 2],
  ] as const)(
    "does not create a non-acclimatized conflict for %s TWL and %d workers",
    (twlZone, workerCount) => {
      expect(getNonAcclimatizedConflict(twlZone, workerCount)).toBeNull();
    },
  );

  it.each(["intermediate", "high"] as const)(
    "warns against lone outdoor work at %s TWL",
    (twlZone) => {
      expect(getLoneWorkConflict(twlZone)).toMatchObject({
        severity: "warning",
        code: "TWL_OUTDOOR_LONE_WORK",
        sourceId: SOURCE_IDS.twlGuidance,
      });
    },
  );

  it.each(["none", "low"] as const)(
    "does not create a lone-work warning at %s TWL",
    (twlZone) => {
      expect(getLoneWorkConflict(twlZone)).toBeNull();
    },
  );
});

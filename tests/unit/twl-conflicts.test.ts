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
    ["none",0,null],["none",1,null],["none",3,null],
    ["low",0,null],["low",1,null],["low",3,null],
    ["intermediate",0,null],["intermediate",1,"warning"],["intermediate",3,"warning"],
    ["high",0,null],["high",1,"critical"],["high",3,"critical"],
  ] as const)("classifies %s TWL with %d non-acclimatized workers",(twlZone,count,severity)=>{
    const conflict=getNonAcclimatizedConflict(twlZone,count);
    if(severity===null)expect(conflict).toBeNull();else expect(conflict).toMatchObject({severity,sourceId:SOURCE_IDS.twlGuidance});
  });

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

import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "../../data/official-sources";
import {
  getHydrationGuidance,
  getWorkRestGuidance,
} from "../../lib/domain/twl-guidance";
import type { TwlZone, Workload } from "../../lib/domain/types";

describe("TWL work/rest planning guidance", () => {
  it.each<
    [TwlZone, Workload, "continuous" | "cycle" | "preliminary", number?, number?]
  >([
    ["low", "light", "continuous"],
    ["low", "heavy", "continuous"],
    ["intermediate", "light", "continuous"],
    ["intermediate", "heavy", "cycle", 45, 15],
    ["high", "light", "cycle", 45, 15],
    ["high", "heavy", "cycle", 20, 40],
    ["none", "light", "preliminary"],
    ["none", "heavy", "preliminary"],
  ])(
    "%s TWL with %s workload returns %s guidance",
    (twlZone, workload, kind, workMinutes, restMinutes) => {
      const result = getWorkRestGuidance(twlZone, workload);

      expect(result).toMatchObject({
        kind,
        sourceId: SOURCE_IDS.twlGuidance,
      });
      if (kind === "cycle") {
        expect(result).toMatchObject({ workMinutes, restMinutes });
      }
    },
  );

  it("marks missing supervisor-entered TWL guidance as preliminary", () => {
    expect(getWorkRestGuidance("none", "heavy")).toEqual({
      kind: "preliminary",
      reason: "supervisor_entered_twl_required",
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });
});

describe("hydration planning guidance", () => {
  it("represents low light guidance as a range", () => {
    expect(getHydrationGuidance("low", "light")).toEqual({
      kind: "range",
      minimumLitersPerHour: 0.6,
      maximumLitersPerHour: 1,
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });

  it("represents intermediate light guidance as a range", () => {
    expect(getHydrationGuidance("intermediate", "light")).toEqual({
      kind: "range",
      minimumLitersPerHour: 1,
      maximumLitersPerHour: 1.2,
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });

  it("represents intermediate heavy guidance as a minimum", () => {
    expect(getHydrationGuidance("intermediate", "heavy")).toEqual({
      kind: "minimum",
      minimumLitersPerHour: 1.2,
      personalBottleWarning: false,
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });

  it.each(["light", "heavy"] as const)(
    "adds the personal bottle warning for high TWL %s work",
    (workload) => {
      expect(getHydrationGuidance("high", workload)).toEqual({
        kind: "minimum",
        minimumLitersPerHour: 1.2,
        personalBottleWarning: true,
        sourceId: SOURCE_IDS.twlGuidance,
      });
    },
  );

  it("keeps unspecified hydration combinations preliminary", () => {
    expect(getHydrationGuidance("none", "light")).toMatchObject({
      kind: "preliminary",
      sourceId: SOURCE_IDS.twlGuidance,
    });
    expect(getHydrationGuidance("low", "heavy")).toMatchObject({
      kind: "preliminary",
      sourceId: SOURCE_IDS.twlGuidance,
    });
  });
});

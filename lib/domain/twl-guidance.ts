import { SOURCE_IDS } from "../../data/official-sources";
import type { TwlZone, Workload } from "./types";

type TwlGuidanceSourceId = typeof SOURCE_IDS.twlGuidance;

export type WorkRestGuidance =
  | {
      kind: "continuous";
      sourceId: TwlGuidanceSourceId;
    }
  | {
      kind: "cycle";
      workMinutes: number;
      restMinutes: number;
      sourceId: TwlGuidanceSourceId;
    }
  | {
      kind: "preliminary";
      reason: "site_verified_twl_required";
      sourceId: TwlGuidanceSourceId;
    };

export type HydrationGuidance =
  | {
      kind: "range";
      minimumLitersPerHour: number;
      maximumLitersPerHour: number;
      sourceId: TwlGuidanceSourceId;
    }
  | {
      kind: "minimum";
      minimumLitersPerHour: number;
      personalBottleWarning: boolean;
      sourceId: TwlGuidanceSourceId;
    }
  | {
      kind: "preliminary";
      reason: "site_verified_twl_required" | "guidance_not_specified";
      sourceId: TwlGuidanceSourceId;
    };

export function getWorkRestGuidance(
  twlZone: TwlZone,
  workload: Workload,
): WorkRestGuidance {
  const sourceId = SOURCE_IDS.twlGuidance;

  if (twlZone === "none") {
    return { kind: "preliminary", reason: "site_verified_twl_required", sourceId };
  }
  if (twlZone === "low" || (twlZone === "intermediate" && workload === "light")) {
    return { kind: "continuous", sourceId };
  }
  if (twlZone === "intermediate" || workload === "light") {
    return { kind: "cycle", workMinutes: 45, restMinutes: 15, sourceId };
  }
  return { kind: "cycle", workMinutes: 20, restMinutes: 40, sourceId };
}

export function getHydrationGuidance(
  twlZone: TwlZone,
  workload: Workload,
): HydrationGuidance {
  const sourceId = SOURCE_IDS.twlGuidance;

  if (twlZone === "low" && workload === "light") {
    return {
      kind: "range",
      minimumLitersPerHour: 0.6,
      maximumLitersPerHour: 1,
      sourceId,
    };
  }
  if (twlZone === "intermediate" && workload === "light") {
    return {
      kind: "range",
      minimumLitersPerHour: 1,
      maximumLitersPerHour: 1.2,
      sourceId,
    };
  }
  if (twlZone === "intermediate" && workload === "heavy") {
    return {
      kind: "minimum",
      minimumLitersPerHour: 1.2,
      personalBottleWarning: false,
      sourceId,
    };
  }
  if (twlZone === "high") {
    return {
      kind: "minimum",
      minimumLitersPerHour: 1.2,
      personalBottleWarning: true,
      sourceId,
    };
  }
  return {
    kind: "preliminary",
    reason:
      twlZone === "none"
        ? "site_verified_twl_required"
        : "guidance_not_specified",
    sourceId,
  };
}

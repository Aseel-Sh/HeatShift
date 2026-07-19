import { SOURCE_IDS } from "../../data/official-sources";
import type { WorkEnvironment } from "./types";

export type MiddayRestrictionStatus =
  | "permitted"
  | "blocked"
  | "supervisor_verification_required";

export interface MiddayRestrictionInput {
  date: string;
  time: string;
  environment: WorkEnvironment;
}

export interface MiddayRestrictionResult {
  seasonActive: boolean;
  restrictedWindowActive: boolean;
  status: MiddayRestrictionStatus;
  sourceId: typeof SOURCE_IDS.middayRestriction;
}

function isSeasonActive(date: string): boolean {
  const monthAndDay = date.slice(5);
  return monthAndDay >= "06-15" && monthAndDay <= "09-15";
}

function isRestrictedWindow(time: string): boolean {
  return time >= "12:00" && time < "15:00";
}

export function evaluateMiddayRestriction(
  input: MiddayRestrictionInput,
): MiddayRestrictionResult {
  const seasonActive = isSeasonActive(input.date);
  const restrictedWindowActive = seasonActive && isRestrictedWindow(input.time);

  let status: MiddayRestrictionStatus = "permitted";
  if (restrictedWindowActive && input.environment === "direct_sun") {
    status = "blocked";
  } else if (
    restrictedWindowActive &&
    input.environment === "shaded_outdoor"
  ) {
    status = "supervisor_verification_required";
  }

  return {
    seasonActive,
    restrictedWindowActive,
    status,
    sourceId: SOURCE_IDS.middayRestriction,
  };
}

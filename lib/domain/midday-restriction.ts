import { SOURCE_IDS } from "../../data/official-sources";
import { SAUDI_MIDDAY_RESTRICTION_2026, UNAVAILABLE_RESTRICTION_MESSAGE } from "../../data/saudi-restriction-rule";
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
  regulatoryGuidanceAvailable: boolean;
  guidanceMessage?: string;
  sourceId: typeof SOURCE_IDS.middayRestriction;
}

function isConfigurationAvailable(date: string): boolean {
  return date.startsWith("2026-");
}

function isSeasonActive(date: string): boolean {
  return date >= SAUDI_MIDDAY_RESTRICTION_2026.effectiveStart && date <= SAUDI_MIDDAY_RESTRICTION_2026.effectiveEnd;
}

function isRestrictedWindow(time: string): boolean {
  return time >= SAUDI_MIDDAY_RESTRICTION_2026.restrictedStart && time < SAUDI_MIDDAY_RESTRICTION_2026.restrictedEnd;
}

export function evaluateMiddayRestriction(
  input: MiddayRestrictionInput,
): MiddayRestrictionResult {
  const regulatoryGuidanceAvailable = isConfigurationAvailable(input.date);
  const seasonActive = regulatoryGuidanceAvailable && isSeasonActive(input.date);
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
    regulatoryGuidanceAvailable,
    guidanceMessage: regulatoryGuidanceAvailable ? undefined : UNAVAILABLE_RESTRICTION_MESSAGE,
    sourceId: SOURCE_IDS.middayRestriction,
  };
}

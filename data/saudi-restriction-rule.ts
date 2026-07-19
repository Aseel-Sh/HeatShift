import { SOURCE_IDS } from "./official-sources";

export const SAUDI_MIDDAY_RESTRICTION_2026 = {
  effectiveStart: "2026-06-15",
  effectiveEnd: "2026-09-15",
  restrictedStart: "12:00",
  restrictedEnd: "15:00",
  restrictedEnvironment: "direct_sun",
  sourceId: SOURCE_IDS.middayRestriction,
} as const;

export const UNAVAILABLE_RESTRICTION_MESSAGE =
  "No verified HeatShift restriction configuration is available for this date.";

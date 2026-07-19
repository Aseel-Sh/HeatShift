import { describe, expect, it } from "vitest";
import {
  shiftPlanSchema,
  siteConditionsSchema,
} from "../../lib/domain/types";
import {
  OFFICIAL_SOURCES,
  SOURCE_IDS,
} from "../../data/official-sources";

describe("domain boundary schemas", () => {
  it("accepts a valid single-crew shift plan", () => {
    const result = shiftPlanSchema.safeParse({
      siteName: "North works yard",
      city: "riyadh",
      shiftDate: "2026-07-18",
      shiftStart: "06:00",
      shiftEnd: "15:00",
      crewSize: 8,
      nonAcclimatizedWorkers: 2,
      tasks: [
        {
          id: "task-1",
          nameEn: "Install barriers",
          nameAr: "تركيب الحواجز",
          durationMinutes: 90,
          workload: "heavy",
          environment: "direct_sun",
          splittable: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid dates, times, counts, and enum values", () => {
    const result = shiftPlanSchema.safeParse({
      siteName: "Yard",
      city: "tabuk",
      shiftDate: "18-07-2026",
      shiftStart: "6am",
      shiftEnd: "25:00",
      crewSize: 0,
      nonAcclimatizedWorkers: -1,
      tasks: [],
    });

    expect(result.success).toBe(false);
  });

  it("keeps manual temperature optional for site conditions", () => {
    expect(
      siteConditionsSchema.parse({
        measurementMode: "onsite_twl",
        twlZone: "high",
      }),
    ).toEqual({ measurementMode: "onsite_twl", twlZone: "high" });
  });

  it("rejects overnight shifts for the MVP", () => {
    const result = shiftPlanSchema.safeParse({
      siteName: "Night works yard",
      city: "riyadh",
      shiftDate: "2026-07-18",
      shiftStart: "22:00",
      shiftEnd: "06:00",
      crewSize: 4,
      nonAcclimatizedWorkers: 0,
      tasks: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["shiftEnd"] }),
      ]),
    );
  });

  it("rejects inputs that cannot be represented by five-minute slots", () => {
    const result = shiftPlanSchema.safeParse({
      siteName: "Yard",
      city: "riyadh",
      shiftDate: "2026-07-18",
      shiftStart: "06:02",
      shiftEnd: "08:00",
      crewSize: 4,
      nonAcclimatizedWorkers: 0,
      tasks: [
        {
          id: "task-1",
          nameEn: "Inspect equipment",
          nameAr: "فحص المعدات",
          durationMinutes: 7,
          workload: "light",
          environment: "conditioned_indoor",
          splittable: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("official source metadata", () => {
  it("provides a human-readable record for every rule source ID", () => {
    expect(OFFICIAL_SOURCES.map((source) => source.id)).toEqual([
      SOURCE_IDS.middayRestriction,
      SOURCE_IDS.temperatureIndicator,
      SOURCE_IDS.twlGuidance,
    ]);
    expect(OFFICIAL_SOURCES.every((source) => source.url.startsWith("https://"))).toBe(
      true,
    );
  });
});

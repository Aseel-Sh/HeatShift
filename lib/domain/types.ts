import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);
export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Expected time in HH:mm format")
  .refine((time) => Number(time.slice(3)) % 5 === 0, {
    message: "Time must align to a five-minute slot",
  });

export const saudiCitySchema = z.enum([
  "riyadh",
  "jeddah",
  "dammam",
  "mecca",
  "medina",
]);
export type SaudiCity = z.infer<typeof saudiCitySchema>;

export const workloadSchema = z.enum(["light", "heavy"]);
export type Workload = z.infer<typeof workloadSchema>;

export const workEnvironmentSchema = z.enum([
  "direct_sun",
  "shaded_outdoor",
  "conditioned_indoor",
]);
export type WorkEnvironment = z.infer<typeof workEnvironmentSchema>;

export const activityKindSchema = z.enum(["work", "break", "meal"]);
export type ActivityKind = z.infer<typeof activityKindSchema>;
export const recoveryEligibilitySchema = z.enum(["unknown", "eligible", "not_eligible"]);
export type RecoveryEligibility = z.infer<typeof recoveryEligibilitySchema>;
export const timingPreferenceSchema = z.enum(["fixed", "preferred", "flexible"]);
export type TimingPreference = z.infer<typeof timingPreferenceSchema>;

export const measurementModeSchema = z.enum(["forecast", "onsite_twl"]);
export type MeasurementMode = z.infer<typeof measurementModeSchema>;

export const twlZoneSchema = z.enum(["none", "low", "intermediate", "high"]);
export type TwlZone = z.infer<typeof twlZoneSchema>;

export const workTaskSchema = z.object({
  id: nonEmptyStringSchema,
  nameEn: nonEmptyStringSchema,
  nameAr: nonEmptyStringSchema,
  durationMinutes: z
    .number()
    .int()
    .positive()
    .refine((minutes) => minutes % 5 === 0, {
      message: "Duration must be a multiple of five minutes",
    }),
  workload: workloadSchema,
  environment: workEnvironmentSchema,
  splittable: z.boolean(),
  activityKind: z.literal("work").optional(),
  mustSchedule: z.boolean().optional(),
  operationalNotes: z.array(nonEmptyStringSchema).optional(),
  timingPreference: timingPreferenceSchema.optional(),
  requestedStart: timeSchema.optional(),
  requestedEnd: timeSchema.optional(),
});
export type WorkTask = z.infer<typeof workTaskSchema>;

export const shiftPlanSchema = z
  .object({
    siteName: nonEmptyStringSchema,
    city: saudiCitySchema,
    shiftDate: z.iso.date(),
    shiftStart: timeSchema,
    shiftEnd: timeSchema,
    crewSize: z.number().int().positive(),
    nonAcclimatizedWorkers: z.number().int().nonnegative(),
    tasks: z.array(workTaskSchema),
  })
  .refine((plan) => plan.shiftStart < plan.shiftEnd, {
    message: "Overnight and zero-length shifts are not supported in the MVP",
    path: ["shiftEnd"],
  });
export type ShiftPlan = z.infer<typeof shiftPlanSchema>;

export const siteConditionsSchema = z.object({
  measurementMode: measurementModeSchema,
  twlZone: twlZoneSchema,
  manualTemperatureCelsius: z.number().optional(),
});
export type SiteConditions = z.infer<typeof siteConditionsSchema>;

export const forecastHourSchema = z.object({
  time: timeSchema,
  temperatureCelsius: z.number(),
  apparentTemperatureCelsius: z.number(),
  relativeHumidityPercent: z.number().min(0).max(100),
  windSpeedKph: z.number().nonnegative(),
});
export type ForecastHour = z.infer<typeof forecastHourSchema>;

export const conflictSeveritySchema = z.enum(["info", "warning", "critical"]);
export type ConflictSeverity = z.infer<typeof conflictSeveritySchema>;

export const conflictSchema = z.object({
  id: nonEmptyStringSchema,
  severity: conflictSeveritySchema,
  code: nonEmptyStringSchema,
  titleEn: nonEmptyStringSchema,
  titleAr: nonEmptyStringSchema,
  descriptionEn: nonEmptyStringSchema,
  descriptionAr: nonEmptyStringSchema,
  taskId: nonEmptyStringSchema.optional(),
  sourceId: nonEmptyStringSchema,
});
export type Conflict = z.infer<typeof conflictSchema>;

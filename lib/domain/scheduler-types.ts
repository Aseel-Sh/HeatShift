import { z } from "zod";
import {
  conflictSchema,
  twlZoneSchema,
  workloadSchema,
  workEnvironmentSchema,
} from "./types";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const reasonCodesSchema = z.array(z.string().min(1)).min(1);

export const scheduleBlockSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1).optional(),
  type: z.enum(["work", "rest", "restriction"]),
  start: timeSchema,
  end: timeSchema,
  labelEn: z.string().min(1),
  labelAr: z.string().min(1),
  workload: workloadSchema.optional(),
  environment: workEnvironmentSchema.optional(),
  reasonCodes: reasonCodesSchema,
});
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;

export const unscheduledTaskSchema = z.object({
  taskId: z.string().min(1),
  taskName: z.string().min(1),
  unscheduledMinutes: z.number().int().positive(),
  reasonCode: z.string().min(1),
});
export type UnscheduledTask = z.infer<typeof unscheduledTaskSchema>;

const hydrationGuidanceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("range"),
    minimumLitersPerHour: z.number().nonnegative(),
    maximumLitersPerHour: z.number().nonnegative(),
    sourceId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("minimum"),
    minimumLitersPerHour: z.number().nonnegative(),
    personalBottleWarning: z.boolean(),
    sourceId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("preliminary"),
    reason: z.enum(["site_verified_twl_required", "guidance_not_specified"]),
    sourceId: z.string().min(1),
  }),
]);

export const hydrationPlanningSchema = z.object({
  twlZone: twlZoneSchema,
  light: hydrationGuidanceSchema,
  heavy: hydrationGuidanceSchema,
});
export type HydrationPlanning = z.infer<typeof hydrationPlanningSchema>;

export const scheduleMetricsSchema = z.object({
  totalShiftMinutes: z.number().int().nonnegative(),
  scheduledWorkMinutes: z.number().int().nonnegative(),
  restMinutes: z.number().int().nonnegative(),
  restrictionMinutes: z.number().int().nonnegative(),
  unscheduledMinutes: z.number().int().nonnegative(),
  peakForecastTemperature: z.number().nullable(),
  hydrationPlanning: hydrationPlanningSchema,
});
export type ScheduleMetrics = z.infer<typeof scheduleMetricsSchema>;

export const scheduleResultSchema = z.object({
  blocks: z.array(scheduleBlockSchema),
  conflicts: z.array(conflictSchema),
  unscheduled: z.array(unscheduledTaskSchema),
  metrics: scheduleMetricsSchema,
  explanationSummary: z.string().min(1),
  isPreliminary: z.boolean(),
});
export type ScheduleResult = z.infer<typeof scheduleResultSchema>;

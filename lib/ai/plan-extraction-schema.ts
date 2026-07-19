import { z } from "zod";
import { saudiCitySchema, workloadSchema, workEnvironmentSchema } from "../domain/types";

const optionalTextSchema = z.string().trim().min(1).optional();
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const parsePlanRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Plan text must contain at least 10 meaningful characters.")
    .max(5000, "Plan text must not exceed 5000 characters.")
    .refine(
      (text) => (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 5,
      "Plan text must contain meaningful letters or numbers.",
    ),
  context: z.object({
    siteName: z.string().trim().optional(),
    locationName: z.string().trim().optional(),
    shiftDate: z.iso.date().or(z.literal("")).optional(),
    shiftStart: timeSchema.or(z.literal("")).optional(),
    shiftEnd: timeSchema.or(z.literal("")).optional(),
    crewSize: z.number().int().positive().optional(),
    nonAcclimatizedWorkers: z.number().int().nonnegative().optional(),
  }).strict().default({}),
});
export type ParsePlanRequest = z.infer<typeof parsePlanRequestSchema>;

export const activityKindSchema = z.enum(["work", "break", "meal"]);
export const recoveryEligibilitySchema = z.enum(["unknown", "eligible", "not_eligible"]);
export const timingPreferenceSchema = z.enum(["fixed", "preferred", "flexible"]);
export const evidenceSourceSchema = z.enum(["deterministic_parser", "explicit_model_extraction", "inferred_suggestion"]);
export const fieldEvidenceSchema = z.object({
  value: z.unknown(),
  evidence: z.string().trim().min(1),
  source: evidenceSourceSchema,
}).strict();

export const extractedTaskSchema = z
  .object({
    nameEn: z.string().trim().min(1),
    nameAr: z.string().trim().min(1),
    activityKind: activityKindSchema.optional(),
    durationMinutes: z.number().int().positive().optional(),
    workload: workloadSchema.optional(),
    environment: workEnvironmentSchema.optional(),
    splittable: z.boolean().optional(),
    recoveryEligibility: recoveryEligibilitySchema.optional(),
    requestedStart: timeSchema.optional(),
    requestedEnd: timeSchema.optional(),
    mustSchedule: z.boolean().optional(),
    operationalNotes: z.array(z.string().trim().min(1)).optional(),
    timingPreference: timingPreferenceSchema.optional(),
    suggestedWorkload: workloadSchema.optional(),
    suggestedEnvironment: workEnvironmentSchema.optional(),
    suggestedSplittable: z.boolean().optional(),
    evidence: z.record(z.string(), fieldEvidenceSchema).optional(),
  })
  .strict();

export const extractedPlanSchema = z
  .object({
    siteName: optionalTextSchema,
    city: saudiCitySchema.optional(),
    shiftDate: z.iso.date().optional(),
    shiftStart: timeSchema.optional(),
    shiftEnd: timeSchema.optional(),
    crewSize: z.number().int().positive().optional(),
    nonAcclimatizedWorkers: z.number().int().nonnegative().optional(),
    tasks: z.array(extractedTaskSchema),
    assumptions: z.array(z.string().trim().min(1)),
    missingInformation: z.array(z.string().trim().min(1)),
  })
  .strict();
export type ExtractedPlan = z.infer<typeof extractedPlanSchema>;

export const extractedPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    siteName: { type: "string" },
    city: {
      type: "string",
      enum: ["riyadh", "jeddah", "dammam", "mecca", "medina"],
    },
    shiftDate: { type: "string", format: "date" },
    shiftStart: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Overall crew shift start; never use as a task start unless explicitly stated for that task." },
    shiftEnd: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Overall crew shift end; never use as a task end unless explicitly stated for that task." },
    crewSize: { type: "integer", minimum: 1, description: "Total crew size explicitly stated in the plan." },
    nonAcclimatizedWorkers: { type: "integer", minimum: 0, description: "Explicit count of new or non-acclimatized workers." },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nameEn", "nameAr"],
        properties: {
          nameEn: { type: "string" },
          nameAr: { type: "string" },
          activityKind: { type: "string", enum: ["work", "break", "meal"] },
          durationMinutes: { type: "integer", minimum: 1, description: "Task duration explicitly stated in minutes; independent of any requested time window." },
          workload: { type: "string", enum: ["light", "heavy"] },
          environment: {
            type: "string",
            enum: ["direct_sun", "shaded_outdoor", "conditioned_indoor"],
          },
          splittable: { type: "boolean" },
          recoveryEligibility: { type: "string", enum: ["unknown", "eligible", "not_eligible"] },
          requestedStart: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Only a time explicitly tied to this task; never default to shiftStart." },
          requestedEnd: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Only a time explicitly tied to this task; never default to shiftEnd." },
          mustSchedule: { type: "boolean" },
          operationalNotes: { type: "array", items: { type: "string" } },
          timingPreference: { type: "string", enum: ["fixed", "preferred", "flexible"] },
          suggestedWorkload: { type: "string", enum: ["light", "heavy"] },
          suggestedEnvironment: { type: "string", enum: ["direct_sun", "shaded_outdoor", "conditioned_indoor"] },
          suggestedSplittable: { type: "boolean" },
        },
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
  },
  required: ["tasks", "assumptions", "missingInformation"],
} as const;

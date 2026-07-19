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
});
export type ParsePlanRequest = z.infer<typeof parsePlanRequestSchema>;

export const extractedTaskSchema = z
  .object({
    nameEn: z.string().trim().min(1),
    nameAr: z.string().trim().min(1),
    durationMinutes: z.number().int().positive().optional(),
    workload: workloadSchema.optional(),
    environment: workEnvironmentSchema.optional(),
    splittable: z.boolean().optional(),
    requestedStart: timeSchema.optional(),
    requestedEnd: timeSchema.optional(),
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
          durationMinutes: { type: "integer", minimum: 1, description: "Task duration explicitly stated in minutes; independent of any requested time window." },
          workload: { type: "string", enum: ["light", "heavy"] },
          environment: {
            type: "string",
            enum: ["direct_sun", "shaded_outdoor", "conditioned_indoor"],
          },
          splittable: { type: "boolean" },
          requestedStart: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Only a time explicitly tied to this task; never default to shiftStart." },
          requestedEnd: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$", description: "Only a time explicitly tied to this task; never default to shiftEnd." },
        },
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
  },
  required: ["tasks", "assumptions", "missingInformation"],
} as const;

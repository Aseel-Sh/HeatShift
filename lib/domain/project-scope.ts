import { z } from "zod";

export const projectScopeSchema = z.object({
  crewMode: z.literal("single"),
  persistence: z.literal("none"),
  safetyDecisionMode: z.literal("deterministic"),
});

export const projectScope = projectScopeSchema.parse({
  crewMode: "single",
  persistence: "none",
  safetyDecisionMode: "deterministic",
});

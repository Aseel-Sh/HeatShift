import { IntegrationError } from "../server/api-errors";
import { OpenRouterClient, type ChatCompletionsClient } from "./provider";
import {
  extractedPlanJsonSchema,
  extractedPlanSchema,
  type ExtractedPlan,
  type ParsePlanRequest,
} from "./plan-extraction-schema";
import {
  parseStructuredPlanRows,
  type FieldEvidence,
  type ParsedActivity,
} from "./structured-plan-parser";

const SYSTEM_INSTRUCTION = `You extract structured work-plan facts only.
- Form context supplied by the application is authoritative. Do not contradict it or report a contextual field as missing.
- Never invent a regulation or determine whether the plan is safe.
- Never invent absent dates, times, durations, crew counts, locations, or equipment booking times.
- Simple time rows are parsed deterministically by the application. Preserve their activity order and do not reinterpret their times.
- A parsed time range supplies requestedStart, requestedEnd, and a calculated duration.
- Classify obvious breaks and meals as break or meal, never as light work.
- Workload, environment, and splittability may be returned as suggested fields when inferred from an activity name. Suggestions are not verified facts.
- Mark mustSchedule only for an explicit must-complete statement. Keep equipment constraints as notes unless an exact equipment time is stated.
- Put unresolved interpretation decisions in assumptions and genuinely absent information in missingInformation.
- Translate task names into concise Arabic.
- Never make safety or scheduling decisions.
- Return only schema-valid JSON.`;

export type { ChatCompletionsClient } from "./provider";
export interface ExtractionOptions {
  apiKey: string;
  model: string;
  context?: ParsePlanRequest["context"];
  signal?: AbortSignal;
  client?: ChatCompletionsClient;
}
export interface PlanExtractionResult { plan: ExtractedPlan; metadata: { actualModel: string | null } }

const CITY_ALIASES = {
  riyadh: ["riyadh", "الرياض"],
  jeddah: ["jeddah", "jedda", "جدة"],
  dammam: ["dammam", "الدمام"],
  mecca: ["mecca", "makkah", "مكة", "مكة المكرمة"],
  medina: ["medina", "madinah", "المدينة", "المدينة المنورة"],
} as const;
const NUMBER_WORDS: Record<number, string[]> = {
  0: ["zero"], 1: ["one"], 2: ["two"], 3: ["three"], 4: ["four"], 5: ["five"],
  6: ["six"], 7: ["seven"], 8: ["eight"], 9: ["nine"], 10: ["ten"],
};

function cityFromLocation(location?: string): ExtractedPlan["city"] {
  const normalized = location?.trim().toLowerCase();
  if (!normalized) return undefined;
  return (Object.entries(CITY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalized === alias || normalized.includes(alias)))?.[0] as ExtractedPlan["city"]) ?? undefined;
}

function removeResolvedMissing(items: string[], context: ParsePlanRequest["context"]): string[] {
  const resolved: RegExp[] = [];
  if (context.siteName?.trim()) resolved.push(/site/i);
  if (cityFromLocation(context.locationName)) resolved.push(/city|location/i);
  if (context.shiftDate) resolved.push(/date/i);
  if (context.shiftStart) resolved.push(/shift start|start time/i);
  if (context.shiftEnd) resolved.push(/shift end|end time|complete shift times/i);
  if (context.crewSize !== undefined) resolved.push(/crew size|workers? count|crew.*stated/i);
  if (context.nonAcclimatizedWorkers !== undefined) resolved.push(/new.worker|non.acclimatized/i);
  return items.filter((item) => !resolved.some((pattern) => pattern.test(item)));
}

function sourceLineForTask(text: string, taskName: string): string | undefined {
  const terms = taskName.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  return text.split(/\r?\n/).map((line) => line.trim()).find((line) => {
    const lower = line.toLowerCase();
    return terms.some((term) => lower.includes(term));
  });
}

function explicitEvidence<T>(value: T, line: string): FieldEvidence<T> {
  return { value, evidence: line, source: "explicit_model_extraction" };
}

function countEvidence(text: string, value: number, kind: "crew" | "new"): boolean {
  const terms = [String(value), ...(NUMBER_WORDS[value] ?? [])].join("|");
  return kind === "crew"
    ? new RegExp(`(?:crew(?:\\s+size)?|team)(?:\\D{0,20})(?:${terms})|(?:${terms})(?:\\s+)(?:workers|people|person crew)`, "i").test(text)
    : new RegExp(`(?:${terms})(?:\\s+)(?:new|non[- ]acclimatized)|(?:new|non[- ]acclimatized)(?:\\D{0,20})(?:${terms})`, "i").test(text);
}

function guardPlanScalars(plan: ExtractedPlan, text: string): ExtractedPlan {
  const guarded = { ...plan };
  const normalized = text.toLowerCase();
  if (guarded.city && !CITY_ALIASES[guarded.city].some((alias) => normalized.includes(alias))) delete guarded.city;
  if (guarded.shiftDate && !normalized.includes(guarded.shiftDate)) delete guarded.shiftDate;
  if (guarded.shiftStart && !normalized.includes(guarded.shiftStart)) delete guarded.shiftStart;
  if (guarded.shiftEnd && !normalized.includes(guarded.shiftEnd)) delete guarded.shiftEnd;
  if (guarded.crewSize !== undefined && !countEvidence(normalized, guarded.crewSize, "crew")) delete guarded.crewSize;
  if (guarded.nonAcclimatizedWorkers !== undefined && !countEvidence(normalized, guarded.nonAcclimatizedWorkers, "new")) delete guarded.nonAcclimatizedWorkers;
  return guarded;
}

function guardModelTasks(plan: ExtractedPlan, text: string): ExtractedPlan["tasks"] {
  return plan.tasks.map((task): ExtractedPlan["tasks"][number] | null => {
    const line = sourceLineForTask(text, task.nameEn) ?? sourceLineForTask(text, task.nameAr);
    const evidence = { ...(task.evidence ?? {}) };
    const guarded = { ...task, evidence };
    const activityName = `${task.nameEn} ${task.nameAr}`.toLowerCase();
    if (/\b(?:lunch|meal)\b|(?:غداء|وجبة)/u.test(activityName)) guarded.activityKind = "meal";
    else if (/\b(?:break|rest break)\b|(?:استراحة|راحة)/u.test(activityName)) guarded.activityKind = "break";
    else guarded.activityKind = "work";
    if (!line) {
      return null;
    }
    evidence.nameEn = explicitEvidence(task.nameEn, line);
    evidence.nameAr = explicitEvidence(task.nameAr, line);
    evidence.activityKind = { value: guarded.activityKind, evidence: line, source: "deterministic_parser" };
    if (task.durationMinutes !== undefined) {
      if (new RegExp(`(^|\\D)${task.durationMinutes}(?=\\D|$)`).test(line)) evidence.durationMinutes = explicitEvidence(task.durationMinutes, line);
      else delete guarded.durationMinutes;
    }
    for (const field of ["requestedStart", "requestedEnd"] as const) {
      if (task[field] && line.includes(task[field]!)) evidence[field] = explicitEvidence(task[field]!, line);
      else delete guarded[field];
    }
    const lower = line.toLowerCase();
    if (task.workload && new RegExp(`\\b${task.workload}\\b`).test(lower)) evidence.workload = explicitEvidence(task.workload, line);
    else if (task.workload) { guarded.suggestedWorkload = task.workload; evidence.suggestedWorkload = { value:task.workload,evidence:line,source:"inferred_suggestion" }; delete guarded.workload; }
    const environmentTerms = {
      direct_sun: /direct[ -]sun|under (?:the )?sun|تحت الشمس/u,
      shaded_outdoor: /shade|shaded|مظلل|الظل/u,
      conditioned_indoor: /conditioned|cooled|indoor|داخل/u,
    } as const;
    if (task.environment && environmentTerms[task.environment].test(lower)) evidence.environment = explicitEvidence(task.environment, line);
    else if (task.environment) { guarded.suggestedEnvironment = task.environment; evidence.suggestedEnvironment = { value:task.environment,evidence:line,source:"inferred_suggestion" }; delete guarded.environment; }
    if (task.splittable !== undefined && /split|splittable|divide|تقسيم|تجزئة/u.test(lower)) evidence.splittable = explicitEvidence(task.splittable, line);
    else if (task.splittable !== undefined) { guarded.suggestedSplittable = task.splittable; evidence.suggestedSplittable = { value:task.splittable,evidence:line,source:"inferred_suggestion" }; delete guarded.splittable; }
    for (const field of ["suggestedWorkload", "suggestedEnvironment", "suggestedSplittable"] as const) {
      if (guarded[field] !== undefined && !evidence[field]) evidence[field] = { value:guarded[field],evidence:line,source:"inferred_suggestion" };
    }
    if (guarded.mustSchedule) {
      if (/must|need.+(?:complete|finish)|يجب|لا بد/u.test(lower)) evidence.mustSchedule = explicitEvidence(true, line);
      else delete guarded.mustSchedule;
    }
    if (guarded.operationalNotes?.length) evidence.operationalNotes = explicitEvidence(guarded.operationalNotes, line);
    if (guarded.timingPreference) {
      const validTiming = guarded.timingPreference !== "fixed" || /fixed|cannot move|booked\s+(?:from|between)/u.test(lower);
      if (validTiming) evidence.timingPreference = explicitEvidence(guarded.timingPreference, line);
      else guarded.timingPreference = "preferred";
    }
    if (guarded.activityKind !== "work") {
      delete guarded.workload; delete guarded.environment; delete guarded.splittable;
      delete guarded.suggestedWorkload; delete guarded.suggestedEnvironment; delete guarded.suggestedSplittable;
      guarded.recoveryEligibility = "unknown";
    }
    return guarded;
  }).filter((task): task is ExtractedPlan["tasks"][number] => task !== null);
}

function parsedActivityToTask(activity: ParsedActivity, modelTask?: ExtractedPlan["tasks"][number]): ExtractedPlan["tasks"][number] {
  const work = activity.activityKind === "work";
  return {
    nameEn: activity.nameEn,
    nameAr: modelTask?.nameAr || activity.nameAr,
    activityKind: activity.activityKind,
    durationMinutes: activity.durationMinutes,
    requestedStart: activity.requestedStart,
    requestedEnd: activity.requestedEnd,
    timingPreference: activity.timingPreference,
    ...(activity.mustSchedule ? { mustSchedule: true } : {}),
    ...(activity.operationalNotes.length ? { operationalNotes: activity.operationalNotes } : {}),
    ...(work ? {
      suggestedWorkload: activity.suggestedWorkload ?? modelTask?.suggestedWorkload ?? modelTask?.workload,
      suggestedEnvironment: modelTask?.suggestedEnvironment ?? modelTask?.environment,
      suggestedSplittable: modelTask?.suggestedSplittable ?? modelTask?.splittable,
    } : { recoveryEligibility: "unknown" as const }),
    evidence: { ...(modelTask?.evidence ?? {}), ...activity.evidence },
  };
}

function mergeExtraction(modelPlan: ExtractedPlan, text: string, context: ParsePlanRequest["context"]): ExtractedPlan {
  modelPlan = guardPlanScalars(modelPlan, text);
  const parsedRows = parseStructuredPlanRows(text, { shiftStart: context.shiftStart, shiftEnd: context.shiftEnd });
  const guardedModelTasks = guardModelTasks(modelPlan, text);
  const tasks = parsedRows.activities.length
    ? parsedRows.activities.map((activity, index) => parsedActivityToTask(activity, guardedModelTasks[index]))
    : guardedModelTasks;
  const contextCity = cityFromLocation(context.locationName);
  return {
    ...(context.siteName?.trim() ? { siteName: context.siteName.trim() } : modelPlan.siteName ? { siteName: modelPlan.siteName } : {}),
    ...(contextCity ? { city: contextCity } : modelPlan.city ? { city: modelPlan.city } : {}),
    ...(context.shiftDate ? { shiftDate: context.shiftDate } : modelPlan.shiftDate ? { shiftDate: modelPlan.shiftDate } : {}),
    ...(context.shiftStart ? { shiftStart: context.shiftStart } : modelPlan.shiftStart ? { shiftStart: modelPlan.shiftStart } : {}),
    ...(context.shiftEnd ? { shiftEnd: context.shiftEnd } : modelPlan.shiftEnd ? { shiftEnd: modelPlan.shiftEnd } : {}),
    ...(context.crewSize !== undefined ? { crewSize: context.crewSize } : modelPlan.crewSize !== undefined ? { crewSize: modelPlan.crewSize } : {}),
    ...(context.nonAcclimatizedWorkers !== undefined ? { nonAcclimatizedWorkers: context.nonAcclimatizedWorkers } : modelPlan.nonAcclimatizedWorkers !== undefined ? { nonAcclimatizedWorkers: modelPlan.nonAcclimatizedWorkers } : {}),
    tasks,
    assumptions: removeResolvedMissing(modelPlan.assumptions, context),
    missingInformation: [
      ...removeResolvedMissing(modelPlan.missingInformation, context),
      ...parsedRows.ambiguities,
    ],
  };
}

export function extractDeterministicPlan(text: string, context: ParsePlanRequest["context"] = {}): ExtractedPlan | null {
  const parsedRows = parseStructuredPlanRows(text, { shiftStart: context.shiftStart, shiftEnd: context.shiftEnd });
  if (!parsedRows.activities.length) return null;
  return mergeExtraction({ tasks:[], assumptions:[], missingInformation:[] }, text, context);
}

function classifyProviderError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) return error;
  if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
    return new IntegrationError("AI_TIMEOUT", "Plan extraction timed out. Try again or create tasks manually.", 504);
  }
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
  if (status === 429) return new IntegrationError("AI_RATE_LIMITED", "The free AI service is busy or rate limited. Try again later or create tasks manually.", 429);
  return new IntegrationError("AI_UNAVAILABLE", "Plan extraction is temporarily unavailable. Create tasks manually or try again later.", 503);
}

export async function extractPlan(text: string, options: ExtractionOptions): Promise<PlanExtractionResult> {
  const client = options.client ?? new OpenRouterClient(options.apiKey);
  const context = options.context ?? {};
  const parsedRows = parseStructuredPlanRows(text, { shiftStart: context.shiftStart, shiftEnd: context.shiftEnd });
  const user = `${text}\n\nAuthoritative form context:\n${JSON.stringify(context)}\n\nDeterministically parsed rows:\n${JSON.stringify(parsedRows)}`;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.complete({
          model: options.model,
          system: SYSTEM_INSTRUCTION,
          user,
          responseFormat: { type: "json_schema", json_schema: { name: "heatshift_plan", strict: true, schema: extractedPlanJsonSchema } },
          signal: options.signal,
        });
        let decoded: unknown;
        try { decoded = JSON.parse(response.content); }
        catch { throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502); }
        const parsed = extractedPlanSchema.safeParse(decoded);
        if (!parsed.success) throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502);
        return { plan: mergeExtraction(parsed.data, text, context), metadata: { actualModel: response.model ?? null } };
      } catch (error) {
        if (attempt === 0 && error instanceof IntegrationError && error.code === "AI_INVALID_RESPONSE") continue;
        throw error;
      }
    }
    throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502);
  } catch (error) {
    const deterministic = extractDeterministicPlan(text, context);
    if (deterministic) return { plan:deterministic, metadata:{actualModel:null} };
    throw classifyProviderError(error);
  }
}

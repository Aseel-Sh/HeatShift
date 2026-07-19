import { IntegrationError } from "../server/api-errors";
import { OpenRouterClient, type ChatCompletionsClient } from "./provider";
import { extractedPlanJsonSchema, extractedPlanSchema, type ExtractedPlan } from "./plan-extraction-schema";

const SYSTEM_INSTRUCTION = `You extract structured work-plan facts only.
- Never invent a regulation or determine whether the plan is safe.
- Never invent absent dates, times, durations, crew counts, or locations.
- Extract shift facts exactly when stated, including city, date, shift start/end, crew size, and new-worker count.
- Extract an explicit task duration such as "takes 45 minutes" even when no task start time is stated.
- Extract requestedStart and requestedEnd only when the text explicitly ties those times to that task.
- Never copy the shift start or shift end into a task. A shift boundary is not a task request time.
- A task request window and a task duration are separate facts; preserve both when both are stated.
- Map explicitly indoor work to conditioned_indoor and explicitly shaded outdoor work to shaded_outdoor.
- Do not infer workload, environment, or splittability when the text does not state it.
- Put uncertain or absent information in missingInformation.
- Put interpretation decisions in assumptions.
- Translate task names into concise Arabic.
- Return only schema-valid JSON.`;

export type { ChatCompletionsClient } from "./provider";
export interface ExtractionOptions { apiKey: string; model: string; signal?: AbortSignal; client?: ChatCompletionsClient }
export interface PlanExtractionResult { plan: ExtractedPlan; metadata: { actualModel: string | null } }

const NUMBER_WORDS: Record<number, string[]> = {
  0: ["zero", "صفر"], 1: ["one", "واحد", "واحدة"], 2: ["two", "اثنان", "اثنين", "اثنتان", "عاملان", "عاملين"],
  3: ["three", "ثلاثة"], 4: ["four", "أربعة"], 5: ["five", "خمسة"], 6: ["six", "ستة"],
  7: ["seven", "سبعة"], 8: ["eight", "ثمانية"], 9: ["nine", "تسعة"], 10: ["ten", "عشرة"],
};
const MONTH_NAMES = [
  ["january", "يناير"], ["february", "فبراير"], ["march", "مارس"], ["april", "أبريل", "ابريل"],
  ["may", "مايو"], ["june", "يونيو"], ["july", "يوليو"], ["august", "أغسطس", "اغسطس"],
  ["september", "سبتمبر"], ["october", "أكتوبر", "اكتوبر"], ["november", "نوفمبر"], ["december", "ديسمبر"],
];

function normalizeEvidence(text: string): string {
  return text.toLowerCase().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function hasNumberEvidence(text: string, value: number): boolean {
  return new RegExp(`(^|\\D)${value}(?=\\D|$)`).test(text) || (NUMBER_WORDS[value] ?? []).some((word) => text.includes(word));
}

function hasDateEvidence(text: string, date: string): boolean {
  if (text.includes(date)) return true;
  const [year, month, day] = date.split("-").map(Number);
  return text.includes(String(year)) && hasNumberEvidence(text, day) && MONTH_NAMES[month - 1].some((name) => text.includes(name));
}

function addMissing(missing: string[], message: string): void {
  if (!missing.includes(message)) missing.push(message);
}

function requireEvidence(plan: ExtractedPlan, sourceText: string): ExtractedPlan {
  const text = normalizeEvidence(sourceText);
  const missing = [...plan.missingInformation];
  const guarded: ExtractedPlan = { ...plan, missingInformation: missing };

  if (guarded.siteName && !/(?:\bsite\b|\bproject\b|\blocation\b|موقع|مشروع)/u.test(text)) {
    delete guarded.siteName; addMissing(missing, "Site name was not explicitly stated.");
  }
  if (guarded.city && !text.includes(guarded.city) && !(guarded.city === "mecca" && text.includes("مكة")) && !(guarded.city === "medina" && text.includes("المدينة"))) {
    delete guarded.city; addMissing(missing, "City was not explicitly stated.");
  }
  if (guarded.shiftDate && !hasDateEvidence(text, guarded.shiftDate)) {
    delete guarded.shiftDate; addMissing(missing, "Shift date was not explicitly stated.");
  }
  for (const field of ["shiftStart", "shiftEnd"] as const) {
    if (guarded[field] && !text.includes(guarded[field])) { delete guarded[field]; addMissing(missing, "Complete shift times were not explicitly stated."); }
  }
  if (guarded.crewSize !== undefined && !hasNumberEvidence(text, guarded.crewSize)) {
    delete guarded.crewSize; addMissing(missing, "Crew size was not explicitly stated.");
  }
  if (guarded.nonAcclimatizedWorkers !== undefined && !hasNumberEvidence(text, guarded.nonAcclimatizedWorkers)) {
    delete guarded.nonAcclimatizedWorkers; addMissing(missing, "New-worker count was not explicitly stated.");
  }

  guarded.tasks = guarded.tasks.map((task) => {
    const next = { ...task };
    if (next.durationMinutes !== undefined && !hasNumberEvidence(text, next.durationMinutes)) { delete next.durationMinutes; addMissing(missing, "One or more task durations were not explicitly stated."); }
    for (const field of ["requestedStart", "requestedEnd"] as const) if (next[field] && !text.includes(next[field])) { delete next[field]; addMissing(missing, "One or more requested task times were not explicitly stated."); }
    if (next.workload === "heavy" && !/(?:\bheavy\b|ثقيل)/u.test(text)) { delete next.workload; addMissing(missing, "One or more task workloads were not explicitly stated."); }
    if (next.workload === "light" && !/(?:\blight\b|خفيف)/u.test(text)) { delete next.workload; addMissing(missing, "One or more task workloads were not explicitly stated."); }
    const environmentEvidence = {
      direct_sun: /(?:direct[ -]sun|under (?:the )?sun|شمس مباشرة|تحت الشمس)/u,
      shaded_outdoor: /(?:shaded|in (?:the )?shade|مظلل|في الظل)/u,
      conditioned_indoor: /(?:indoor|inside|cooled area|داخل|داخلي)/u,
    } as const;
    if (next.environment && !environmentEvidence[next.environment].test(text)) { delete next.environment; addMissing(missing, "One or more task environments were not explicitly stated."); }
    if (next.splittable !== undefined && !/(?:split|splittable|divid(?:e|ed)|تقسيم|تجزئة)/u.test(text)) { delete next.splittable; addMissing(missing, "Task splitting permission was not explicitly stated."); }
    return next;
  });
  return guarded;
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
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.complete({
          model: options.model,
          system: SYSTEM_INSTRUCTION,
          user: text,
          responseFormat: { type: "json_schema", json_schema: { name: "heatshift_plan", strict: true, schema: extractedPlanJsonSchema } },
          signal: options.signal,
        });
        let decoded: unknown;
        try { decoded = JSON.parse(response.content); }
        catch { throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502); }
        const parsed = extractedPlanSchema.safeParse(decoded);
        if (!parsed.success) throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502);
        return { plan: requireEvidence(parsed.data, text), metadata: { actualModel: response.model ?? null } };
      } catch (error) {
        if (attempt === 0 && error instanceof IntegrationError && error.code === "AI_INVALID_RESPONSE") continue;
        throw error;
      }
    }
    throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502);
  } catch (error) { throw classifyProviderError(error); }
}

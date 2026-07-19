import { IntegrationError } from "../server/api-errors";
import { OpenRouterClient, type ChatCompletionsClient } from "./provider";
import { extractedPlanJsonSchema, extractedPlanSchema, type ExtractedPlan } from "./plan-extraction-schema";

const SYSTEM_INSTRUCTION = `You extract structured work-plan facts only.
- Never invent a regulation or determine whether the plan is safe.
- Never invent absent dates, times, durations, crew counts, or locations.
- Put uncertain or absent information in missingInformation.
- Put interpretation decisions in assumptions.
- Translate task names into concise Arabic.
- Return only schema-valid JSON.`;

export type { ChatCompletionsClient } from "./provider";
export interface ExtractionOptions { apiKey: string; model: string; signal?: AbortSignal; client?: ChatCompletionsClient }

function classifyProviderError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) return error;
  if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
    return new IntegrationError("AI_TIMEOUT", "Plan extraction timed out. Try again or create tasks manually.", 504);
  }
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
  if (status === 429) return new IntegrationError("AI_RATE_LIMITED", "The free AI service is busy or rate limited. Try again later or create tasks manually.", 429);
  return new IntegrationError("AI_UNAVAILABLE", "Plan extraction is temporarily unavailable. Create tasks manually or try again later.", 503);
}

export async function extractPlan(text: string, options: ExtractionOptions): Promise<ExtractedPlan> {
  const client = options.client ?? new OpenRouterClient(options.apiKey);
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
    return parsed.data;
  } catch (error) { throw classifyProviderError(error); }
}
